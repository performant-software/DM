/* global $ */
goog.provide('dm.ProjectViewer');

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

dm.ProjectViewer = function(clientApp, opt_domHelper) {
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
        function(users) {
            this.users = users.shift();
            this.projectController.autoSelectProject();
        }.bind(this)
    );
};

dm.ProjectViewer.prototype.updateCurrentProjectStatus = function(action, method) {
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

dm.ProjectViewer.prototype.togglePublicAccess = function(e) {
    if ($("#public-access").is(':checked') ) {
        this.updateCurrentProjectStatus("share current project", "POST");
    } else if (confirm("Remove all public access to this project?")) {
        this.updateCurrentProjectStatus("withdraw current project", "DELETE");
    }
};

dm.ProjectViewer.prototype.cleanProject = function() {
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

dm.ProjectViewer.prototype.deleteProject = function() {
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

dm.ProjectViewer.prototype.createProject = function() {
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
    this.databroker.sync();
    this.switchToProject(newProject);
};


dm.ProjectViewer.prototype.updateProjects = function() {
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

dm.ProjectViewer.prototype._sanityCheckPermissionsUI = function(readCheck, modifyCheck, adminCheck) {
    // Ensure the permission levels are sane (e.g., no modify permissions without read permissions)
    goog.events.listen(readCheck, 'click', function(event) {
        modifyCheck.checked = false;
        adminCheck.checked = false;
    }, false, this);
    goog.events.listen(modifyCheck, 'click', function(event) {
        adminCheck.checked = false;
    }, false, this);

    var changeHandler = function(event) {
        if (modifyCheck.checked) {
            readCheck.checked = true;
        }
        if (adminCheck.checked) {
            readCheck.checked = true;
            modifyCheck.checked = true;
        }
    };
    goog.events.listen(readCheck, 'change', changeHandler, false, this);
    goog.events.listen(modifyCheck, 'change', changeHandler, false, this);
    goog.events.listen(adminCheck, 'change', changeHandler, false, this);
};

dm.ProjectViewer.prototype._buildAddUser = function(fragment) {
    var checked = function() {
        var check = this.domHelper.createDom('input', {'type': 'checkbox'});
        check.checked = true;
        return check;
    }.bind(this);
    var unchecked = function() {
        var check = this.domHelper.createDom('input', {'type': 'checkbox'});
        check.checked = false;
        return check;
    }.bind(this);

    var editTr = this.domHelper.createDom('tr', {'class': 'sc-ProjectViewer-sharingEditRow'});
    var usernameInput = this.domHelper.createDom('input', {'type': 'text', 'placeholder': 'Add a user', 'class': 'sc-ProjectViewer-usernameInput'});
    var addButton = this.domHelper.createDom('button', {'class': 'btn'}, '+');
    var usernameTd = this.domHelper.createDom('td', {'class': 'input-append'}, usernameInput, addButton);
    editTr.appendChild(usernameTd);
    var readCheck = checked();
    var readTd = this.domHelper.createDom('td', {}, readCheck);
    editTr.appendChild(readTd);
    var modifyCheck = unchecked();
    var modifyTd = this.domHelper.createDom('td', {}, modifyCheck);
    editTr.appendChild(modifyTd);
    var adminCheck = unchecked();
    var adminTd = this.domHelper.createDom('td', {}, adminCheck);

    // Ensure the permission levels are sane (e.g., no modify permissions without read permissions)
    this._sanityCheckPermissionsUI(readCheck, modifyCheck, adminCheck);

    goog.events.listen(addButton, 'click', function(event) {
        event.stopPropagation();

        var username = goog.string.trim($(usernameInput).val() || "");
        if (username.length == 0) return;

        var userUri = this.databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, username, null);
        var user = this.databroker.getResource(userUri);

        var permissionsToGrant = [];
        if (readCheck.checked)
            permissionsToGrant.push(dm.data.ProjectController.PERMISSIONS.read);
        if (modifyCheck.checked)
            permissionsToGrant.push(dm.data.ProjectController.PERMISSIONS.update);
        if (adminCheck.checked)
            permissionsToGrant.push(dm.data.ProjectController.PERMISSIONS.administer);

        if (permissionsToGrant.length > 0) {
            if (!user.hasType('foaf:Agent')) {
                this.databroker.quadStore.addQuad(
                    new dm.data.Quad(user.bracketedUri, this.databroker.namespaces.expand('rdf', 'type'), this.databroker.namespaces.expand('foaf', 'Agent'), null)
                );
            }

            this.projectController.grantPermissionsToUser(user, null, permissionsToGrant);

            this.updatePermissionsUI();
        }
        else {
            alert('You need to specify permissions for  \u201c' + username + '\u201d to have over this project');
        }
    }, false, this);

    editTr.appendChild(adminTd);
    fragment.appendChild(editTr);
};

dm.ProjectViewer.prototype.updatePermissionsUI = function() {
    var checked = function() {
        var check = this.domHelper.createDom('input', {'type': 'checkbox'});
        check.checked = true;
        return check;
    }.bind(this);
    var unchecked = function() {
        var check = this.domHelper.createDom('input', {'type': 'checkbox'});
        check.checked = false;
        return check;
    }.bind(this);

    var fragment = this.domHelper.getDocument().createDocumentFragment();

    var userUris = this.projectController.findUsersInProject();
    var indexOfThisUser = userUris.indexOf(this.databroker.user.uri);
    if (indexOfThisUser != -1) {
        goog.array.removeAt(userUris, indexOfThisUser);
        goog.array.insertAt(userUris, this.databroker.user.uri, 0);
    }

    goog.structs.forEach(userUris, function(user) {
        var userResource = this.databroker.getResource(user);
        var unwrappedUserUri = dm.data.Term.unwrapUri(user);
        var username = userResource.getOneProperty('rdfs:label') || unwrappedUserUri.substring(unwrappedUserUri.lastIndexOf('/') + 1, unwrappedUserUri.length);
        if ( username.indexOf("guest_") != 0 ) {
	        var canRead = this.projectController.userHasPermissionOverProject(user, null, dm.data.ProjectController.PERMISSIONS.read);
	        var canModify = this.projectController.userHasPermissionOverProject(user, null, dm.data.ProjectController.PERMISSIONS.update);
	        var isAdmin = this.projectController.userHasPermissionOverProject(user, null, dm.data.ProjectController.PERMISSIONS.administer);

	        var readCheck = (canRead ? checked() : unchecked());
	        var modifyCheck = (canModify ? checked() : unchecked());
	        var adminCheck = (isAdmin ? checked() : unchecked());

	        this._sanityCheckPermissionsUI(readCheck, modifyCheck, adminCheck);

	        var tr = this.domHelper.createDom('tr', {},
	            this.domHelper.createDom('td', {'about': user}, username),
	            this.domHelper.createDom('td', {}, readCheck),
	            this.domHelper.createDom('td', {}, modifyCheck),
	            this.domHelper.createDom('td', {}, adminCheck)
	        );
	        $(tr).attr('about', user);

	        if (this.databroker.user.equals(user)) {
	            $(tr).addClass('info');
	        }

	        fragment.appendChild(tr);
	        this.permissionsRows.push(tr);
        }
    }, this);

    this._buildAddUser(fragment);

    // Ensure the user can only grant permissions allowed by their current permission level
    if (!this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.administer)) {
        var rows = $(fragment).children();
        goog.structs.forEach(rows, function(row) {
            var userUri = $(row).attr('about');

            var cells = $(row).children();

            var readCheck = $(cells[1]).children().get(0);
            var modifyCheck = $(cells[2]).children().get(0);
            var adminCheck = $(cells[3]).children().get(0);

            adminCheck.disabled = true;

            if (!this.databroker.user.equals(userUri)) {
                readCheck.disabled = true;
                modifyCheck.disabled = true;
            }
            else if (!this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.update)) {
                modifyCheck.disabled = true;
            }
        }, this);
    }

    var tbody = $(this.permissionsTable).find('tbody');
    tbody.empty();
    tbody.append(fragment);
};

dm.ProjectViewer.prototype.updateModalUI = function() {
   $("#del-project").hide();
   $("#clean-project").hide();
   $("#create-footer").hide();
   $("#main-footer").show();
   $(".sc-ProjectViewer-modal .nav-pills").hide();

   $(".sc-ProjectViewer-permissions-table").show();
   $(".pub-access").show();
   $(".form-actions").show();

   if (this.projectController.currentProject) {
      var uri = this.projectController.currentProject.uri;
      this.workingResources.loadManifest(uri);

      var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
      $(this.modalTitle).text('\u201c' + (projectTitle || 'Untitled project') + '\u201d');

      if (this.databroker.projectController.userHasPermissionOverProject(this.databroker.user, uri,
          dm.data.ProjectController.PERMISSIONS.administer)) {
         $("#del-project").show();
         $("#clean-project").show();
         $(".sc-ProjectViewer-modal .nav-pills").show();
      }

      if (this.databroker.projectController.userHasPermissionOverProject(this.databroker.user,
          uri, dm.data.ProjectController.PERMISSIONS.update)) {
         $(".sc-ProjectViewer-modal .nav-pills").show();
      }
   } else {
      $(this.modalTitle).text('No project selected');
      $("#public-url").text("");
   }

    if (this.projectController.currentProject) {
        var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
        $(this.titleInput).val(projectTitle);
        $(this.descriptionInput).val(this.projectController.currentProject.getOneProperty('dcterms:description') || '');

        if (!this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.administer)) {
            this.titleInput.disabled = true;
            this.titleInput.title = "You need admin permissions to change the project's title";
        }
        else {
            this.titleInput.disabled = false;
            this.titleInput.title = "";
        }

        if (!this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.update)) {
            this.descriptionInput.disabled = true;
            this.descriptionInput.title = "You need modify permissions to change the project's description";
        }
        else {
            this.descriptionInput.disabled = false;
            this.descriptionInput.title = "";
        }

        this.updatePermissionsUI();
    }
};


