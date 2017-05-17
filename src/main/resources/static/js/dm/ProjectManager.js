goog.provide("dm.ProjectManager");
goog.require("goog.dom");

/**
 * @author lmoss1@drew.edu (Lucy Moss)
 * Creates two modals and a project select dropdown menu
 * Handles the manipulation of all data related to projects
 * * Switching projects by selecting the title in a dropdown menu
 * * Editing projects by clicking on the button for the current project
 * * Creating projects by selecting the "Create New Project" link in dropdown
 */
dm.ProjectManager = function(databroker, buttonElement, viewerGrid, workingResources, body, username) {
   // Supplied data
   this.databroker = databroker;
   this.buttonElement = buttonElement;
   this.viewerGrid = viewerGrid;
   this.workingResources = workingResources;
   this.windowBody = body;
   this.username = username;

   // Span tags tags for the current project button
   this.projectSpan = goog.dom.createDom("span", {
      style : 'color:#666;'
   }, "project: ");
   this.titleSpan = goog.dom.createDom("span", {
      style : 'color:#999;'
   }, ' (none)');
   this.tempTitleSpan = goog.dom.createDom("span", {
      style : 'color:#999'
   }, "loading...");

   // Variables needed for user tagging system
   this.newAddedUsersList = [username];
   this.editAddedUsersList = [];
   this.shift = false;

   /* When using $(domElement), $().val() doesn't work -- necessary for these items,
    * so we define random, instance-specific ids for each of these items
    */
   this.newTitleId = goog.string.getRandomString();
   this.newDescriptionId = goog.string.getRandomString();
   this.editTitleId = goog.string.getRandomString();
   this.editDescriptionId = goog.string.getRandomString();

   // General setup/preparation methods
   this.decorate();
};

/* Creates visual elements of project manipulation
 * * Creates the button/dropdown within the supplied element
 * * Creates the edit/create modals
 * Also sets current project (to last work on) [once implemented]
 */
dm.ProjectManager.prototype.decorate = function() {
   // Create button group
   this.createButtons();

   // Create the two modals
   this.createNewProjectModal();
   this.createEditProjectModal();

   // Set default project
   this.setTitle(true);
};

/* Creates the button group for the toolbar
 * * Creates "current project" button
 * * Creates dropdown toggle button
 * * Creates dropdown menu with no data in it (generated elsewhere)
 */
dm.ProjectManager.prototype.createButtons = function() {
   // Short, jQuery reference to element
   var div = $(this.buttonElement);

   // Add necessary class
   div.addClass("btn-group");

   // Create 'global' variable for the dropdown
   this.dropdownMenu = goog.dom.createDom("ul", {
      "class" : "dropdown-menu"
   });
   // Create 'global' variable for the button for current project (toggles edit modal)
   this.titleButton = goog.dom.createDom("a", {
      "href" : '#editProjectModal',
      "class" : "btn btn-inverse",
      'data-toggle' : 'modal',
      "style" : "display: inline-block; padding: 6px; margin-bottom: 3px;",
      "title" : "Edit this project"
   });

   // Create local (static) variables to fold into buttonElement
   var dropdownToggle = goog.dom.createDom("button", {
      "class" : "btn dropdown-toggle btn-inverse",
      "data-toggle" : "dropdown",
      "style" : "display: inline-block; padding: 6px; margin-bottom: 3px;",
      "title" : "Switch to another project, or create a new one"
   });
   var caret = goog.dom.createDom("span", {
      "class" : "caret",
      style : 'border-bottom-color:#999; border-top-color:#999;'
   });
   var newProjectSelect = goog.dom.createDom("li");

   // Fold children into static data
   newProjectSelect.appendChild(goog.dom.createDom("a", {
      href : '#newProjectModal',
      role : 'button',
      'data-toggle' : 'modal'
   }, "Create New Project"));
   dropdownToggle.appendChild(caret);

   // Fold static data into dropdown menu
   this.dropdownMenu.appendChild(newProjectSelect);
   this.dropdownMenu.appendChild(goog.dom.createDom("li", {
      "class" : "divider"
   }));

   // Add buttons to element
   div.append(this.titleButton);
   div.append(dropdownToggle);
   div.append(this.dropdownMenu);
};

