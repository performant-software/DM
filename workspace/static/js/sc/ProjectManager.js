goog.provide("sc.ProjectManager")

goog.require("goog.dom")
goog.require("sc.util.Namespaces")


sc.ProjectManager = function(databroker, buttonElement, viewerGrid, workingResources, body, username, allUsers){
	this.databroker = databroker;
	this.buttonElement = buttonElement;
	this.viewerGrid = viewerGrid;
	this.workingResources = workingResources;
	this.windowBody = body
	this.username = username;
	this.allUsers = allUsers

	this.projectSpan = goog.dom.createDom("span", {style:'color:#666;'},"project: ")
	this.titleSpan = goog.dom.createDom("span", {style:'color:#999;'}, ' (none)')

	this.newAddedUsersList = [username,];
	this.editAddedUsersList = [];
	this.shift = false;
	this.newTitleId = goog.string.getRandomString()
	this.newDescriptionId = goog.string.getRandomString()
	this.editTitleId = goog.string.getRandomString()
	this.editDescriptionId = goog.string.getRandomString()

	this.decorate();
	this.setupPost();

	this.createNewProjectModal()
	this.createEditProjectModal()
}

sc.ProjectManager.prototype.decorate = function() {
	var div = $(this.buttonElement)

	this.dropdownMenu = goog.dom.createDom("ul",{"class":"dropdown-menu"})
	this.titleButton = goog.dom.createDom("a", {href:'#editProjectModal',"class":"btn btn-inverse",'data-toggle':'modal',style:"display:inline-block;padding: 6px;margin-bottom: 3px;"})

	var dropdownToggle = goog.dom.createDom("button", {"class":"btn dropdown-toggle btn-inverse", "data-toggle":"dropdown",style:"display:inline-block;padding: 6px;margin-bottom: 3px;"})
	var caret = goog.dom.createDom("span", {"class":"caret", style:'border-bottom-color:#999; border-top-color:#999;'})
	var newProjectSelect = goog.dom.createDom("li")
	newProjectSelect.appendChild(goog.dom.createDom("a",{href:'#newProjectModal',role:'button', 'data-toggle':'modal'}, "Create New Project"))

	dropdownToggle.appendChild(caret)

	this.dropdownMenu.appendChild(newProjectSelect)
	this.dropdownMenu.appendChild(goog.dom.createDom("li", {"class":"divider"}))

	div.addClass("btn-group")

	div.append(this.titleButton)
	div.append(dropdownToggle)
	div.append(this.dropdownMenu)

	this.setTitle()
}

sc.ProjectManager.prototype.setTitle = function(title){
	if (title != null){
		this.titleButton.removeChild(this.titleSpan)
		this.titleSpan = goog.dom.createDom("span", {'style':'color:#999'}, title)
	}

	this.titleButton.appendChild(this.projectSpan)
	this.titleButton.appendChild(this.titleSpan)

	this.prepareForEdit()
}

sc.ProjectManager.prototype.getUserProjects = function(user){
	var projects = this.databroker.getResource(user).getProperties('perm:hasPermissionOver')

	return projects
}

sc.ProjectManager.prototype.updateProjectList = function(projectUris){
	for (var i = 0; i < projectUris.length; i++) {
		this.addOneProject(projectUris[i])
	};
}

sc.ProjectManager.prototype.addOneProject = function(uri){
	this.databroker.getDeferredResource(uri).done(function (resource){
		title = resource.getOneProperty('dc:title')
		var projectLink = goog.dom.createDom("a",{id:uri},title)
		// onClick refuses to be set when passed into above function
		projectLink.setAttribute('onclick','projectManager.selectProject(this)')
		var li = goog.dom.createDom('li')
		li.appendChild(projectLink)
		$(this.dropdownMenu).append(li)
	}.bind(this))
}

