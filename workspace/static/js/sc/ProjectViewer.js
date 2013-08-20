goog.provide('sc.ProjectViewer');

goog.require('goog.dom.DomHelper');
goog.require('goog.string');
goog.require('goog.events');
goog.require('goog.structs');
goog.require('goog.array');
goog.require('goog.ui.AnimatedZippy');

sc.ProjectViewer = function(clientApp, opt_domHelper) {
    this.clientApp = clientApp;
    this.databroker = clientApp.databroker;
    this.projectController = this.databroker.projectController;
    this.viewerGrid = clientApp.viewerGrid;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.workingResources = new atb.widgets.WorkingResources(this.databroker, this.domHelper);
    goog.events.listen(this.workingResources, 'openRequested', this._handleWorkingResourcesOpenRequest, false, this);

    this.buttonGroupElement = this.domHelper.createDom('div', {'class': 'btn-group sc-ProjectViewer-button'});
    this._buildButtonGroup();

    this.modalElement = this.domHelper.createDom('div', {'class': 'modal hide fade sc-ProjectViewer-modal'});
    this._buildModalElement();

    goog.events.listen(this.projectController, 'projectSelected', this._onProjectSelected, false, this);
};

sc.ProjectViewer.prototype._buildButtonGroup = function() {
    this.projectTitleButton = this.domHelper.createDom('div', {'class': 'btn btn-inverse sc-ProjectViewer-titleButton'});
    $(this.projectTitleButton).attr({
        'title': 'View and edit this project'
    });
    goog.events.listen(this.projectTitleButton, 'click', this._handleProjectButtonClick, false, this);
    var projectLabel = this.domHelper.createDom('div', {'class': 'sc-ProjectViewer-projectLabel'},
        this.domHelper.createDom('span', {'class': 'icon-book'}), 'Project:');
    this.projectButtonTitleElement = this.domHelper.createDom('div', {'class': 'sc-ProjectViewer-projectButtonTitle'});
    this.projectTitleButton.appendChild(projectLabel);
    this.projectTitleButton.appendChild(this.projectButtonTitleElement);

    this.buttonGroupElement.appendChild(this.projectTitleButton);

    this.dropdownButton = this.domHelper.createDom('button', {'class': 'btn dropdown-toggle btn-inverse'}, 
        this.domHelper.createDom('span', {'class': 'caret'}));
    $(this.dropdownButton).attr({
        'data-toggle': 'dropdown',
        'title': 'Switch projects or create a new one'
    });
    this.buttonDropdownList = this.domHelper.createDom('ul', {'class': 'dropdown-menu'});

    var createNewProjectButton = this.domHelper.createDom('li', {'class': 'sc-ProjectViewer-createProjectButton'},
        this.domHelper.createDom('a', {'href': 'javascript:void(0)', 'title': 'Start a new project'}, 'New project'));
    goog.events.listen(createNewProjectButton, 'click', this._handleNewProjectButtonClick, false, this);
    this.buttonDropdownList.appendChild(createNewProjectButton);
    this.buttonDropdownList.appendChild(this.domHelper.createDom('li', {'class': 'divider'}));

    this.projectChoiceElements = [];

    this.buttonGroupElement.appendChild(this.dropdownButton);
    this.buttonGroupElement.appendChild(this.buttonDropdownList);

    this.updateButtonUI();
};

