/* global DM, $ */
goog.provide('dm.viewer.ProjectViewer');

goog.require('goog.dom.DomHelper');
goog.require('goog.string');
goog.require('goog.events');
goog.require('goog.structs');
goog.require('goog.array');
goog.require('goog.object');

goog.require('dm.data.Literal');
goog.require('dm.data.ProjectController');

goog.require('dm.viewer.ViewerContainer');
goog.require('dm.widgets.WorkingResources');

var STATES = {
    project : 1,
    edit: 2,
    create: 3,
    imageUpload: 4
};

var PERMISSIONS = ["read", "update", "administer"];

dm.viewer.ProjectViewer = function(clientApp, opt_domHelper) {
    this.clientApp = clientApp;
    this.databroker = clientApp.databroker;
    this.projectController = this.databroker.projectController;
    this.viewerGrid = clientApp.viewerGrid;

    this.state = STATES.project;
    this.isGuest = (this.databroker.user.uri.split("/").pop() === "dm:guest");

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.workingResources = new dm.widgets.WorkingResources(
        this.databroker,
        this.domHelper
    );
    this.workingResources.render($(".sc-ProjectViewer-modal .modal-body").get(0));

    var eventHandler = function(handler) {
        return function(e) {
            e && e.preventDefault();
            handler(e);
        };
    };

    $(".project-new-text").on("click", eventHandler(this.newText.bind(this)));
    $(".project-new-image").on("click", eventHandler(this.newImage.bind(this)));
    $(".project-edit").on("click", eventHandler(this.projectEdit.bind(this)));
    $(".project-download").on("click", eventHandler(this.projectDownload.bind(this)));

    $(".sc-ProjectViewer-button .sc-ProjectViewer-titleButton").on(
        "click",
        eventHandler(this.projectView.bind(this))
    );

    $(".sc-ProjectViewer-button .dropdown-menu").on(
        "click", ".sc-ProjectViewer-projectChoice",
        eventHandler(this.projectChosen.bind(this))
    );

    $(".sc-ProjectViewer-createProjectButton a").on(
        "click",
        eventHandler(this.newProject.bind(this))
    );

    $("#public-access").on(
        "click",
        eventHandler(this.togglePublicAccess.bind(this))
    );

    $(".sc-ProjectViewer-permissions-table tbody").on(
        "change",
        "input",
        this.updatePermissions.bind(this)
    );

    $(".sc-ProjectViewer-permissions-table .add-user select").selectize({
        load: this.addUserOptions.bind(this),
        closeAfterSelect: true,
        onChange: this.userAdded.bind(this)
    });

    $(".sc-ProjectViewer-projectEdit .save").on(
        "click",
        eventHandler(this.saveEditedProject.bind(this))
    );

    $(".sc-ProjectViewer-projectEdit .cancel").on(
        "click",
        eventHandler(this.cancelEditedProject.bind(this))
    );

    $(".sc-ProjectViewer-uploadCanvas .save").on(
        "click",
        eventHandler(this.uploadCanvas.bind(this))
    );

    $(".sc-ProjectViewer-uploadCanvas .cancel").on(
        "click",
        eventHandler(this.cancelCanvasUpload.bind(this))
    );

    $(".sc-ProjectViewer-uploadCanvas #canvasFileInput").on(
        "change",
        this.updateCanvasTitle.bind(this)
    );

    $("#clean-project").on("click", eventHandler(this.cleanProject.bind(this)));
    $("#del-project").on("click", eventHandler(this.deleteProject.bind(this)));
    $("#create-proj").on("click", eventHandler(this.createProject.bind(this)));

    goog.events.listen(
        this.workingResources, 'openRequested',
        function(e) { this.openViewerForResource(e.resource); }, false, this
    );

    goog.events.listen(
        this.projectController, 'projectSelected',
        this.projectSelected, false, this
    );

    $.when($.getJSON("/store/users"), this.databroker.user.defer()).done(
        function(users, user) {
            DM.userLoggedIn(user.shift().getOneProperty("rdfs:label"));

            this.users = users.shift();
            this.projectController.autoSelectProject();
            this.updateProjects();

        }.bind(this)
    );
};

