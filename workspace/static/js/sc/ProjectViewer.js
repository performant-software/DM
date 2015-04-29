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
    var user = this.databroker.user;
    this.isGuest = (user.uri.split("/").pop() === "guest");

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.workingResources = new atb.widgets.WorkingResources(this.databroker, this.domHelper);
    goog.events.listen(this.workingResources, 'openRequested', this._handleWorkingResourcesOpenRequest, false, this);

    this.buttonGroupElement = this.domHelper.createDom('div', {'class': 'btn-group sc-ProjectViewer-button'});
    this._buildButtonGroup();

    this.modalElement = this.domHelper.createDom('div', {'class': 'modal hide fade sc-ProjectViewer-modal'});
    this._buildModalElement();
    
    var ss = this.databroker.syncService;
    var pc = this.projectController;
    var self = this;
    setTimeout(function() {
       
      // Toggle public access
      $("#public-access").on("click", function(e) {
         if ( $("#public-access").is(':checked') ) {
            self.generatePublicUrl();
         } else {
            resp = confirm("Remove all public access to this project?");
            if ( resp ) {
               self.revokePublicUrl();
            } else {
               $('#public-access').attr('checked', true);
            }
         }
      });
      
      // Clean orphans from project
      $("#clean-project").on("click", function() {
        if ( $("#clean-project").hasClass("disabled") ) {
            return;
         }
        var currentProject = pc.currentProject;
        var url = ss.restUrl(currentProject.uri) + 'cleanup';
        $("#clean-project").addClass("disabled");
        $.ajax({
           url: url,
           method: "POST",
           complete:  function( jqXHR, textStatus ) {
                alert(jqXHR.responseText);
                $("#clean-project").removeClass("disabled");
           }
        });
      });
      
      // Delete entire project
      $("#del-project").on("click", function() {
         if ( $("#del-project").hasClass("disabled") ) {
            return;
         }
         res = confirm("All data for this project will be deleted. Are you sure?");
         if (res) {
            $("#del-project").addClass("disabled");
            var curr = pc.getCurrentProject();
            var url = ss.restUrl(curr.uri);
            $.ajax({
               url: url,
               method: "DELETE",
               complete: function(jqXHR, textStatus) {
                  if ( textStatus=="success" ) {
                     window.location.reload();
                  } else {
                     $("#del-project").removeClass("disabled");
                     alert("Unable to delete project: "+ jqXHR.responseText);
                  }
               },
            });
         }
      });
   }, 10); 


    goog.events.listen(this.projectController, 'projectSelected', this._onProjectSelected, false, this);
};

sc.ProjectViewer.prototype.generatePublicUrl = function() {
   var url = this.databroker.syncService.restUrl(this.projectController.currentProject.uri) + 'share';
   $.ajax({
      url: url,
      method: "POST",
      complete: function(jqXHR, textStatus) {
         if (textStatus === "success" ) {
            var json = $.parseJSON(jqXHR.responseText);
            $("#public-url").text(json.url);
            $(".pub-url-group").removeClass("hidden");
         } else {
            alert("Unable generate public URL for this project: "+jqXHR.responseText);
            $('#public-access').attr('checked', false);
         }
      }
   });
};

sc.ProjectViewer.prototype.revokePublicUrl = function() {
   var url = this.databroker.syncService.restUrl(this.projectController.currentProject.uri) + 'share';
   $.ajax({
      url: url,
      method: "DELETE",
      complete: function(jqXHR, textStatus) {
         if (textStatus === "success" ) {
            $("#public-url").text("");
            $(".pub-url-group").addClass("hidden");
         } else {
            alert("Unable revoke public URL for this project: "+jqXHR.responseText);
            $('#public-access').attr('checked', true);
         }
      }
   });
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
    this.buttonDropdownList = $("<ul class='dropdown-menu'></ul>");

    if ( this.isGuest === false ) {
       var createNewProjectButton = this.domHelper.createDom('li', {'class': 'sc-ProjectViewer-createProjectButton'},
           this.domHelper.createDom('a', {'href': 'javascript:void(0)', 'title': 'Start a new project'},
           this.domHelper.createDom('span', {'class': 'icon-plus'}), 'New project'));
       goog.events.listen(createNewProjectButton, 'click', this._handleNewProjectButtonClick, false, this);
       this.buttonDropdownList.append("<li class='divider'></li>");
       this.buttonDropdownList.append(createNewProjectButton);
    }

    this.projectChoiceElements = [];

    this.buttonGroupElement.appendChild(this.dropdownButton);
    this.buttonGroupElement.appendChild(this.buttonDropdownList[0]);

    this.updateButtonUI();
};