sc.ProjectViewer.prototype._buildEditSection = function() {
    // Title
    var titleGroup = this.domHelper.createDom('div', {'class': 'control-group'});
    var titleLabel = this.domHelper.createDom('label', {'class': 'control-label', 'for': 'projectTitleInput'}, 'Title');
    var titleControls = this.domHelper.createDom('div', {'class': 'controls'});
    this.titleInput = this.domHelper.createDom('input', {'type': 'text', 'id': 'projectTitleInput'});
    titleGroup.appendChild(titleLabel);
    titleControls.appendChild(this.titleInput);
    titleGroup.appendChild(titleControls);
    this.editElement.appendChild(titleGroup);

    // Description
    var descriptionGroup = this.domHelper.createDom('div', {'class': 'control-group'});
    var descriptionLabel = this.domHelper.createDom('label', {'class': 'control-label', 'for': 'projectDescriptionInput'}, 'Description');
    var descriptionControls = this.domHelper.createDom('div', {'class': 'controls'});
    this.descriptionInput = this.domHelper.createDom('textarea', {'id': 'projectDescriptionInput', 'rows': 2});
    descriptionGroup.appendChild(descriptionLabel);
    descriptionControls.appendChild(this.descriptionInput);
    descriptionGroup.appendChild(descriptionControls);
    this.editElement.appendChild(descriptionGroup);

    this.permissionsTable = this.domHelper.createDom('table', {'class': 'table table-striped table-bordered'},
        this.domHelper.createDom('thead', {},
            this.domHelper.createDom('tr', {},
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-user'}), ' User'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-eye-open'}), ' Can Read'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-pencil'}), ' Can Modify'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-lock'}), ' Admin'))),
        this.domHelper.createDom('tbody'));
    this.editElement.appendChild(this.permissionsTable);

    this.permissionsRows = [];

    // Save and cancel buttons
    var saveControls = this.domHelper.createDom('div', {'class': 'form-actions'});
    var cancelButton = this.domHelper.createDom('button', {'class': 'btn'}, 'Cancel');
    goog.events.listen(cancelButton, 'click', this._handleEditCancelButtonClick, false, this);
    saveControls.appendChild(cancelButton);
    saveControls.appendChild(this.domHelper.createDom('span', {}, ' '));
    var saveButton = this.domHelper.createDom('button', {'class': 'btn btn-primary'}, 'Save');
    goog.events.listen(saveButton, 'click', this._handleSaveButtonClick, false, this);
    saveControls.appendChild(saveButton);
    this.editElement.appendChild(saveControls);
};

sc.ProjectViewer.prototype._buildModalElement = function() {
    // Header
    this.modalHeader = this.domHelper.createDom('div', {'class': 'modal-header'});
    var closeButton = this.domHelper.createDom('button', {'class': 'close'}, '×');
    $(closeButton).attr({
        'data-dismiss': 'modal',
        'aria-hidden': 'true'
    });
    this.modalTitle = this.domHelper.createDom('h3');
    this.modalHeader.appendChild(closeButton);
    this.modalHeader.appendChild(this.modalTitle);
    var nav = this.domHelper.createDom('ul', {'class': 'nav nav-pills'});
    var newTextButtonLi = this.domHelper.createDom('li', {},
        this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
            this.domHelper.createDom('span', {'class': 'icon-pencil'}), ' New Text Document'));
    goog.events.listen(newTextButtonLi, 'click', this._handleNewTextButtonClick, false, this);
    nav.appendChild(newTextButtonLi);
    var editButtonLi = this.domHelper.createDom('li', {}, 
        this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
        this.domHelper.createDom('span', {'class': 'icon-cog'}), ' Edit Project Info and Sharing'));
    goog.events.listen(editButtonLi, 'click', this._handleEditButtonClick, false, this);
    nav.appendChild(editButtonLi);
    this.modalHeader.appendChild(nav);
    this.modalElement.appendChild(this.modalHeader);

    // Body
    this.modalBody = this.domHelper.createDom('div', {'class': 'modal-body'});
    this.editElement = this.domHelper.createDom('div', {'class': 'form-horizontal sc-ProjectViewer-projectEdit'});
    this._buildEditSection();
    this.modalBody.appendChild(this.editElement);
    this.editZippy = new goog.ui.AnimatedZippy(null, this.editElement, false);
    this.workingResources.render(this.modalBody);
    this.workingResourcesZippy = new goog.ui.AnimatedZippy(null, this.workingResources.getElement(), true);
    this.modalElement.appendChild(this.modalBody);

    // Footer
    this.modalFooter = this.domHelper.createDom('div', {'class': 'modal-footer'});
    var footerCloseButton = this.domHelper.createDom('button', {'class': 'btn btn-primary'}, 'Done');
    $(footerCloseButton).attr({
        'data-dismiss': 'modal',
        'aria-hidden': 'true'
    });
    this.modalFooter.appendChild(footerCloseButton);
    this.modalElement.appendChild(this.modalFooter);
};

sc.ProjectViewer.prototype.renderButtons = function(element) {
    $(element).append(this.buttonGroupElement);
};

sc.ProjectViewer.prototype.renderModals = function(element) {
    $(element).append(this.modalElement);
};

sc.ProjectViewer.prototype.setProjectButtonTitle = function(title) {
    $(this.projectButtonTitleElement).text(title);
};

sc.ProjectViewer.prototype.updateButtonUI = function() {
    if (this.projectController.currentProject) {
        var project = this.projectController.currentProject;
        this.setProjectButtonTitle(this.databroker.dataModel.getTitle(project) || 'Untitled project');
    }
    else {
        this.setProjectButtonTitle('none');
    }

    this.updateProjectChoices();
};