dm.viewer.ProjectViewer.prototype.updateCurrentProjectStatus = function(action, method) {
    var project = this.projectController.currentProject;
    if (project) {
        $.ajax({
            url: this.databroker.syncService.restUrl(project.uri) + 'share',
            method: method,
            complete: (function(xhr, textStatus) {
                if (textStatus !== "success") {
                    alert("Unable to " + action + ": " + xhr.responseText);
                }
                this.showModal(STATES.edit);
            }).bind(this)
        });
    }
}

dm.viewer.ProjectViewer.prototype.togglePublicAccess = function(e) {
    if ($("#public-access").is(':checked') ) {
        this.updateCurrentProjectStatus("share current project", "POST");
    } else if (confirm("Remove all public access to this project?")) {
        this.updateCurrentProjectStatus("withdraw current project", "DELETE");
    }
};

dm.viewer.ProjectViewer.prototype.cleanProject = function() {
    var project = this.projectController.currentProject;
    if (!project || $("#clean-project").hasClass("disabled") ) {
        return;
    }
    $("#clean-project").addClass("disabled");
    $.ajax({
        url: this.databroker.syncService.restUrl(project.uri) + 'cleanup',
        method: "POST",
        complete:  function(xhr, textStatus) {
            alert(xhr.responseText);
            $("#clean-project").removeClass("disabled");
        }
    });
};

dm.viewer.ProjectViewer.prototype.deleteProject = function() {
    var project = this.projectController.currentProject;
    if (!project || $("#del-project").hasClass("disabled")) {
        return;
    }
    if (!confirm("All data for this project will be deleted. Are you sure?")) {
        return;
    }

    $("#del-project").addClass("disabled");
    $.ajax({
        url: this.databroker.syncService.restUrl(project.uri),
        method: "DELETE",
        complete: function(xhr, textStatus) {
            $("#del-project").removeClass("disabled");
            if (textStatus !="success") {
                alert("Unable to delete project: "+ xhr.responseText);
            } else {
                window.location.reload();
            }
        }
    });
};

dm.viewer.ProjectViewer.prototype.createProject = function() {
    var title = $("#projectTitleInput").val();
    var description = $("#projectDescriptionInput").val();
    if (title == "") {
        alert("A title is required!");
        return;
    }

    var newProject = this.projectController.createProject();
    this.databroker.dataModel.setTitle(newProject, title);
    newProject.setProperty('dcterms:description', dm.data.Literal(description));

    this.projectController.grantPermissionsToUser(null, newProject, [
        dm.data.ProjectController.PERMISSIONS.read,
        dm.data.ProjectController.PERMISSIONS.update,
        dm.data.ProjectController.PERMISSIONS.administer
    ]);
    this.switchToProject(newProject);
    this.databroker.sync();
};


dm.viewer.ProjectViewer.prototype.updateProjects = function() {
    var project = this.projectController.currentProject;
    $(".sc-ProjectViewer-projectButtonTitle").text(
        project
            ? this.databroker.dataModel.getTitle(project) || 'Untitled project'
            : "none"
    );

    var projectUris = this.projectController.findProjects();
    if (project) {
        goog.array.remove(projectUris, project.uri);
    }

    var projectTitles = {};
    goog.structs.forEach(projectUris, function(uri) {
        projectTitles[uri] = this.databroker.dataModel.getTitle(uri)
            || 'Untitled project';
    });

    projectUris.sort(function(a, b) {
        return projectTitles[a].localeCompare(projectTitles[b]);
    });

    var projectMenu = $(".sc-ProjectViewer-button .dropdown-menu");
    var projectMenuDivider = projectMenu.find(".divider");
    var newProject = projectMenu.find(".sc-ProjectViewer-createProjectButton");

    projectMenuDivider.toggleClass("hide", this.isGuest);
    newProject.toggleClass("hide", this.isGuest);

    projectMenu.find(".sc-ProjectViewer-projectChoice").remove();

    goog.structs.forEach(projectUris, function(uri) {
        var title = projectTitles[uri];

        var li = $("<li class='sc-ProjectViewer-projectChoice'></li>")
            .attr({
                'about': uri,
                'rel': this.databroker.namespaces.expand('dc', 'title'),
                'title': 'Switch projects to "' + title + '"'
            })
            .insertBefore(projectMenuDivider);

        $("<a href='#'><span class='icon-book'></span></a>")
            .append(document.createTextNode(title))
            .appendTo(li);
    }, this);

    if (this.isGuest && projectUris.length === 1) {
        this.switchToProject(projectUris[0]);
    }
};