/* Set the title in the current project button
 * todo: Once last used project is defined, that info should be read/manipulated here
 */
dm.ProjectManager.prototype.setTitle = function(useDeferredResource) {
   // Get current project

   if (!(projectId)) {
      console.warn("There is no currently selected project.");

      $(this.titleButton).append(this.projectSpan).append(this.titleSpan);
   } else {
      if (useDeferredResource) {
         $(this.titleSpan).detach();
         $(this.titleButton).append(this.tempTitleSpan);

         this.databroker.getDeferredResource(projectId).done( function(resource) {
            var title = resource.getOneProperty('dc:title');
            this.titleSpan = goog.dom.createDom("span", {
               style : 'color:#999'
            }, title);
            this.titleButton.removeChild(this.tempTitleSpan);

            this.titleButton.appendChild(this.projectSpan);
            this.titleButton.appendChild(this.titleSpan);

         }.bind(this));

         /* Add the data about the current project to the edit modal
          * This properly sources the data every time a new project is selected
          */
         this.prepareForEdit();
      }
      // Only to be used with the edit modal
      else {
         this.titleButton.removeChild(this.titleSpan);
         resource = this.databroker.getResource(projectId);

         var title = resource.getOneProperty('dc:title');
         this.titleSpan = goog.dom.createDom("span", {
            style : 'color:#999'
         }, title);

         this.titleButton.appendChild(this.projectSpan);
         this.titleButton.appendChild(this.titleSpan);
      }
   }
};

/* Adds a project's title to the dropdown menu
 * When the title is clicked on, switches to that project
 * Used when the full list of projects is populated on initial load
 */
dm.ProjectManager.prototype.addOneProject = function(uri, useDeferredResource, onComplete) {
   onComplete = onComplete || jQuery.noop;
   var resource = this.databroker.getResource(uri);
   var createElements = function() {
      title = resource.getOneProperty('dc:title');
      var projectLink = goog.dom.createDom("a", {
         'about' : uri,
         'property' : this.databroker.namespaces.expand('dc', 'title'),
         'title' : 'Switch projects to "' + title + '"',
         'href' : '#'
      }, title);
      jQuery(projectLink).click( function(event) {
         this.confirmSelectProject(uri);
      }.bind(this));

      var li = goog.dom.createDom('li');
      li.appendChild(projectLink);
      $(this.dropdownMenu).append(li);

      onComplete();
   }.bind(this);

   if (useDeferredResource) {
      this.databroker.getDeferredResource(uri).done(createElements);
   } else {
      createElements();
   }
};

/* The function utilized when a new project is created
 * Adds the project to the dropdown menu listing project titles, also selects the
 *  project as the current project
 * Functions independently of addOneProject because other methods rely on the full link
 *  element, and returning the link element in addOneProject is causing difficulties
 */
dm.ProjectManager.prototype.addAndSwitchToProject = function(uri) {
   this.addOneProject(uri, false, function() {
      this.selectProject(uri);
   }.bind(this));
};

/* Gathers all projects over which the current user has permissions and adds them to the
 *  dropdown listing project titles
 * Called on initial page load (in workspace.js), but can be called at any time to
 *  completely update the list of projects in the dropdown
 */
dm.ProjectManager.prototype.addAllUserProjects = function(user, useDeferredResource) {
   var username = user || this.username;
   var userUri = this.databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, username, null);
   var projects = this.databroker.getResource(userUri).getProperties('perm:hasPermissionOver');

   $(this.dropdownMenu).empty();

   var newProjectSelect = goog.dom.createDom("li");
   newProjectSelect.appendChild(goog.dom.createDom("a", {
      href : '#newProjectModal',
      role : 'button',
      'data-toggle' : 'modal'
   }, "Create New Project"));
   $(this.dropdownMenu).append(newProjectSelect).append(goog.dom.createDom("li", {
      "class" : "divider"
   }));

   for (var i = 0; i < projects.length; i++) {
      this.addOneProject(projects[i], useDeferredResource);
   };
};