sc.ProjectViewer.prototype._buildModalElement = function() {
    // Header
    this._buildHeader();

    // Body
    this.modalBody = this.domHelper.createDom('div', {'class': 'modal-body'});

    this.editElement = this.domHelper.createDom('div', {'class': 'form-horizontal sc-ProjectViewer-projectEdit'});
    this._buildEditSection();
    this.modalBody.appendChild(this.editElement);
    this.editZippy = new goog.ui.AnimatedZippy(null, this.editElement, false);

    this.uploadCanvasElement = this.domHelper.createDom('div', {'class': 'form-horizontal sc-ProjectViewer-uploadCanvas'});
    this._buildUploadCanvasSection();
    this.modalBody.appendChild(this.uploadCanvasElement);
    this.uploadCanvasZippy = new goog.ui.AnimatedZippy(null, this.uploadCanvasElement, false);

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
    var delProjBtn = this.domHelper.createDom('button', {'class': 'btn btn-primary', 'id': 'del-project'}, 'Delete Project');
    this.modalFooter.appendChild(delProjBtn);
    
    var cleanProjBtn = this.domHelper.createDom('button', {'class': 'btn btn-primary', 'id': 'clean-project'}, 'Clean Up Project');
    this.modalFooter.appendChild(cleanProjBtn);
    
    this.modalFooter.appendChild(footerCloseButton);
    this.modalElement.appendChild(this.modalFooter);
};

sc.ProjectViewer.prototype._buildHeader = function() {
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

    if ( this.isGuest === false ) {
       var addButtonLi = this.domHelper.createDom('li', {'class': 'dropdown'},
           this.domHelper.createDom('a', {'href': 'javascript:void(0)', 'data-toggle': 'dropdown'},
               this.domHelper.createDom('span', {'class': 'icon-plus'}), 'Add Resources',
                   this.domHelper.createDom('span', {'class': 'caret'})));
       var addSubmenuUl =this.domHelper.createDom('ul', {'class': 'dropdown-menu', 'role': 'menu'});
       addButtonLi.appendChild(addSubmenuUl);
       var newTextButtonLi = this.domHelper.createDom('li', {},
           this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
               this.domHelper.createDom('span', {'class': 'icon-pencil'}), 'New Text'));
       goog.events.listen(newTextButtonLi, 'click', this._handleNewTextButtonClick, false, this);
       var uploadCanvasButtonLi = this.domHelper.createDom('li', {},
           this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
               this.domHelper.createDom('span', {'class': 'icon-picture'}), 'Upload Image'));
       goog.events.listen(uploadCanvasButtonLi, 'click', this._handleUploadCanvasButtonClick, false, this);
       addSubmenuUl.appendChild(newTextButtonLi);
       addSubmenuUl.appendChild(uploadCanvasButtonLi);
       nav.appendChild(addButtonLi);
   
       var editButtonLi = this.domHelper.createDom('li', {}, 
           this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
               this.domHelper.createDom('span', {'class': 'icon-cog'}), 'Project Info and Sharing'));
       goog.events.listen(editButtonLi, 'click', this._handleEditButtonClick, false, this);
       nav.appendChild(editButtonLi);
    }
    
    var downloadButtonLi = this.domHelper.createDom('li', {},
        this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
            this.domHelper.createDom('span', {'class': 'icon-download'}), 'Download'));
    goog.events.listen(downloadButtonLi, 'click', this._handleDownloadButtonClick, false, this);
    nav.appendChild(downloadButtonLi);
    this.modalHeader.appendChild(nav);
    this.modalElement.appendChild(this.modalHeader);
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
    
    // public access
    var publicPanel = this.domHelper.createDom('div', {'class': 'panel panel-default pub-access'});
    var publicBody = this.domHelper.createDom('div', {'class': 'panel-body'});
    publicPanel.appendChild(publicBody);
    
    var cbDiv = this.domHelper.createDom('div', {'class': 'checkbox'});
    publicBody.appendChild(cbDiv);
    var cbLbl = this.domHelper.createDom('label','', "Publicly Accessible?");
    cbDiv.appendChild(cbLbl);
    var cb = this.domHelper.createDom('input', {'type': 'checkbox', 'id': 'public-access'});
    cbLbl.appendChild(cb);
    
    var urlDiv = this.domHelper.createDom('div', {'class': 'hidden control-group pub-url-group'});
    publicBody.appendChild(urlDiv);
    var urlLbl = this.domHelper.createDom('label','', "URL:");
    urlDiv.appendChild(urlLbl);
    var url = this.domHelper.createDom('p',{'id': 'public-url'}, "http://dm.performantsoftware.com/projects/98hs73hx");
    urlDiv.appendChild(url);
   
    this.editElement.appendChild(publicPanel);


    // Users and permissions.....
    this.permissionsTable = this.domHelper.createDom('table', {'class': 'table table-striped table-bordered sc-ProjectViewer-permissions-table'},
        this.domHelper.createDom('thead', {},
            this.domHelper.createDom('tr', {},
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-user'}), 'User'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-eye-open'}), 'Can See'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-pencil'}), 'Can Modify'),
                this.domHelper.createDom('th', {}, this.domHelper.createDom('span', {'class': 'icon-lock'}), 'Admin'))),
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