dm.viewer.ProjectViewer.prototype.showModal = function(state) {
    this.state = state || this.state;

    var project = this.projectController.currentProject;
    var projectTitle = project
            ? (this.databroker.dataModel.getTitle(project) || 'Untitled project')
            : "No project selected";

    this.readPermissions();
    // FIXME does not work with no project chosen!!!
    var permissions = this.permissions.length == 0
            ? {} : this.permissions[0].permissions;

    var title = $(".modal-header h3")
            .text('\u201c' + (projectTitle) + '\u201d');

    var workingResources = $(".atb-WorkingResources")
            .toggleClass("hidden", this.state != STATES.project);

    $(".nav.nav-pills").toggle(
        permissions.update && this.state != STATES.create
    );

    $("#main-footer").toggle(
        this.state == STATES.project
    );
    $("#create-footer").toggle(
        this.state == STATES.create
    );

    $("#del-project").toggleClass(
        "hidden disabled",
        !permissions.administer
    );
    $("#clean-project").toggleClass(
        "hidden disabled",
        !permissions.administer
    );

    var edit = $(".sc-ProjectViewer-projectEdit").toggleClass(
        "hidden",
        [STATES.edit, STATES.create].indexOf(this.state) < 0
    );

    edit.find(".sc-ProjectViewer-permissions-table").toggle(
        permissions.administer && this.state == STATES.edit
    );
    edit.find(".pub-access").toggle(
        this.state == STATES.edit
    );
    edit.find(".form-actions").toggle(
        this.state == STATES.edit
    );

    var canvas = $(".sc-ProjectViewer-uploadCanvas").toggleClass(
        "hidden",
        this.state != STATES.imageUpload
    );
    canvas.find(".form-actions").toggle(
        this.state == STATES.imageUpload
    );

    switch (this.state) {
    case STATES.project:
        if (project) {
            this.workingResources.loadManifest(project.uri);
        }
        break;
    case STATES.edit:
        $("#projectTitleInput")
            .val(this.databroker.dataModel.getTitle(project))
            .toggleClass("disabled", !permissions.administer);

        $("#projectDescriptionInput")
            .val(project.getOneProperty('dcterms:description') || "")
            .toggleClass("disabled", !permissions.administer);

        $("#public-access").prop("checked", false);

        $(".pub-url-group").toggleClass("hidden", true);
        $("#public-url").text("");

        edit.children().addClass("disabled");
        $.getJSON(
            this.databroker.syncService.restUrl(project.uri) + 'share',
            (function(data, status) {
                edit.children().removeClass("disabled");
                $("#public-access").toggleClass(
                    "disabled",
                    !permissions.administer
                );
                if  (status == "success" && data.public) {
                    $("#public-url").text([
                        this.databroker.baseUri,
                        "workspace",
                        "#" + (this.projectController.currentProjectShortcut() || "")
                    ].join("/"));
                    $("#public-access").prop("checked", true);
                    $(".pub-url-group").toggleClass("hidden", false);
                }
            }).bind(this)
        );

        this.renderPermissions(true);

        break;
    case STATES.create:
        title.text("Create New Project");
        $("#projectTitleInput").val("");
        $("#projectDescriptionInput").val("");
        break;
    case STATES.imageUpload:
        canvas.find(".progress").hide();
        progress.find(".bar").css("width", "0%");

        canvas.find("#canvasTitleInput").val("");
        canvas.find("#canvasFileInput").val("");
        break;
    }

    $(".sc-ProjectViewer-modal").modal('show');
};