/* Switches between projects, which are labeled with the title
 * Set as onClick property of each link that has a project's title
 * * That element has the uri of the project with the displayed title as its id
 * Confirms that switching projects will close all resources
 * When current project is selected, prompts to reload the current project
 */
dm.ProjectManager.prototype.confirmSelectProject = function(uri) {
   // If no open resources, does not need to warn about closing them!
   if (this.viewerGrid.isEmpty()) {
      this.selectProject(uri);
   } else {
      // Warns that changing projects closes all resources
      if (confirm("Selecting another will close all open resources.\nContinue?")) {
         this.selectProject(uri);
      }
   }
};

/* Selects the project supplied by an element
 * A valid uri is supplied
 * Once a way to save the layout is configured, we would save that here
 */
dm.ProjectManager.prototype.selectProject = function(uri) {
   // Load new project
   this.viewerGrid.closeAllContainers();
   this.databroker.projectController.selectProject(uri);
   this.setTitle(true);
   this.workingResources.loadManifest(uri);

   // Set last opened project
   var wrap = dm.data.Term.wrapUri;
   var userUri = databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, this.username, null);
   var pred = this.databroker.namespaces.expand("dm", "lastOpenProject");
   this.databroker.getResource(userUri).setProperty(pred, wrap(uri));

   this.prepareForEdit();
};

/* Creates the modal which handles new project creation
 * Elements which are manipulated by the user are declared globally
 */
dm.ProjectManager.prototype.createNewProjectModal = function() {
   var modal = goog.dom.createDom("div", {
      'class' : 'modal hide fade',
      id : 'newProjectModal'
   });

   var header = goog.dom.createDom("div", {
      'class' : 'modal-header'
   });

   // Close "button" on top right of modal
   header.appendChild(goog.dom.createDom('a', {
      'class' : 'close',
      'data-dismiss' : 'modal'
   }, "x"));

   // Header Text
   header.appendChild(goog.dom.createDom('h3', {}, 'New Project Creation'));

   var body = goog.dom.createDom("div", {
      'class' : 'modal-body'
   });

   // Title label & input box
   body.appendChild(goog.dom.createDom("label", {
      style : "display:inline-block;width:80px;"
   }, "Title:"));

   // Add custom (random) id to title input area because jQuery has a bug in .val()
   //  when accessed by $(this.newTitle)
   this.newTitle = goog.dom.createDom("input", {
      type : 'text',
      style : "width:430px;margin-right:0px",
      id : this.newTitleId
   });
   body.appendChild(this.newTitle);

   // Description label, help text, & input
   body.appendChild(goog.dom.createDom("label", {
      style : "display:inline-block;width:80px;"
   }, "Description:"));
   this.newDescription = goog.dom.createDom("textarea", {
      rows : 2,
      style : "width:430px;margin-right:0px;",
      id : this.newDescriptionId
   });
   body.appendChild(this.newDescription);

   // Add a break for some visual clarity
   body.appendChild(goog.dom.createDom("br"));

   // User area -- dynamic data -- block for added users, input area
   this.newAddedUsers = goog.dom.createDom("p", {
      "class" : "help-block",
      style : 'word-wrap:break-word;'
   });
   this.newUsers = goog.dom.createDom("input", {
      type : 'text',
      style : "width:430px;margin-right:0px"
   });
   this.newHelp = goog.dom.createDom("span", {
      'class' : 'help-block'
   });

   // Add all user area parts to body
   body.appendChild(goog.dom.createDom("p", {
      "class" : "help-block"
   }, "Type a username, and then hit shift+enter to add that user to your project."));
   body.appendChild(goog.dom.createDom("label", {
      style : 'display:inline-block;width:80px'
   }, "Add Users:"));
   body.appendChild(this.newUsers);
   body.appendChild(this.newHelp);
   body.appendChild(this.newAddedUsers);

   var footer = goog.dom.createDom("div", {
      'class' : 'modal-footer'
   });

   // Cancel -- does not remove data from modal
   footer.appendChild(goog.dom.createDom("a", {
      href : '#newProjectModal',
      'class' : 'btn',
      'data-toggle' : 'modal'
   }, "Cancel"));

   // Create -- default button -- creates new project
   var saveButton = goog.dom.createDom('a', {
      href : '#newProjectModal',
      'class' : 'btn btn-primary',
      'data-toggle' : 'modal'
   }, "Create New Project");
   $(saveButton).click( function(event) {
      this.sendNewDataFromModal();
   }.bind(this));
   footer.appendChild(saveButton);

   // Add to modal
   modal.appendChild(header);
   modal.appendChild(body);
   modal.appendChild(footer);

   // Add to window
   this.windowBody.appendChild(modal);

   // Add action listener for user 'tagging' system
   this.newUserTagSystem();

   return modal;
};