sc.ProjectViewer.prototype._sanityCheckPermissionsUI = function(readCheck, modifyCheck, adminCheck) {
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

sc.ProjectViewer.prototype._buildAddUser = function(fragment) {
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

        var username = $(usernameInput).val();
        var userUri = this.databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);
        var user = this.databroker.getResource(userUri);

        var permissionsToGrant = [];
        if (readCheck.checked)
            permissionsToGrant.push(sc.data.ProjectController.PERMISSIONS.read);
        if (modifyCheck.checked)
            permissionsToGrant.push(sc.data.ProjectController.PERMISSIONS.update);
        if (adminCheck.checked)
            permissionsToGrant.push(sc.data.ProjectController.PERMISSIONS.administer);

        if (permissionsToGrant.length > 0) {
            if (!user.hasType('foaf:Agent')) {
                user.addProperty('rdf:type', 'foaf:Agent');
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

sc.ProjectViewer.prototype.updatePermissionsUI = function() {
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
    goog.array.remove(userUris, this.databroker.user.uri);
    goog.array.insertAt(userUris, this.databroker.user.uri, 0);

    goog.structs.forEach(userUris, function(user) {
        var username = user.substring(user.lastIndexOf('/') + 1, user.length);

        var canRead = this.projectController.userHasPermissionOverProject(user, null, sc.data.ProjectController.PERMISSIONS.read);
        var canModify = this.projectController.userHasPermissionOverProject(user, null, sc.data.ProjectController.PERMISSIONS.update);
        var isAdmin = this.projectController.userHasPermissionOverProject(user, null, sc.data.ProjectController.PERMISSIONS.administer);

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
    }, this);

    this._buildAddUser(fragment);

    // Ensure the user can only grant permissions allowed by their current permission level
    if (!this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.administer)) {
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
            else if (!this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
                modifyCheck.disabled = true;
            }
        }, this);   
    }

    var tbody = $(this.permissionsTable).find('tbody');
    tbody.empty();
    tbody.append(fragment);
};

sc.ProjectViewer.prototype.updateEditUI = function() {
    var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
    $(this.titleInput).val(projectTitle);
    $(this.descriptionInput).val(this.projectController.currentProject.getOneProperty('dcterms:description') || '');

    this.updatePermissionsUI();
};

sc.ProjectViewer.prototype.updateModalUI = function() {
    this.workingResources.loadManifest(this.projectController.currentProject.uri);

    var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
    $(this.modalTitle).text('\u201c' + (projectTitle || 'Untitled project') + '\u201d');

    this.updateEditUI();
};

sc.ProjectViewer.prototype.showModal = function() {
    this.updateModalUI();
    this.editZippy.collapse();
    this.workingResourcesZippy.expand();
    $(this.modalElement).modal('show');
};

sc.ProjectViewer.prototype.hideModal = function() {
    $(this.modalElement).modal('hide');
};

sc.ProjectViewer.prototype._handleNewProjectButtonClick = function(event) {
    event.stopPropagation();

    $(this.dropdownButton).dropdown('toggle');

    var newProject = this.projectController.createProject();
    this.databroker.dataModel.setTitle(newProject, 'New untitled project');
    this.projectController.selectProject(newProject);

    this.updateButtonUI();
    this.updateModalUI();

    this.showModal();
    this.editZippy.expand();
    this.workingResourcesZippy.collapse();
};

sc.ProjectViewer.prototype._handleProjectButtonClick = function(event) {
    event.stopPropagation();

    this.showModal();
};

sc.ProjectViewer.prototype._handleProjectChoiceClick = function(event, projectUri) {
    event.stopPropagation();

    $(this.dropdownButton).dropdown('toggle');

    var switched = this.switchToProject(projectUri);
    if (switched) {
        this.showModal();
    }
};

sc.ProjectViewer.prototype.setProjectChoicesByUris = function(uris) {
    $(this.projectChoiceElements).detach();

    var fragment = this.domHelper.getDocument().createDocumentFragment();

    goog.structs.forEach(uris, function(uri) {
        var title = this.databroker.dataModel.getTitle(uri) || 'Untitled project';

        var li = this.domHelper.createDom('li', {'class': 'sc-ProjectViewer-projectChoice'},
            this.domHelper.createDom('a', {'href': 'javascript:void(0)'}, title));
        $(li).attr({
            'about': uri,
            'rel': this.databroker.namespaces.expand('dc', 'title'),
            'title': 'Switch to "' + title + '"'
        });

        goog.events.listen(li, 'click', function(event) {
            this._handleProjectChoiceClick(event, uri);
        }, false, this);

        fragment.appendChild(li);
        this.projectChoiceElements.push(li);
    }, this);

    this.buttonDropdownList.appendChild(fragment);
};