dm.viewer.ProjectViewer.prototype.newProject = function(e) {
    $(".sc-ProjectViewer-button .dropdown-toggle").dropdown("toggle");
    this.isGuest || this.showModal(STATES.create);
};

dm.viewer.ProjectViewer.prototype.projectView = function(e) {
    this.showModal(STATES.project);
};

dm.viewer.ProjectViewer.prototype.projectChosen = function(e) {
    $(".sc-ProjectViewer-button .dropdown-toggle").dropdown("toggle");
    this.switchToProject($(e.target).closest("li").attr("about"));
};

dm.viewer.ProjectViewer.prototype.switchToProject = function(project, force) {
    project = this.databroker.getResource(project);
    if (!force && project.equals(this.projectController.currentProject)) {
        return false;
    }

    if (!this.viewerGrid.isEmpty()) {
        if (!confirm('Are you sure you want to switch projects? ' +
                     'All your current open resources will be closed.')) {
            return false;
        }
        this.viewerGrid.closeAllContainers();
    }

    project.defer().done(function() {
        this.projectController.selectProject(project);
        this.updateProjects();
        this.projectView();
    }.bind(this));

    return true;
};

dm.viewer.ProjectViewer.prototype.addUserOptions = function(query, results) {
    var usersWithPermission = {};
    goog.structs.forEach(this.permissions, function(record) {
        usersWithPermission[record.uri] = true;
    });

    var filter = query.toLowerCase();
    var users = goog.structs.filter(this.users, function(user) {
        if (usersWithPermission[user.uri]) {
            return false;
        }
        return (user.name.toLowerCase().indexOf(filter) >= 0) ||
            (user.email.toLowerCase().indexOf(filter) >= 0);
    });
    results(goog.structs.map(users, function(user) {
        return {
            value: user.uri,
            text: [user.name, user.email].join(" - ")
        };
    }));
};

dm.viewer.ProjectViewer.prototype.readPermissions = function() {
    this.permissions = [];

    var user = this.databroker.user;
    var project = this.projectController.currentProject;
    if (!user || !project) {
        return;
    }

    var users = goog.structs.map(
        this.projectController.findUsersInProject(),
        function(uri) { return this.databroker.getResource(uri); },
        this
    );

    goog.structs.forEach(users, function(user) {
        var userPermissions = {};
        goog.structs.forEach(PERMISSIONS, function(perm) {
            userPermissions[perm] = this.projectController
                .userHasPermissionOverProject(
                    user,
                    project,
                    dm.data.ProjectController.PERMISSIONS[perm]
                );
        }, this);
        var hasPermissions = goog.array.some(PERMISSIONS, function(perm) {
            return userPermissions[perm];
        });
        if (hasPermissions) {
            this.addPermissions(user, userPermissions);
        }
    }, this);

    this.sortPermissions();
};

dm.viewer.ProjectViewer.prototype.addPermissions = function(user, permissions) {
    var label = user.getOneProperty("rdfs:label") || user.uri;
    this.permissions.push({
        uri: user.uri,
        label: label,
        name: user.getOneProperty("foaf:name") || label,
        user: user,
        permissions: permissions || {}
    });
};

dm.viewer.ProjectViewer.prototype.sortPermissions = function() {
    var user = this.databroker.user;

    this.permissions.sort(function(a, b) {
        if (a.uri == user.uri) {
            return -1;
        }
        if (b.uri == user.uri) {
            return 1;
        }

        return a.name.localeCompare(b.name);
    });

};

dm.viewer.ProjectViewer.prototype.userAdded = function(uri) {
    var selectize = $(".sc-ProjectViewer-permissions-table .add-user select")
            .get(0).selectize;
    selectize.clear(true);
    selectize.clearOptions();

    var selected = goog.array.find(this.users, function(user) {
        return user.uri == uri;
    });
    if (selected) {
        this.databroker.getResource(selected.uri).defer().done(function(user) {
            this.addPermissions(user, { "read": true });
            this.sortPermissions();
            this.renderPermissions();
        }.bind(this));
    }
};