sc.ProjectViewer.filenameToTitle = function(filename) {
    var i = filename.lastIndexOf('.');
    if (i !== -1) {
        filename = filename.substring(0, i);
    }

    filename = filename.replace(/_/g, ' ');

    return goog.string.toTitleCase(filename);
};

sc.ProjectViewer.prototype._buildUploadCanvasSection = function() {
    this.uploadCanvasElement.appendChild(this.domHelper.createDom('h4', {}, 'Upload an Image'));

    // File
    var fileGroup = this.domHelper.createDom('div', {'class': 'control-group'});
    var fileLabel = this.domHelper.createDom('label', {'class': 'control-label', 'for': 'canvasFileInput'}, 'Image File');
    var fileControls = this.domHelper.createDom('div', {'class': 'controls'});
    var fileInput = this.domHelper.createDom('input', {'type': 'file', 'id': 'canvasFileInput'});
    fileGroup.appendChild(fileLabel);
    fileControls.appendChild(fileInput);
    fileGroup.appendChild(fileControls);
    this.uploadCanvasElement.appendChild(fileGroup);

    // Title
    var titleGroup = this.domHelper.createDom('div', {'class': 'control-group'});
    var titleLabel = this.domHelper.createDom('label', {'class': 'control-label', 'for': 'canvasTitleInput'}, 'Title');
    var titleControls = this.domHelper.createDom('div', {'class': 'controls'});
    var titleInput = this.domHelper.createDom('input', {'type': 'text', 'id': 'canvasTitleInput', 'placeholder': 'Untitled Canvas'});
    titleGroup.appendChild(titleLabel);
    titleControls.appendChild(titleInput);
    titleGroup.appendChild(titleControls);
    this.uploadCanvasElement.appendChild(titleGroup);

    goog.events.listen(fileInput, 'change', function(event) {
        var file = fileInput.files[0];

        if (!goog.string.startsWith(file.type, 'image/')) {
            alert('"' + file.name + '" is not an image file.');
            fileInput.value = null;
            return;
        }

        if (!(goog.string.endsWith(file.type, '/jpeg') || goog.string.endsWith(file.type, '/png'))) {
            alert('"' + file.name + '" is not a jpeg or png formatted image file.');
            fileInput.value = null;
            return;
        }

        if (titleInput.value == '' || titleInput.value == null) {
            titleInput.value = sc.ProjectViewer.filenameToTitle(file.name);
        }
    }, false, this);

    this.canvasUploadFormInputs = {
        'title': titleInput,
        'file': fileInput
    };

    // Progress bar

    this.canvasUploadProgressBar = this.domHelper.createDom('div', {'class': 'progress progress-striped active'},
        this.domHelper.createDom('div', {'class': 'bar', 'style': 'width: 0%;'}));
    jQuery(this.canvasUploadProgressBar).hide();
    this.uploadCanvasElement.appendChild(this.canvasUploadProgressBar);

    // Save and cancel buttons
    var uploadControls = this.domHelper.createDom('div', {'class': 'form-actions'});
    var cancelButton = this.domHelper.createDom('button', {'class': 'btn'}, 'Cancel');
    goog.events.listen(cancelButton, 'click', function(event) {
        this.hideCanvasUploadForm();
        this.clearCanvasUploadForm();
    }, false, this);
    uploadControls.appendChild(cancelButton);
    uploadControls.appendChild(this.domHelper.createDom('span', {}, ' '));
    var uploadButton = this.domHelper.createDom('button', {'class': 'btn btn-primary'}, 'Upload');
    goog.events.listen(uploadButton, 'click', this._handleUploadCanvasSubmit, false, this);
    uploadControls.appendChild(uploadButton);
    this.uploadCanvasElement.appendChild(uploadControls);
};