dm.ProjectManager.prototype.sendNewDataFromModal = function() {
   //Collect data
   var t = $("#" + this.newTitleId), d = $("#" + this.newDescriptionId);

   if (t.val()) {
      this.sendNewData(t.val(), d.val(), this.newAddedUsersList);

      //Clear data from modal ("reset" modal)
      t.val("");
      d.val("");
      $(this.newAddedUsers).empty();
      this.newAddedUsersList = [this.username];

   } else {
      alert("Your project needs a title.");
   }
};

/* Collects data from new project modal
 * Clears the data so that another project can be created without refresh
 * Serializes data and sends POST request to /semantic_store/projects/
 */
dm.ProjectManager.prototype.sendNewData = function(title, description, users) {
   //Create UUID for new project
   var project = this.databroker.createResource();

   goog.structs.forEach(users, function(userUri) {
      var user = this.databroker.getResource(userUri);
      user.addProperty('perm:hasPermissionOver', project);
      user.addProperty('rdf:type', 'foaf:Agent');
   }, this);

   project.setProperty('dcterms:description', new dm.data.Literal(description));
   this.databroker.dataModel.setTitle(project, title);
   project.addProperty('rdf:type', 'dctypes:Collection');
   project.addProperty('rdf:type', 'ore:Aggregation');
   project.addProperty('rdf:type', 'dm:Project');
   project.addProperty('rdf:type', 'foaf:Project');

   // Add the new project to the databroker as a valid project
   // Bob: I don't think the below does anything. Can't find that function anywhere else,
   // therefore...
   // TODO: This can likely be removed.
   this.databroker.addNewProject(project.uri);

   this.addAndSwitchToProject(project.uri);
};

/* Removes the specified user from the speicified array of users
 * Removes the "tag" displaying the username
 * Used by both project edit & create modals, so functions independently of either
 */
dm.ProjectManager.prototype.clearUser = function(userList, username) {
   return goog.array.remove(userList, username);
};

/* Function which removes a user supplied in the edit project modal
 * Although a simple function, must be declared so it can be set as onClick property of
 *  usernames in the 'tagging' system for the edit project modal.
 * Also ensure the current user is always a part of a project
 */
dm.ProjectManager.prototype.clearEditUser = function(username) {
   if (username == this.username) {
      $(this.editHelp).text("You cannot delete yourself from a project.");
   } else {
      this.clearUser(this.editAddedUsersList, username);
   }
};

/* Appends username from input field into corresponding paragraph (creation modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * help: Label on which to place help text
 * added: Element on which to display added users
 */