dm.viewer.ProjectViewer.prototype.updatePermissions = function(e) {
    var target = $(e.target);
    var tr = target.closest("tr");
    var uri = tr.attr("about");
    if (!uri) {
        return;
    }
    goog.array.forEach(this.permissions, function(record) {
        if (record.uri != uri) {
            return;
        }
        goog.array.forEach(PERMISSIONS, function(perm, i) {
            if (target.hasClass(perm)) {
                if (target.prop("checked")) {
                    for (var pc = 0; pc <= PERMISSIONS.indexOf(perm); pc++) {
                        var p = PERMISSIONS[pc];
                        tr.find("." + p).prop(
                            "checked",
                            record.permissions[p] = true
                        );
                    }
                } else {
                    for (
                        var pc = PERMISSIONS.indexOf(perm);
                        pc < PERMISSIONS.length;
                        pc++
                    ) {
                        var p = PERMISSIONS[pc];
                        tr.find("." + p).prop(
                            "checked",
                            record.permissions[p] = false
                        );
                    }
                }
            }
        });
    });

    this.renderPermissions();
};

dm.viewer.ProjectViewer.prototype.renderPermissions = function(reset) {
    var permissionsTable = $(".sc-ProjectViewer-permissions-table tbody");

    if (reset) {
        permissionsTable.find("tr[about]").remove();
    }
    goog.array.forEach(this.permissions, function(record, i) {
        if (record.label == "dm:guest") {
            return;
        }

        var tr = permissionsTable.find("tr[about='" + record.uri + "']");
        if (tr.length == 0) {
            tr = $("<tr></tr>").appendTo(permissionsTable)
                .attr("about", record.uri)
                .toggleClass("info", i == 0);

            $("<td></td>").appendTo(tr)
                .append(document.createTextNode(record.name))
                .append("<br>")
                .append($("<small></small>").text(record.label));

            goog.array.forEach(PERMISSIONS, function(perm) {
                $("<input type='checkbox'>")
                    .addClass(perm)
                    .prop("disabled", i == 0)
                    .appendTo($("<td></td>").appendTo(tr));
            });
        }

        goog.array.forEach(PERMISSIONS, function(perm) {
            tr.find("." + perm).prop("checked", record.permissions[perm]);
        });
    }, this);
};

dm.viewer.ProjectViewer.prototype.projectSelected = function(e) {
    this.readPermissions();
    this.switchToProject(e.project.uri, true);
};

dm.viewer.ProjectViewer.prototype.openViewerForResource = function(resource) {
    var resource = this.databroker.getResource(resource);

    var clone = this.viewerGrid.isOpen(resource.uri);

    var container = new dm.viewer.ViewerContainer(this.domHelper);
    this.viewerGrid.addViewerContainer(resource.uri, container);

    this.clientApp.scrollIntoView(container.getElement());

    var viewer = this.clientApp.createViewerForUri(resource.uri);
    viewer.readOnlyClone = clone;
    container.setViewer(viewer);

    if ( clone || !this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.update)) {
        viewer.makeUneditable();
        viewer.loadResourceByUri(resource.uri);
        container.autoResize();
    } else {
       // resources are ALWAYS locked when first opened
       viewer.makeUneditable();
       viewer.lockStatus(resource.uri,false,false,"","");
       viewer.loadResourceByUri(resource.uri);
       container.autoResize();
    }
};


dm.viewer.ProjectViewer.prototype.cancelEditedProject = function(e) {
    this.showModal(STATES.project);
};