sc.ProjectViewer.prototype.updateProjectChoices = function() {
    var projectUris = this.projectController.findProjects();

    if (this.projectController.currentProject) {
        goog.array.remove(projectUris, this.projectController.currentProject.uri);
    }

    this.setProjectChoicesByUris(projectUris);
};

sc.ProjectViewer.prototype.switchToProject = function(project) {
    project = this.databroker.getResource(project);

    if (project.equals(this.projectController.currentProject)) {
        return false;
    }

    if (!viewerGrid.isEmpty()) {
        if (confirm('Are you sure you want to switch projects? All your open resources from the current project will be closed.')) {
            viewerGrid.closeAllContainers();
            this.projectController.selectProject(project);
            this.workingResources.loadManifest(project.uri, true);
            return true;
        }
        else {
            return false;
        }
    }
    else {
        this.projectController.selectProject(project);
        this.workingResources.loadManifest(project.uri, true);
        return true;
    }
};

sc.ProjectViewer.prototype._onProjectSelected = function(event) {
    this.updateButtonUI();
    this.updateModalUI();
};

sc.ProjectViewer.prototype.openViewerForResource = function(resource) {
    var resource = this.databroker.getResource(resource);

    var container = new atb.viewer.ViewerContainer(this.domHelper);
    this.viewerGrid.addViewerContainer(container);

    if (goog.isFunction(scrollIntoView)) scrollIntoView(container.getElement());

    var viewer = atb.viewer.ViewerFactory.createViewerForUri(resource.uri, this.clientApp);
    container.setViewer(viewer);

    viewer.loadResourceByUri(resource.uri);
    container.autoResize();
};

sc.ProjectViewer.prototype._handleWorkingResourcesOpenRequest = function(event) {
    this.openViewerForResource(event.resource);
};

sc.ProjectViewer.prototype._handleEditCancelButtonClick = function(event) {
    event.stopPropagation();

    this.updateModalUI();
    this.editZippy.collapse();
    this.workingResourcesZippy.expand();
};

sc.ProjectViewer.prototype._handleSaveButtonClick = function(event) {
    event.stopPropagation();

    this.saveEdits();
    this.editZippy.collapse();
    this.workingResourcesZippy.expand();
};

sc.ProjectViewer.prototype._handleEditButtonClick = function(event) {
    event.stopPropagation();

    this.editZippy.expand();
    this.workingResourcesZippy.collapse();
};

sc.ProjectViewer.prototype._handleNewTextButtonClick = function(event) {
    event.stopPropagation();

    this.createNewText();
};

sc.ProjectViewer.prototype.saveEdits = function() {
    var title = $(this.titleInput).val();
    var description = $(this.descriptionInput).val();

    this.databroker.dataModel.setTitle(this.projectController.currentProject, title);
    this.projectController.currentProject.setProperty('dcterms:description', sc.data.Literal(description));

    goog.structs.forEach(this.permissionsRows, function(row) {
        var cells = $(row).children();

        var userCell = cells[0];
        var readCheck = $(cells[1]).children().get(0);
        var modifyCheck = $(cells[2]).children().get(0);
        var adminCheck = $(cells[3]).children().get(0);

        var userUri = $(row).attr('about');

        if (readCheck.checked) {
            if (!this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.read)) {
                this.projectController.grantPermissionsToUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.read]);
            }
        }
        else {
            if (this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.read)) {
                this.projectController.revokePermissionsFromUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.read]);
            }
        }
        if (modifyCheck.checked) {
            if (!this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.update)) {
                this.projectController.grantPermissionsToUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.update]);
            }
        }
        else {
            if (this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.update)) {
                this.projectController.revokePermissionsFromUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.update]);
            }
        }
        if (adminCheck.checked) {
            if (!this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.administer)) {
                this.projectController.grantPermissionsToUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.administer]);
            }
        }
        else {
            if (this.projectController.userHasPermissionOverProject(userUri, null, sc.data.ProjectController.PERMISSIONS.administer)) {
                this.projectController.revokePermissionsFromUser(userUri, null, [sc.data.ProjectController.PERMISSIONS.administer]);
            }
        }
    }, this);

    this.updateButtonUI();
    this.updateModalUI();
};

sc.ProjectViewer.prototype.createNewText = function() {
    var textResource = this.databroker.createResource(null, 'dctypes:Text');
    this.databroker.dataModel.setTitle(textResource, 'Untitled text document');

    this.projectController.addResourceToProject(textResource);

    this.openViewerForResource(textResource);
    this.hideModal();
};