sc.ProjectManager.prototype.addAndSwitchToProject = function(uri){
	this.databroker.getDeferredResource(uri).done(function(resource){
		title = resource.getOneProperty('dc:title')
		var projectLink = goog.dom.createDom("a",{id:uri},title)
		// onClick refuses to be set when passed into above function
		projectLink.setAttribute('onClick','projectManager.selectProject(this)')

		var li = goog.dom.createDom("li")
		li.appendChild(projectLink)
		$(this.dropdownMenu).append(li)
		this.selectProject(projectLink)
	}.bind(this))
}

sc.ProjectManager.prototype.addAllUserProjects = function(username){
	this.clearProjectDropdown()
	var userUri = databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);

	this.updateProjectList(this.getUserProjects(userUri))
}

sc.ProjectManager.prototype.clearProjectDropdown = function(){
	$(this.buttonElement).empty()
	this.decorate()
}


/* Switches between projects, which are labeled with the title
 * Confirms that switching projects will close all resources
 * When current project is selected, prompts to reload the current project
*/
sc.ProjectManager.prototype.selectProject = function(e){
    // If no open resources, does not need to warn about closing them!
    /*if (this.viewerGrid.isEmpty()){
        this.setTitle($(e).text())
        this.databroker.setCurrentProject(e.id);
        this.workingResources.loadManifest(e.id);
    }

    else*/{
        // Prompts to reload current project when it is selected
        if (this.databroker.currentProject == e.id){
            if(confirm("You have selected the current project!\nWould you like to reload it? Doing so will close all resources.")){
                this.selectThisProject(e)
            }
        } 

        // Warns that changing projects closes all resources
        else if (confirm("Selecting a new project will close all resources.\nIs this OK?")){
            this.selectThisProject(e)
        }
    }
}

sc.ProjectManager.prototype.selectThisProject = function(e){
	this.databroker.setCurrentProject(e.id)
	this.setTitle($(e).text())
	this.workingResources.loadManifest(e.id)
}



sc.ProjectManager.prototype.createNewProjectModal = function(){
	// Multiple modals are being created; this removes all previously-created ones
	$("#newProjectModal").remove()

	var modal = goog.dom.createDom("div",{'class':'modal hide fade', id:'newProjectModal'})

	
	var header = goog.dom.createDom("div", {'class':'modal-header'})
	// Close "button" on top right of modal
	header.appendChild(goog.dom.createDom('a', {'class':'close', 'data-dismiss':'modal'}, "x"))
	// Header Text
	header.appendChild(goog.dom.createDom('h3', {}, 'New Project Creation'))


	var body = goog.dom.createDom("div", {'class':'modal-body'})

	// Title label & input box
	body.appendChild(goog.dom.createDom("label", {style:"display:inline-block;width:80px;"}, "Title:"))

	// Add custom (random) id to title input area because jQuery has a bug in .val()
	//  when accessed by $(this.newTitle)
	this.newTitle = goog.dom.createDom("input", {type:'text', style:"width:430px;margin-right:0px",id:this.newTitleId})
	body.appendChild(this.newTitle)

	// Description label, help text, & input
	body.appendChild(goog.dom.createDom("label",{style:"display:inline-block;width:80px;"},"Description:"))
	this.newDescription = goog.dom.createDom("textarea",{rows:2,style:"width:430px;margin-right:0px;",id:this.newDescriptionId})
	body.appendChild(this.newDescription)

	// Add a break for some visual clarity
	body.appendChild(goog.dom.createDom("br"))

	// User area -- dynamic data -- block for added users, input area
	this.newAddedUsers = goog.dom.createDom("p",{"class":"help-block", style:'word-wrap:break-word;'})
	this.newUsers = goog.dom.createDom("input",{type:'text',style:"width:430px;margin-right:0px"})
	this.newHelp = goog.dom.createDom("span",{'class':'help-block'})
	// Add all user area parts to body
	body.appendChild(goog.dom.createDom("p",{"class":"help-block"}, "Type a username, and then hit shift+enter to add that user to your project. If you want to remove a user, click on the username."))
	body.appendChild(goog.dom.createDom("label",{style:'display:inline-block;width:80px'},"Add Users:"))
	body.appendChild(this.newUsers)
	body.appendChild(this.newHelp)
	body.appendChild(this.newAddedUsers)


	var footer = goog.dom.createDom("div",{'class':'modal-footer'})
	// Cancel -- does not remove data from modal
	footer.appendChild(goog.dom.createDom("a",{href:'#newProjectModal','class':'btn','data-toggle':'modal'}, "Cancel"))
	// Create -- default button -- creates new project
	var saveButton = goog.dom.createDom('a',{href:'#newProjectModal','class':'btn btn-primary','data-toggle':'modal'},"Create New Project")
	// onClick refuses to be set when passed into above function
	saveButton.setAttribute('onclick','projectManager.sendNewData()')
	footer.appendChild(saveButton)

	// Add to modal
	modal.appendChild(header)
	modal.appendChild(body)
	modal.appendChild(footer)
	
	// Add to window
	this.windowBody.appendChild(modal)

	// Add action listener for user 'tagging' system
	this.newUserTagSystem()

	return modal
}