dm.viewer.ProjectViewer.prototype.saveEditedProject = function(event) {
    var project = this.projectController.currentProject;
    var permissions = this.permissions[0].permissions;
    if (!project || !permissions.administer) {
        return;
    }

    var title = $("#projectTitleInput").val();
    var description = $("#projectDescriptionInput").val();

    if (this.databroker.dataModel.getTitle(project) != title) {
        this.databroker.dataModel.setTitle(project, title);
    }
    if ((project.getOneProperty('dcterms:description') || "") != description) {
        project.setProperty("dcterms:description", dm.data.Literal(description));
    }

    goog.array.forEach(this.permissions, function(record, i) {
        if (i == 0) {
            return; // we do not administer our own rights
        }

        var user = record.uri;
        goog.array.forEach(PERMISSIONS, function(perm) {
            var p = dm.data.ProjectController.PERMISSIONS[perm];
            if (record.permissions[perm]) {
                this.projectController.userHasPermissionOverProject(
                    user, project, p
                ) || this.projectController.grantPermissionsToUser(
                    user, project, [ p ]
                );
            } else {
                this.projectController.userHasPermissionOverProject(
                    user, project, p
                ) && this.projectController.revokePermissionsFromUser(
                    user, project, [ p ]
                );
            }
        }, this);
    }, this);


    this.databroker.sync();

    this.updateProjects();
    this.showModal(STATES.project);
};

dm.viewer.ProjectViewer.prototype.newText = function(e) {
    if (this.isGuest) {
        return;
    }

    var textResource = this.databroker.dataModel.createText(
        'Untitled text document', ''
    );

    this.projectController.addResourceToProject(textResource);
    this.openViewerForResource(textResource);

    $(".sc-ProjectViewer-modal").modal('hide');
};

dm.viewer.ProjectViewer.prototype.newImage = function(e) {
    this.isGuest || this.showModal(STATES.imageUpload);
};

dm.viewer.ProjectViewer.prototype.projectEdit = function(event) {
    this.isGuest || this.showModal(STATES.edit);
};

dm.viewer.ProjectViewer.prototype.projectDownload = function(e) {
    var project = this.projectController.currentProject;
    var url = this.databroker.syncService.getProjectDownloadUrl(project.uri);
    window.open(url);
};

dm.viewer.ProjectViewer.prototype.cancelCanvasUpload = function(event) {
    this.showModal(STATES.project);
};

dm.viewer.ProjectViewer.prototype.updateCanvasTitle = function(event) {
    var form = $(".sc-ProjectViewer-uploadCanvas");
    var titleInput = form.find("#canvasTitleInput");
    var fileInput = form.find("#canvasFileInput");
    var file = fileInput.prop("files")[0];

    if (!goog.string.startsWith(file.type, 'image/')) {
        alert('"' + file.name + '" is not an image file.');
        fileInput.val("");
        return;
    }

    if (!(goog.string.endsWith(file.type, '/jpeg') ||
          goog.string.endsWith(file.type, '/png'))) {
        alert('"' + file.name + '" is not a jpeg or png formatted image file.');
        fileInput.val("");
        return;
    }

    if ((titleInput.val() || "") == "") {
        var filename = file.name;
        var ext = filename.lastIndexOf('.');
        if (ext > 0) {
            filename = filename.substring(0, ext);
        }
        filename = filename.replace(/_/g, ' ');
        titleInput.val(goog.string.toTitleCase(filename));
    }
};


dm.viewer.ProjectViewer.prototype.uploadCanvas = function(event) {
    var form = $(".sc-ProjectViewer-uploadCanvas");

    var progress = form.find(".progress");
    var progressBar = progress.find(".bar");

    var title = form.find("#canvasTitleInput").val();
    var file = form.find("#canvasFileInput").prop("files")[0];

    progress.slideDown(200).addClass('active');
    progressBar.css('width', '5%');

    this.projectController.uploadCanvas(title, file,

        (function() {
            // Success
            progress.removeClass("active");
            progressBar.css('width', '100%');
            this.showModal(STATES.project);
        }).bind(this),

        function(event) {
            // Failure
            alert('Image upload failed. The server returned a status code of ' +
                  event.target.status + '.');
        },

        function(event) {
            // Progress
            if (event.lengthComputable) {
                progressBar.css(
                    'width',
                    Math.max(5, event.loaded / event.total * 100) + '%'
                );
            }
        }
    );
};