dm.ProjectManager.prototype.newUserTagSystem = function() {
   usr = $(this.newUsers);
   /* Ensures shift is down
    * Shift+Return combo needed because the typeahead system uses Return
    */
   usr.keydown( function(e) {
      // Watches the shift key
      if (e.which == 16)
         this.shift = true;

      //Toggles off the "incorrect user" help text
      $(this.newHelp).text("");
   }.bind(this));

   /* Script which adds users
    * Usernames assigned to project are stored in newAddedUsers
    * 'keyup' call ensures that the user has finished typing the username
    * Looks for Shift+Return combination ONLY
    * Checks for users already added
    * Rejects invalid usernames
    * ((Next Up: suggests usernames using typeahead))
    */
   usr.keyup( function(e) {
      if (e.which == 13 && this.shift) {
         var val = $(this.newUsers).val();

         this.isValidUser(val, function(isValid) {
            if (isValid) {
               if (this.newAddedUsersList.indexOf(val) == -1) {
                  // "\xa0" is non-breaking whitespace for this library
                  var user = goog.dom.createDom("a", {
                     id : val
                  }, val + "\xa0 \xa0");
                  $(user).click( function(event) {
                     this.clearUser(val);
                     $(user).detach();
                  }.bind(this));
                  this.newAddedUsers.appendChild(user);
                  this.newAddedUsersList.push(val);

                  $(this.newUsers).val("");
               } else {
                  $(this.newHelp).text("This user is already added to the project.");
               }
            } else {
               $(this.newHelp).text("This is not a valid user.");
            }
         }.bind(this));
      } else if (e.which == 16)
         this.shift = false;
   }.bind(this));
};

/* Appends username from input field into corresponding paragraph (edit modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * help: Label on which to place help text
 * added: Element on which to display added users
 */
dm.ProjectManager.prototype.editUserTagSystem = function() {
   usr = $(this.editUsers);
   /* Ensures shift is down
    * Shift+Return combo needed because the typeahead system uses Return
    */
   usr.keydown( function(e) {
      // Watches the shift key
      if (e.which == 16)
         this.shift = true;

      //Toggles off the "incorrect user" help text
      $(this.editHelp).text("");
   }.bind(this));

   /* Script which adds users
    * Usernames assigned to project are stored in newAddedUsers
    * 'keyup' call ensures that the user has finished typing the username
    * Looks for Shift+Return combination ONLY
    * Checks for users already added
    * Rejects invalid usernames
    * ((Next Up: suggests usernames using typeahead))
    */
   usr.keyup( function(e) {
      if (e.which == 13 && this.shift) {
         var val = usr.val();

         this.isValidUser(val, function(isValid) {
            if (isValid) {
               if (this.editAddedUsersList.indexOf(val) == -1) {
                  // "\xa0" is non-breaking whitespace for this library
                  var clearButton = goog.dom.createDom('span', {
                     'title' : 'Remove ' + val + ' from the project',
                     'style' : 'cursor: pointer;'
                  }, '\u2715');
                  var user = goog.dom.createDom("span", {
                     id : val
                  }, val, clearButton, "\xa0 \xa0");
                  jQuery(clearButton).click( function(event) {
                     this.clearEditUser(val);
                     jQuery(user).detach();
                  }.bind(this));
                  this.editAddedUsers.appendChild(user);
                  this.editAddedUsersList.push(val);

                  usr.val("");
               } else {
                  $(this.editHelp).text("This user is already added to the project.");
               }
            } else {
               $(this.editHelp).text("This is not a valid user.");
            }
         }.bind(this));
      } else if (e.which == 16)
         this.shift = false;
   }.bind(this));
};

/* Creates the modal which handles new project creation
 * Elements which are manipulated by the user are declared globally
 */