dm.ProjectViewer.prototype.showModal = function(state) {
    this.state = state || this.state;

    var project = this.projectController.currentProject;
    var projectTitle = project
            ? (this.databroker.dataModel.getTitle(project) || 'Untitled project')
            : "No project selected";

    this.readPermissions();
    var permissions = this.permissions[0].permissions;

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
        this.state == STATES.edit
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

dm.ProjectViewer.prototype.newProject = function(e) {
    $(".sc-ProjectViewer-button .dropdown-toggle").dropdown("toggle");
    this.isGuest || this.showModal(STATES.create);
};

dm.ProjectViewer.prototype.projectView = function(e) {
    this.showModal(STATES.project);
};

dm.ProjectViewer.prototype.projectChosen = function(e) {
    $(".sc-ProjectViewer-button .dropdown-toggle").dropdown("toggle");
    this.switchToProject($(e.target).closest("li").attr("about"));
};

dm.ProjectViewer.prototype.switchToProject = function(project, force) {
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

dm.ProjectViewer.prototype.addUserOptions = function(query, results) {
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

dm.ProjectViewer.prototype.readPermissions = function() {
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
        goog.structs.forEach(
            goog.object.getKeys(dm.data.ProjectController.PERMISSIONS),
            function(perm) {
                userPermissions[perm] = this.projectController
                    .userHasPermissionOverProject(
                        user,
                        project,
                        dm.data.ProjectController.PERMISSIONS[perm]
                    );
            },
            this
        );
        this.addPermissions(user, userPermissions);
    }, this);

    this.sortPermissions();
};

dm.ProjectViewer.prototype.addPermissions = function(user, permissions) {
    var label = user.getOneProperty("rdfs:label") || user.uri;
    this.permissions.push({
        uri: user.uri,
        label: label,
        name: user.getOneProperty("foaf:name") || label,
        user: user,
        permissions: permissions || {}
    });
};

dm.ProjectViewer.prototype.sortPermissions = function() {
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

dm.ProjectViewer.prototype.userAdded = function(uri) {
    var selectize = $(".sc-ProjectViewer-permissions-table .add-user select")
            .get(0).selectize;
    selectize.clear(true);
    selectize.clearOptions();

    var selected = goog.array.find(this.users, function(user) {
        return user.uri == uri;
    });
    if (selected) {
        this.databroker.getResource(selected.uri).defer().done(function(user) {
            this.addPermissions(user);
            this.sortPermissions();
            this.renderPermissions();
        }.bind(this));
    }
};

dm.ProjectViewer.prototype.updatePermissions = function(e) {
    var target = $(e.target);
    var uri = target.closest("tr").attr("about");
    if (!uri) {
        return;
    }
    goog.array.forEach(this.permissions, function(record) {
        if (record.uri != uri) {
            return;
        }
        goog.array.forEach(["read", "update", "administer"], function(perm) {
            if (target.hasClass(perm)) {
                record.permissions[perm] = target.prop("checked");
            }
        });
    });

    this.renderPermissions();
};

dm.ProjectViewer.prototype.renderPermissions = function(reset) {
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

            goog.array.forEach(["read", "update", "administer"], function(perm) {
                $("<input type='checkbox'>")
                    .addClass(perm)
                    .prop("disabled", i == 0)
                    .appendTo($("<td></td>").appendTo(tr));
            });
        }

        goog.array.forEach(["read", "update", "administer"], function(perm) {
            tr.find("." + perm).prop("checked", record.permissions[perm]);
        });
    }, this);
};