/* Collects data from new project modal
 * Clears the data so that another project can be created without refresh
 * Serializes data and sends POST request /workspace/project_forward/
*/
sc.ProjectManager.prototype.sendNewData = function (){
    //Collect data
    var t = $("#" + this.newTitleId), d = $("#" + this.newDescriptionId);
    
    var data = $.rdf.databank([], { namespaces: {
                                    ore: "http://www.openarchives.org/ore/terms/", 
                                    dc: "http://purl.org/dc/elements/1.1/", 
                                    dcterms: "http://purl.org/dc/terms/",
                                    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
                                    dcmitype: "http://purl.org/dc/dcmitype/",
                                    perm: 'http://vocab.ox.ac.uk/perm#',
                                    }
                                  });

    //Create UUID for new project
    var p = this.databroker.createUuid();
    if(t.val()){
        //Link user(s) and project
        for (var i = 0; i < this.newAddedUsersList.length; i++) {
            var u = this.databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, this.newAddedUsersList[i], null);
            data.add("<" + u + "> perm:hasPermissionOver <" + p + ">");
        };

        //Give project title
        data.add('<' + p + '> dc:title "' + t.val() + '"');

        //Give project description
        data.add('<' + p + '> dcterms:description "' + d.val() + '"');

        //Set types on project
        data.add('<' + p + '> rdf:type dcmitype:Collection');
        data.add('<' + p + '> rdf:type ore:Aggregation');

        var postdata = data.dump({format: 'application/rdf+xml', 
                                  serialize:true});
        console.log("data:", postdata);

        $.post('project_forward/', postdata);

        //Clear data from create project form
        t.val("");
        d.val("");
        this.clearAllUsers(this.newAddedUsers, this.newAddedUsersList)

	    // Add the new project's title to project dropdown
	    // Wrapped in timeout to avoid server errors from hitting database too quickly
	    setTimeout(function(){
	        var url = this.databroker.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user, this.username, null)
	        this.databroker.getDeferredResource(url).done(function(){
	        	this.addAndSwitchToProject(p)
	        }.bind(this));
	    }.bind(this),3000)

	    // Add the new project to the databroker as a valid project
	    goog.global.databroker.addNewProject(p)
    }

    else{
        alert("Your project needs a title.")

    }
}

/* This function is copied from the Django documentation (although I wrapped it in a fcn)
 * Necessary to avoid 403 errors when using $.ajax to POST data
 * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
*/
sc.ProjectManager.prototype.setupPost = function(){
	$.ajaxSetup({
	    crossDomain: false,
	    beforeSend: function(xhr, settings) {
	        if (!csrfSafeMethod(settings.type)) {
	            xhr.setRequestHeader("X-CSRFToken", 
	                                 getCookie("csrftoken"));
	        }
	    }
	});
	function getCookie(name) {
	    var cookieValue = null;
	    if (document.cookie && document.cookie != '') {
	        var cookies = document.cookie.split(';');
	        for (var i = 0; i < cookies.length; i++) {
	            var cookie = jQuery.trim(cookies[i]);
	            // Does this cookie string begin with the name we want?
	            if (cookie.substring(0, name.length + 1) == (name + '=')) {
	                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
	                break;
	            }
	        }
	    }
	    return cookieValue;
	};

	function csrfSafeMethod(method) {
	    // these HTTP methods do not require CSRF protection
	    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	}
}