dm.ProjectManager.prototype.createEditProjectModal = function() {
   var modal = goog.dom.createDom("div", {
      "class" : "modal hide fade",
      id : 'editProjectModal'
   });

   var header = goog.dom.createDom("div", {
      'class' : 'modal-header'
   });

   // Close button
   header.appendChild(goog.dom.createDom("a", {
      'class' : 'close',
      'data-dismiss' : 'modal'
   }, "x"));
   header.appendChild(goog.dom.createDom("h3", {}, "Edit Project:"));

   var body = goog.dom.createDom("div", {
      'class' : 'modal-body'
   });

   // Title area
   body.appendChild(goog.dom.createDom("label", {
      style : "display:inline-block;width:80px;"
   }, "Title:"));
   this.editTitle = goog.dom.createDom("input", {
      style : "width:430px;margin-right:0px;",
      type : "text",
      id : this.editTitleId
   });
   body.appendChild(this.editTitle);

   // Description
   body.appendChild(goog.dom.createDom("label", {
      style : "display:inline-block;width:80px;"
   }, "Description:"));
   this.editDescription = goog.dom.createDom("textarea", {
      style : "width:430px;margin-right:0px;",
      rows : 2,
      id : this.editDescriptionId
   });
   body.appendChild(this.editDescription);

   // User area -- dynamic data -- block for added users, input area
   this.editAddedUsers = goog.dom.createDom("p", {
      "class" : "help-block",
      style : 'word-wrap:break-word;'
   });
   this.editUsers = goog.dom.createDom("input", {
      type : 'text',
      style : "width:430px;margin-right:0px"
   });
   this.editHelp = goog.dom.createDom("span", {
      'class' : 'help-block'
   });

   // Add all user area parts to body
   body.appendChild(goog.dom.createDom("p", {
      "class" : "help-block"
   }, "Type a username, and then hit shift+enter to add that user to your project."));
   body.appendChild(goog.dom.createDom("label", {
      style : 'display:inline-block;width:80px'
   }, "Add Users:"));
   body.appendChild(this.editUsers);
   body.appendChild(this.editHelp);
   body.appendChild(this.editAddedUsers);

   var footer = goog.dom.createDom("div", {
      'class' : 'modal-footer'
   });

   // Cancel -- does not remove data from modal
   var cancelButton = goog.dom.createDom("a", {
      'href' : '#editProjectModal',
      'class' : 'btn',
      'data-toggle' : 'modal'
   }, "Discard Changes");
   jQuery(cancelButton).click( function(event) {
      this.prepareForEdit();
   }.bind(this));
   footer.appendChild(cancelButton);

   // Create -- default button -- creates new project
   var saveButton = goog.dom.createDom('a', {
      'href' : '#editProjectModal',
      'class' : 'btn btn-primary',
      'data-toggle' : 'modal'
   }, "Save Changes");
   $(saveButton).click( function(event) {
      this.sendEditData();
   }.bind(this));
   footer.appendChild(saveButton);

   // Add to modal
   modal.appendChild(header);
   modal.appendChild(body);
   modal.appendChild(footer);

   // Add to window
   this.windowBody.appendChild(modal);

   // Add action listener for user 'tagging' system
   this.editUserTagSystem();

   return modal;
};

/* Gathers all of the relevant data about the current project and supplies it to the
 *  edit project modal
 * Called on switch to new project so that the modal is always prepared
 */
dm.ProjectManager.prototype.prepareForEdit = function() {
   // Ensure there is a current project; currently no project selected on load
   var project = this.databroker.currentProject;
   if (project) {
      this.databroker.getDeferredResource(project).done( function(projectResource) {
         // Display title
         var title = $("#" + this.editTitleId);
         title.val(projectResource.getOneProperty('dc:title'));

         // Display description
         var description = $("#" + this.editDescriptionId);
         description.val(projectResource.getOneProperty('dcterms:description'));
         var wrap = dm.data.Term.wrapUri;
         var strip = dm.data.Term.unwrapUri;

         this.editAddedUsersList = [];

         // Add the correct users to the modal/global data
         var url = this.databroker.syncService.restUrl(null, dm.data.SyncService.RESTYPE.user);
         this.databroker.getDeferredResource(url).done( function() {
            users = this.databroker.quadStore.subjectsMatchingQuery(null, this.databroker.namespaces.expand("perm", "hasPermissionOver"), wrap(project));

            // Remove all users that were sitting in the modal/global data
            $(this.editAddedUsers).empty();

            for (var i = 0; i < users.length; i++) {
               var url = strip(users[i]);
               var username = url.split("/").pop();

               this.editAddedUsersList.push(username);

               if (username == this.username) {
                  var user = goog.dom.createDom("span", {
                     id : username
                  }, username, "\xa0 \xa0");
                  this.editAddedUsers.appendChild(user);
               } else {
                  var clearButton = goog.dom.createDom('span', {
                     'title' : 'Remove ' + username + ' from the project',
                     'style' : 'cursor: pointer;'
                  }, '\u2715');
                  var user = goog.dom.createDom("span", {
                     id : username
                  }, username, clearButton, "\xa0 \xa0");
                  jQuery(clearButton).click( function(event) {
                     this.clearEditUser(username);
                     jQuery(user).detach();
                  }.bind(this));
                  this.editAddedUsers.appendChild(user);
               }
            };
         }.bind(this));

      }.bind(this));

   }
};