dm.ProjectViewer.prototype.projectSelected = function(e) {
    this.readPermissions();
    this.switchToProject(e.project.uri, true);
};

dm.ProjectViewer.prototype.openViewerForResource = function(resource) {
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


dm.ProjectViewer.prototype.cancelEditedProject = function(e) {
    this.showModal(STATES.project);
};

dm.ProjectViewer.prototype.saveEditedProject = function(event) {
    var title = $(this.titleInput).val();
    var description = $(this.descriptionInput).val();

    if (this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.administer)) {
        this.databroker.dataModel.setTitle(this.projectController.currentProject, title);
    }
    if (this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.update)) {
        this.projectController.currentProject.setProperty('dcterms:description', dm.data.Literal(description));
    }

    goog.structs.forEach(this.permissionsRows, function(row) {
        var cells = $(row).children();

        var userCell = cells[0];
        var readCheck = $(cells[1]).children().get(0);
        var modifyCheck = $(cells[2]).children().get(0);
        var adminCheck = $(cells[3]).children().get(0);

        var userUri = $(row).attr('about');

        if (this.databroker.user.equals(userUri) || this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.administer)) {
            if (readCheck.checked) {
                if (!this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.read)) {
                    this.projectController.grantPermissionsToUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.read]);
                }
            }
            else {
                if (this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.read)) {
                    this.projectController.revokePermissionsFromUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.read]);
                }
            }
            if (modifyCheck.checked) {
                if (!this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.update)) {
                    this.projectController.grantPermissionsToUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.update]);
                }
            }
            else {
                if (this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.update)) {
                    this.projectController.revokePermissionsFromUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.update]);
                }
            }
            if (adminCheck.checked) {
                if (!this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.administer)) {
                    this.projectController.grantPermissionsToUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.administer]);
                }
            }
            else {
                if (this.projectController.userHasPermissionOverProject(userUri, null, dm.data.ProjectController.PERMISSIONS.administer)) {
                    this.projectController.revokePermissionsFromUser(userUri, null, [dm.data.ProjectController.PERMISSIONS.administer]);
                }
            }
        }
    }, this);

    this.databroker.sync();

    this.updateProjects();
    this.showModal(STATES.project);
};

dm.ProjectViewer.prototype.newText = function(e) {
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

dm.ProjectViewer.prototype.newImage = function(e) {
    this.isGuest || this.showModal(STATES.imageUpload);
};

dm.ProjectViewer.prototype.projectEdit = function(event) {
    this.isGuest || this.showModal(STATES.edit);
};

dm.ProjectViewer.prototype.projectDownload = function(e) {
    var project = this.projectController.currentProject;
    var url = this.databroker.syncService.getProjectDownloadUrl(project.uri);
    window.open(url);
};

dm.ProjectViewer.prototype.cancelCanvasUpload = function(event) {
    this.showModal(STATES.project);
};

dm.ProjectViewer.prototype.updateCanvasTitle = function(event) {
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


dm.ProjectViewer.prototype.uploadCanvas = function(event) {
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