sc.ProjectViewer.prototype.clearCanvasUploadForm = function() {
    this.canvasUploadFormInputs.title.value = '';
    this.canvasUploadFormInputs.file.value = null;

    jQuery(this.canvasUploadProgressBar).hide();
    jQuery(this.canvasUploadProgressBar).children().first().css('width', '0%');
};

sc.ProjectViewer.prototype.hideCanvasUploadForm = function() {
    this.uploadCanvasZippy.collapse();
    this.workingResourcesZippy.expand();
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
                this.databroker.quadStore.addQuad(
                    new sc.data.Quad(user.bracketedUri, this.databroker.namespaces.expand('rdf', 'type'), this.databroker.namespaces.expand('foaf', 'Agent'), null)
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
    var indexOfThisUser = userUris.indexOf(this.databroker.user.uri);
    if (indexOfThisUser != -1) {
        goog.array.removeAt(userUris, indexOfThisUser);
        goog.array.insertAt(userUris, this.databroker.user.uri, 0);
    }

    goog.structs.forEach(userUris, function(user) {
        var userResource = this.databroker.getResource(user);
        var unwrappedUserUri = sc.data.Term.unwrapUri(user);
        var username = userResource.getOneProperty('rdfs:label') || unwrappedUserUri.substring(unwrappedUserUri.lastIndexOf('/') + 1, unwrappedUserUri.length);
        if ( username.indexOf("guest_") != 0 ) {
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
        }
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
    if (this.projectController.currentProject) {
        var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
        $(this.titleInput).val(projectTitle);
        $(this.descriptionInput).val(this.projectController.currentProject.getOneProperty('dcterms:description') || '');

        if (!this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.administer)) {
            this.titleInput.disabled = true;
            this.titleInput.title = "You need admin permissions to change the project's title";
        }
        else {
            this.titleInput.disabled = false;
            this.titleInput.title = "";
        }

        if (!this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
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


sc.ProjectViewer.prototype.updateModalUI = function() {
   $("#del-project").hide();
   $("#clean-project").hide();
   $(".sc-ProjectViewer-modal .nav-pills").hide();

   if (this.projectController.currentProject) {
      var uri = this.projectController.currentProject.uri;
      this.workingResources.loadManifest(uri);

      var projectTitle = this.databroker.dataModel.getTitle(this.projectController.currentProject);
      $(this.modalTitle).text('\u201c' + (projectTitle || 'Untitled project') + '\u201d');

      if (this.databroker.projectController.userHasPermissionOverProject(this.databroker.user, uri, 
          sc.data.ProjectController.PERMISSIONS.administer)) {
         $("#del-project").show();
         $("#clean-project").show();
         $(".sc-ProjectViewer-modal .nav-pills").show();
      }

      if (this.databroker.projectController.userHasPermissionOverProject(this.databroker.user, 
          uri, sc.data.ProjectController.PERMISSIONS.update)) {
         $(".sc-ProjectViewer-modal .nav-pills").show();
      }
   } else {
      $(this.modalTitle).text('No project selected');
   }

   this.updateEditUI();
}; 


sc.ProjectViewer.prototype.showModal = function() {
    this.updateModalUI();
    this.editZippy.collapse();
    this.uploadCanvasZippy.collapse();
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
            this.domHelper.createDom('a', {'href': 'javascript:void(0)'},
            this.domHelper.createDom('span', {'class': 'icon-book'}), title));
        $(li).attr({
            'about': uri,
            'rel': this.databroker.namespaces.expand('dc', 'title'),
            'title': 'Switch projects to "' + title + '"'
        });

        goog.events.listen(li, 'click', function(event) {
            this._handleProjectChoiceClick(event, uri);
        }, false, this);

        fragment.appendChild(li);
        this.projectChoiceElements.push(li);
    }, this);

    this.buttonDropdownList.prepend(fragment);
};

sc.ProjectViewer.prototype.updateProjectChoices = function() {
    var projectUris = this.projectController.findProjects();

    if (this.projectController.currentProject) {
        goog.array.remove(projectUris, this.projectController.currentProject.uri);
    }

    this.setProjectChoicesByUris(projectUris);
    
    if ( projectUris.length === 1) {
       var username = $("#logged-in-user").text();
       if (username === "Guest")  {
         this.switchToProject(projectUris[0] );
         setTimeout( function() {
            var b = $(".sc-ProjectViewer-titleButton");
            b.trigger("click");
         }, 500);
       }
    }
};

sc.ProjectViewer.prototype.switchToProject = function(project) {
    project = this.databroker.getResource(project);

    if (project.equals(this.projectController.currentProject)) {
        return false;
    }

    var deferredProject = project.defer();

    var performSwitch = function() {
        deferredProject.done(function() {
            this.projectController.selectProject(project);
            this.workingResources.loadManifest(project.uri);
        }.bind(this));
    }.bind(this);

    if (!viewerGrid.isEmpty()) {
        if (confirm('Are you sure you want to switch projects? All your open resources from the current project will be closed.')) {
            viewerGrid.closeAllContainers();
            performSwitch();
            return true;
        }
        else {
            return false;
        }
    }
    else {
        performSwitch();
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

    if (goog.isFunction(viewer.makeUneditable) &&
        !this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
        viewer.makeUneditable();
    }

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

    this.databroker.sync();
    this.saveEdits();
    this.editZippy.collapse();
    this.workingResourcesZippy.expand();
};

sc.ProjectViewer.prototype._handleEditButtonClick = function(event) {
    event.stopPropagation();
    
    $(".sc-ProjectViewer-projectEdit").children().addClass("disabled");
    $("#public-access").prop('checked', false);
    $(".pub-url-group").removeClass("hidden").addClass("hidden");
     
    this.editZippy.expand();
    this.workingResourcesZippy.collapse();
    this.uploadCanvasZippy.collapse();
    
    var url = this.databroker.syncService.restUrl(this.projectController.currentProject.uri) + 'share';
    $.getJSON(url,function( data,status, xhr ) {
        $(".sc-ProjectViewer-projectEdit").children().removeClass("disabled");
        if  (  status == "success" ) {
           if ( data.public ) {
             $("#public-access").prop('checked', true); 
             $("#public-url").text( data.url );
             $(".pub-url-group").removeClass("hidden");
           }
        }
    });
};

sc.ProjectViewer.prototype._handleDownloadButtonClick = function(event) {
    event.stopPropagation();
    var downloadUrl = this.databroker.syncService.getProjectDownloadUrl(this.projectController.currentProject.uri);
    var w = window.open(downloadUrl);
};

sc.ProjectViewer.prototype._handleNewTextButtonClick = function(event) {
    this.createNewText();
};

sc.ProjectViewer.prototype._handleUploadCanvasButtonClick = function(event) {
    this.uploadCanvasZippy.expand();
    this.workingResourcesZippy.collapse();
    this.editZippy.collapse();
};

sc.ProjectViewer.prototype._handleUploadCanvasSubmit = function(event) {
    var title = this.canvasUploadFormInputs.title.value;
    var file = this.canvasUploadFormInputs.file.files[0];

    jQuery(this.canvasUploadProgressBar).slideDown(200).addClass('active');
    jQuery(this.canvasUploadProgressBar).children().first().css('width', '5%');

    this.projectController.uploadCanvas(title, file, function(raw_data) {
        // Success
        jQuery(this.canvasUploadProgressBar).children().first().css('width', '100%').removeClass('active');

        this.updateModalUI();

        window.setTimeout(function() {
            this.hideCanvasUploadForm();
            this.clearCanvasUploadForm();
        }.bind(this), 400);
    }.bind(this),
    function(event) {
        // Failure
        alert('Image upload failed. The server returned a status code of ' + event.target.status + '.');
    }.bind(this),
    function(event) {
        // Progress
        if (event.lengthComputable) {
            var percentLoaded = event.loaded / event.total;

            if (percentLoaded > 0.05) {
                jQuery(this.canvasUploadProgressBar).children().first().css('width', (percentLoaded * 100) + '%');
            }
        }
        else {

        }
    }.bind(this));
};

sc.ProjectViewer.prototype.saveEdits = function() {
    var title = $(this.titleInput).val();
    var description = $(this.descriptionInput).val();

    if (this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.administer)) {
        this.databroker.dataModel.setTitle(this.projectController.currentProject, title);
    }
    if (this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
        this.projectController.currentProject.setProperty('dcterms:description', sc.data.Literal(description));
    }

    goog.structs.forEach(this.permissionsRows, function(row) {
        var cells = $(row).children();

        var userCell = cells[0];
        var readCheck = $(cells[1]).children().get(0);
        var modifyCheck = $(cells[2]).children().get(0);
        var adminCheck = $(cells[3]).children().get(0);

        var userUri = $(row).attr('about');

        if (this.databroker.user.equals(userUri) || this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.administer)) {
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
        }
    }, this);

    this.updateButtonUI();
    this.updateModalUI();
};

sc.ProjectViewer.prototype.createNewText = function() {
    var textResource = this.databroker.dataModel.createText('Untitled text document', '');

    this.projectController.addResourceToProject(textResource);

    this.openViewerForResource(textResource);
    this.hideModal();
};