/* Collects data from edit project modal
 * Always replaces data
 * * Checks to see if users have been removed from the project before setting permissions
 * Updates using resource set property method
 */
dm.ProjectManager.prototype.sendEditData = function() {
   //Collect data
   var t = $("#" + this.editTitleId), d = $("#" + this.editDescriptionId);

   if (t.val() != "") {
      var projectId = this.databroker.currentProject;
      var resource = this.databroker.getResource(projectId);
      var qwrap = dm.data.Term.wrapLiteral;
      var wrap = dm.data.Term.wrapUri;
      var strip = dm.data.Term.unwrapUri;
      var ns = this.databroker.namespaces;

      // Set the new values of title & description
      resource.setProperty('dc:title', qwrap(t.val()));
      resource.setProperty('dcterms:description', qwrap(d.val()));

      var url = this.databroker.syncService.restUrl(null, dm.data.SyncService.RESTYPE.user);
      var oldUsers = [];

      // Get data on all users and projects they own
      this.databroker.getDeferredResource(url).done( function() {
         // Get all users with proper permissions on project prior to edit
         var query = this.databroker.quadStore.subjectsMatchingQuery(null, ns.expand("perm", "hasPermissionOver"), wrap(projectId));

         for (var i = 0; i < query.length; i++) {
            // Separate the username from the (bracketed) url
            var url = strip(query[i]);
            var username = url.split("/").pop();

            // Add username to list of users with permission prior to edit
            oldUsers.push(username);
         };

         // Compare list of new users to old users
         for (var i = 0; i < oldUsers.length; i++) {
            var username = oldUsers[i];
            var stillHasPermission = false;
            var newUsers = this.editAddedUsersList;

            for (var j = 0; j < newUsers.length; j++) {
               if (newUsers[j] == username)
                  stillHasPermission = true;
            };

            // Remove permissions if the user has been removed
            if (!stillHasPermission) {
               var uri = this.databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, username, null);
               var r = this.databroker.getResource(wrap(uri));

               r.deleteProperty(ns.expand('perm', 'hasPermissionOver'), wrap(projectId));
            }
         };

         // Set permissions for all users who are a part of the project
         for (var i = 0; i < this.editAddedUsersList.length; i++) {
            var username = this.editAddedUsersList[i];
            var uri = this.databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, username, null);

            var r = this.databroker.getResource(wrap(uri));

            r.addProperty(ns.expand('perm', 'hasPermissionOver'), wrap(projectId));
            r.setProperty(ns.expand('rdf', 'type'), ns.expand('foaf', 'Agent'));
         };
      }.bind(this));

      this.setTitle();
      this.addAllUserProjects();

   } else {
      alert("Your project needs a title.");
   }
};

dm.ProjectManager.prototype.isValidUser = function(username, handler) {
   $.ajax({
      type : "GET",
      url : databroker.syncService.restUrl(null, dm.data.SyncService.RESTYPE.user, username, null),
      success : function() {
         handler(true);
      },
      error : function() {
         handler(false);
      }
   });
};