/* Removes all specified users from specified array
 * Removes the "tags" for all users
*/
sc.ProjectManager.prototype.clearAllUsers = function(parentElement, userList){
	while (parentElement.lastChild){
		this.clearUser(parentElement.lastChild,userList)
	}
}

/* Removes the specified user from the speicified array of users
 * Removes the "tag" displaying the username
 * Used by both project edit & create modals, so functions independently of either
*/
sc.ProjectManager.prototype.clearUser = function(userElement, userList){
	for (var i = 0; i < userList.length; i++) {
		if (userList[i] == userElement.id) {
			userList.splice(i,1)
			break;
		}
	};
}

sc.ProjectManager.prototype.clearNewUser = function(userElement){
	this.clearUser(userElement, this.newAddedUsersList)
}

sc.ProjectManager.prototype.clearEditUser = function(userElement){
	console.log(userElement)
	if (userElement.id == this.username){
		$(this.editHelp).text("You cannot delete yourself from a project.")
	}
	else{
		this.clearUser(userElement, this.editAddedUsersList)
	}
}

sc.ProjectManager.prototype.userTagSystem = function(userElement, helpElement, isNew){
	usr = $(userElement)
    /* Ensures shift is down
     * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) this.shift = true;

        //Toggles off the "incorrect user" help text
        $(helpElement).text("");
    })


}


/* Appends username from input field into corresponding paragraph (creation modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * usernames: List of usernames in the database
 * * usernames is passed with an json dump in render_to_response
 * help: Label on which to place help text
 * added: Element on which to display added users
*/
sc.ProjectManager.prototype.newUserTagSystem = function(){
	usr = $(this.newUsers)
    /* Ensures shift is down
     * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) this.shift = true;

        //Toggles off the "incorrect user" help text
        $(this.newHelp).text("");
    }.bind(this))

    /* Script which adds users
     * Usernames assigned to project are stored in newAddedUsers
     * 'keyup' call ensures that the user has finished typing the username
     * Looks for Shift+Return combination ONLY
     * Checks for users already added
     * Rejects invalid usernames
     * ((Next Up: suggests usernames using typeahead))
    */
    usr.keyup(function(e){
        if (e.which == 13&&this.shift){
            var val = $(this.newUsers).val();
            console.log(val)
            
            if (this.allUsers.indexOf(val) != -1){
                if (this.newAddedUsersList.indexOf(val) == -1){
                    // "\xa0" is non-breaking whitespace for this library
                    var user = goog.dom.createDom("a",{id:val},val + "\xa0 \xa0")
                    // onClick refuses to be set when passed into above function
                    user.setAttribute('onclick','projectManager.clearNewUser(this)')
                    this.newAddedUsers.appendChild(user)
                    this.newAddedUsersList.push(val);

                    usr.val("");
                }
                else{
                    $(this.newHelp).text("This user is already added to the project.");
                }
            }
            else{
                $(this.newHelp).text("This is not a valid user.");
            }
        }
        else if (e.which == 16) this.shift = false;
    }.bind(this))
}

/* Appends username from input field into corresponding paragraph (creation modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * usernames: List of usernames in the database
 * * usernames is passed with an json dump in render_to_response
 * help: Label on which to place help text
 * added: Element on which to display added users
*/
sc.ProjectManager.prototype.editUserTagSystem = function(){
	usr = $(this.editUsers)
    /* Ensures shift is down
     * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) this.shift = true;

        //Toggles off the "incorrect user" help text
        $(this.editHelp).text("");
    }.bind(this))

    /* Script which adds users
     * Usernames assigned to project are stored in newAddedUsers
     * 'keyup' call ensures that the user has finished typing the username
     * Looks for Shift+Return combination ONLY
     * Checks for users already added
     * Rejects invalid usernames
     * ((Next Up: suggests usernames using typeahead))
    */
    usr.keyup(function(e){
        if (e.which == 13&&this.shift){
            var val = usr.val();
            
            if (this.allUsers.indexOf(val) != -1){
                if (this.editAddedUsersList.indexOf(val) == -1){
                    // "\xa0" is non-breaking whitespace for this library
                    var user = goog.dom.createDom("a",{id:usr.val()},usr.val() + "\xa0 \xa0")
                    // onClick refuses to be set when passed into above function
                    user.setAttribute('onclick','projectManager.clearEditUser(this)')
                    this.editAddedUsers.appendChild(user)
                    this.editAddedUsersList.push(val);

                    usr.val("");
                }
                else{
                    $(this.editHelp).text("This user is already added to the project.");
                }
            }
            else{
                $(this.editHelp).text("This is not a valid user.");
            }
        }
        else if (e.which == 16) this.shift = false;
    }.bind(this))
}

sc.ProjectManager.prototype.createEditProjectModal = function(){
	// Multiple modals are being created; this removes all previously-created ones
	$("#editProjectModal").remove()

	var modal = goog.dom.createDom("div",{"class":"modal hide fade",id:'editProjectModal'})


	var header = goog.dom.createDom("div",{'class':'modal-header'})
	// Close button
	header.appendChild(goog.dom.createDom("a",{'class':'close','data-dismiss':'modal'},"x"))
	header.appendChild(goog.dom.createDom("h3",{},"Edit Project:"))


	var body = goog.dom.createDom("div",{'class':'modal-body'})

	// Title area
	body.appendChild(goog.dom.createDom("label",{style:"display:inline-block;width:80px;"},"Title:"))
	this.editTitle = goog.dom.createDom("input",{style:"width:430px;margin-right:0px;",type:"text", id:this.editTitleId})
	body.appendChild(this.editTitle)

	// Description
	body.appendChild(goog.dom.createDom("label",{style:"display:inline-block;width:80px;"}, "Description:"))
	this.editDescription = goog.dom.createDom("textarea",{style:"width:430px;margin-right:0px;",rows:2,id:this.editDescriptionId})
	body.appendChild(this.editDescription)

	// User area -- dynamic data -- block for added users, input area
	this.editAddedUsers = goog.dom.createDom("p",{"class":"help-block", style:'word-wrap:break-word;'})
	this.editUsers = goog.dom.createDom("input",{type:'text',style:"width:430px;margin-right:0px"})
	this.editHelp = goog.dom.createDom("span",{'class':'help-block'})
	// Add all user area parts to body
	body.appendChild(goog.dom.createDom("p",{"class":"help-block"}, "Type a username, and then hit shift+enter to add that user to your project. If you want to remove a user, click on the username."))
	body.appendChild(goog.dom.createDom("label",{style:'display:inline-block;width:80px'},"Add Users:"))
	body.appendChild(this.editUsers)
	body.appendChild(this.editHelp)
	body.appendChild(this.editAddedUsers)


	var footer = goog.dom.createDom("div",{'class':'modal-footer'})
	// Cancel -- does not remove data from modal
	var cancelButton = goog.dom.createDom("a",{href:'#editProjectModal','class':'btn','data-toggle':'modal'}, "Discard Changes")
	// onClick refuses to be set when passed into above function
	cancelButton.setAttribute('onclick','projectManager.prepareForEdit()')
	footer.appendChild(cancelButton)
	// Create -- default button -- creates new project
	var saveButton = goog.dom.createDom('a',{href:'#editProjectModal','class':'btn btn-primary','data-toggle':'modal'},"Save Changes")
	// onClick refuses to be set when passed into above function
	saveButton.setAttribute('onclick','projectManager.sendEditData()')
	footer.appendChild(saveButton)

	// Add to modal
	modal.appendChild(header)
	modal.appendChild(body)
	modal.appendChild(footer)
	
	// Add to window
	this.windowBody.appendChild(modal)

	// Add action listener for user 'tagging' system
	this.editUserTagSystem()

	return modal
}

sc.ProjectManager.prototype.prepareForEdit = function(){
	var project = this.databroker.currentProject
	if (project){
		projectResource = this.databroker.getResource(project)
		var title = $("#" + this.editTitleId)
		title.val(projectResource.getOneProperty('dc:title'))
		
		var description = $("#" + this.editDescriptionId)
		description.val(projectResource.getOneProperty('dcterms:description'))
    	var wrap = sc.util.Namespaces.angleBracketWrap
    	var strip = sc.util.Namespaces.angleBracketStrip

		var element = $(this.editAddedUsers);
		element.empty()

		this.editAddedUsersList = []

		users = this.databroker.quadStore.subjectsMatchingQuery(null, this.databroker.namespaces.expand("perm","hasPermissionOver"),wrap(project))

		for (var i = 0; i < users.length; i++) {
			var url = strip(users[i])
            var username = url.split("/").pop()

			this.editAddedUsersList.push(username);

			var user = goog.dom.createDom("a",{id:username},username + "\xa0 \xa0")
            // onClick refuses to be set when passed into above function
            user.setAttribute('onclick','projectManager.clearEditUser(this)')

			this.editAddedUsers.appendChild(user)
		};
	}
}

sc.ProjectManager.prototype.sendEditData = function(){
    //Collect data
    var t = $("#" + this.editTitleId), d = $("#" + this.editDescriptionId);

    if(t.val() != ""){
    	var projectId = this.databroker.currentProject
        var resource = this.databroker.getResource(projectId)
        var qwrap = sc.util.Namespaces.quoteWrap
        var wrap = sc.util.Namespaces.angleBracketWrap;
        var strip = sc.util.Namespaces.angleBracketStrip;
        var ns = this.databroker.namespaces;

        // Set the new values of title & description
        resource.setProperty('dc:title',qwrap(t.val()))
        resource.setProperty('dcterms:description',qwrap(d.val()))

        var url = this.databroker.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user);
        var oldUsers = []

        // Get data on all users and projects they own
        this.databroker.getDeferredResource(url).done(function(){
            // Get all users with proper permissions on project prior to edit
            var query = this.databroker.quadStore.subjectsMatchingQuery(null, ns.expand("perm","hasPermissionOver"),wrap(projectId))
            
            for (var i = 0; i < query.length; i++) {
                // Separate the username from the (bracketed) url
                var url = strip(query[i])                
                var username = url.split("/").pop()

                // Add username to list of users with permission prior to edit
                oldUsers.push(username)
            };

	        // Compare list of new users to old users
	        for (var i = 0; i < oldUsers.length; i++) {
	            var username = oldUsers[i]
	            var stillHasPermission = false;

	            for (var j = 0; j < editAddedUsers.length; j++) {
	                if (editAddedUsers[j] == username) stillHasPermission = true;
	            };

	            if (!stillHasPermission){
	                var r = this.databroker.getResource(wrap(username));
	                r.deleteProperty(ns.expand('ore','aggregates'),wrap(projectId))
	                r.deleteProperty(ns.expand('perm','hasPermissionOver'),wrap(projectId))
	            }
	        };

	        for (var i = 0; i < editAddedUsers.length; i++) {
	            var username = editAddedUsers[i]
	            var uri = db.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);

	            var r = db.getResource(wrap(uri))
	            r.setProperty(ns.expand('ore','aggregates'),wrap(projectId))
	            r.setProperty(ns.expand('perm','hasPermissionOver'),wrap(projectId))
	        };
        }.bind(this))
    }

    else{
        alert("Your project needs a title.")

    }
}