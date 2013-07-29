goog.provide("sc.ProjectManager")

goog.require("goog.dom")
goog.require("sc.util.Namespaces")

/**
 * @author lmoss1@drew.edu (Lucy Moss)
 * Creates two modals and a project select dropdown menu
 * Handles the manipulation of all data related to projects
 * * Switching projects by selecting the title in a dropdown menu
 * * Editing projects by clicking on the button for the current project
 * * Creating projects by selecting the "Create New Project" link in dropdown
 */
sc.ProjectManager = function(databroker, buttonElement, viewerGrid, workingResources, body, username){
    // Supplied data
    this.databroker = databroker;
    this.buttonElement = buttonElement;
    this.viewerGrid = viewerGrid;
    this.workingResources = workingResources;
    this.windowBody = body
    this.username = username;

    // Span tags tags for the current project button
    this.projectSpan = goog.dom.createDom("span", {style:'color:#666;'},"project: ")
    this.titleSpan = goog.dom.createDom("span", {style:'color:#999;'}, ' (none)')
    this.tempTitleSpan = goog.dom.createDom("span", {style:'color:#999'}, "loading...")

    // Variables needed for user tagging system
    this.newAddedUsersList = [username,];
    this.editAddedUsersList = [];
    this.shift = false;

    /* When using $(domElement), $().val() doesn't work -- necessary for these items,
     * so we define random, instance-specific ids for each of these items
    */
    this.newTitleId = goog.string.getRandomString()
    this.newDescriptionId = goog.string.getRandomString()
    this.editTitleId = goog.string.getRandomString()
    this.editDescriptionId = goog.string.getRandomString()

    // General setup/preparation methods
    this.decorate();
    this.setupPost();
}

/* Creates visual elements of project manipulation
 * * Creates the button/dropdown within the supplied element
 * * Creates the edit/create modals
 * Also sets current project (to last work on) [once implemented]
*/
sc.ProjectManager.prototype.decorate = function() {
    // Create button group
    this.createButtons()

    // Create the two modals
    this.createNewProjectModal()
    this.createEditProjectModal()

    // Set default project
    this.setTitle(true)
}

/* Creates the button group for the toolbar
 * * Creates "current project" button
 * * Creates dropdown toggle button
 * * Creates dropdown menu with no data in it (generated elsewhere)
*/
sc.ProjectManager.prototype.createButtons = function(){
    // Short, jQuery reference to element
    var div = $(this.buttonElement)

    // Add necessary class
    div.addClass("btn-group")

    // Create 'global' variable for the dropdown
    this.dropdownMenu = goog.dom.createDom("ul",{"class":"dropdown-menu"})
    // Create 'global' variable for the button for current project (toggles edit modal)
    this.titleButton = goog.dom.createDom("a", {href:'#editProjectModal',"class":"btn btn-inverse",'data-toggle':'modal',style:"display:inline-block;padding: 6px;margin-bottom: 3px;"})

    // Create local (static) variables to fold into buttonElement
    var dropdownToggle = goog.dom.createDom("button", {"class":"btn dropdown-toggle btn-inverse", "data-toggle":"dropdown",style:"display:inline-block;padding: 6px;margin-bottom: 3px;"})
    var caret = goog.dom.createDom("span", {"class":"caret", style:'border-bottom-color:#999; border-top-color:#999;'})
    var newProjectSelect = goog.dom.createDom("li")

    // Fold children into static data
    newProjectSelect.appendChild(goog.dom.createDom("a",{href:'#newProjectModal',role:'button', 'data-toggle':'modal'}, "Create New Project"))
    dropdownToggle.appendChild(caret)

    // Fold static data into dropdown menu
    this.dropdownMenu.appendChild(newProjectSelect)
    this.dropdownMenu.appendChild(goog.dom.createDom("li", {"class":"divider"}))

    // Add buttons to element
    div.append(this.titleButton)
    div.append(dropdownToggle)
    div.append(this.dropdownMenu)    
}

/* Set the title in the current project button
 * todo: Once last used project is defined, that info should be read/manipulated here
 */
sc.ProjectManager.prototype.setTitle = function(useDeferredResource){
    // Get current project
    var projectId = this.databroker.currentProject

    if (!(projectId)){
        console.warn("There is no currently selected project.")

        this.titleButton.appendChild(this.projectSpan)
        this.titleButton.appendChild(this.titleSpan)
    }
    else{
        if (useDeferredResource){
            this.titleButton.removeChild(this.titleSpan)
            this.titleButton.appendChild(this.tempTitleSpan)
            
            this.databroker.getDeferredResource(projectId).done(function(resource){
                var title = resource.getOneProperty('dc:title')
                this.titleSpan = goog.dom.createDom("span", {style:'color:#999'}, title)
                this.titleButton.removeChild(this.tempTitleSpan)
    
                this.titleButton.appendChild(this.projectSpan)
                this.titleButton.appendChild(this.titleSpan)
    
            }.bind(this))

            /* Add the data about the current project to the edit modal
             * This properly sources the data every time a new project is selected
            */
            this.prepareForEdit()
        }
        // Only to be used with the edit modal
        else{
            this.titleButton.removeChild(this.titleSpan)
            resource = this.databroker.getResource(projectId)

            var title = resource.getOneProperty('dc:title')
            this.titleSpan = goog.dom.createDom("span", {style:'color:#999'}, title)

            this.titleButton.appendChild(this.projectSpan)
            this.titleButton.appendChild(this.titleSpan)
        }
    }
}

/* Adds a project's title to the dropdown menu
 * When the title is clicked on, switches to that project
 * Used when the full list of projects is populated on initial load
*/
sc.ProjectManager.prototype.addOneProject = function(uri, useDeferredResource){
    if (useDeferredResource){
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
    else{
        resource = this.databroker.getResource(uri)
        title = resource.getOneProperty('dc:title')
        var projectLink = goog.dom.createDom("a",{id:uri},title)
        // onClick refuses to be set when passed into above function
        projectLink.setAttribute('onclick','projectManager.selectProject(this)')

        var li = goog.dom.createDom('li')
        li.appendChild(projectLink)
        $(this.dropdownMenu).append(li)
    }
}

/* The function utilized when a new project is created
 * Adds the project to the dropdown menu listing project titles, also selects the
 *  project as the current project
 * Functions independently of addOneProject because other methods rely on the full link
 *  element, and returning the link element in addOneProject is causing difficulties
*/
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

/* Gathers all projects over which the current user has permissions and adds them to the
 *  dropdown listing project titles
 * Called on initial page load (in fluid_workspace.js), but can be called at any time to
 *  completely update the list of projects in the dropdown
*/
sc.ProjectManager.prototype.addAllUserProjects = function(user, useDeferredResource){
    username = user || this.username
    var userUri = databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);
    var projects = this.databroker.getResource(userUri).getProperties('perm:hasPermissionOver')

    $(this.dropdownMenu).empty()
    
    for (var i = 0; i < projects.length; i++) {
        this.addOneProject(projects[i], useDeferredResource)
    };
}


/* Switches between projects, which are labeled with the title
 * Set as onClick property of each link that has a project's title
 * * That element has the uri of the project with the displayed title as its id
 * Confirms that switching projects will close all resources
 * When current project is selected, prompts to reload the current project
*/
sc.ProjectManager.prototype.selectProject = function(e){
    // If no open resources, does not need to warn about closing them!
    if (this.viewerGrid.isEmpty()){
        this.selectThisProject(e.id)
    }

    else{
        // Prompts to reload current project when it is selected
        if (this.databroker.currentProject == e.id){
            if(confirm("You have selected the current project!\nWould you like to reload it? Doing so will close all resources.")){
                this.selectThisProject(e.id)
            }
        } 

        // Warns that changing projects closes all resources
        else if (confirm("Selecting a new project will close all resources.\nIs this OK?")){
            this.selectThisProject(e.id)
        }
    }
}

/* Selects the project supplied by an element
 * A valid uri is supplied
 * Once a way to save the layout is configured, we would save that here
*/
sc.ProjectManager.prototype.selectThisProject = function(uri){  
    // Load new project
    this.viewerGrid.closeAllContainers()
    this.databroker.setCurrentProject(uri)
    this.setTitle(true)
    this.workingResources.loadManifest(uri)

    // Set last opened project
    var wrap = sc.util.Namespaces.angleBracketWrap
    var userUri = databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, this.username, null);
    var pred = this.databroker.namespaces.expand("dm", "lastOpenProject")
    this.databroker.getResource(userUri).setProperty(pred, wrap(uri))

    this.prepareForEdit()
}

/* Creates the modal which handles new project creation
 * Elements which are manipulated by the user are declared globally
*/
sc.ProjectManager.prototype.createNewProjectModal = function(){
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
    saveButton.setAttribute('onclick','projectManager.sendNewDataFromModal()')
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

sc.ProjectManager.prototype.sendNewDataFromModal = function(){
    //Collect data
    var t = $("#" + this.newTitleId), d = $("#" + this.newDescriptionId);

    if (t.val()){
        this.sendNewData(t.val(), d.val(), this.newAddedUsersList)

        //Clear data from modal ("reset" modal)
        t.val("");
        d.val("");
        $(this.newAddedUsers).empty()
        this.newAddedUsersList = [this.username,]

    }
    else{
        alert("Your project needs a title.")
    }

}

/* Collects data from new project modal
 * Clears the data so that another project can be created without refresh
 * Serializes data and sends POST request to /semantic_store/projects/
*/
sc.ProjectManager.prototype.sendNewData = function (title, description, users){
    //Create UUID for new project
    var p = this.databroker.createUuid();

    var data = $.rdf.databank([], { namespaces: {
                                    ore: "http://www.openarchives.org/ore/terms/", 
                                    dc: "http://purl.org/dc/elements/1.1/", 
                                    dcterms: "http://purl.org/dc/terms/",
                                    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
                                    dcmitype: "http://purl.org/dc/dcmitype/",
                                    perm: 'http://vocab.ox.ac.uk/perm#',
                                    dm: 'http://dm.drew.edu/ns/',
                                    foaf: 'http://xmlns.com/foaf/0.1/',
                                    }
                                  });
    
    //Link user(s) and project
    for (var i = 0; i < users.length; i++) {
        var u = this.databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, users[i], null);
        data.add("<" + u + "> perm:hasPermissionOver <" + p + ">");
        data.add("<" + u + "> rdf:type foaf:Agent")
    };

    //Give project title
    data.add('<' + p + '> dc:title "' + title + '"');

    //Give project description if supplied
    if (description){
        data.add('<' + p + '> dcterms:description "' + description +'"')
    }

    //Set types on project
    data.add('<' + p + '> rdf:type dcmitype:Collection');
    data.add('<' + p + '> rdf:type ore:Aggregation');
    data.add('<' + p + '> rdf:type dm:Project')

    var postdata = data.dump({format: 'application/rdf+xml', 
                              serialize:true});
    console.log("data:", postdata);

    $.post('project_forward/', postdata);

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

    userElement.remove()
}

/* Function which removes a user supplied in the new project modal
 * Although a simple function, must be declared so it can be set as onClick property of
 *  usernames in the 'tagging' system for the new project modal.
 */
sc.ProjectManager.prototype.clearNewUser = function(userElement){
    this.clearUser(userElement, this.newAddedUsersList)
}

/* Function which removes a user supplied in the edit project modal
 * Although a simple function, must be declared so it can be set as onClick property of
 *  usernames in the 'tagging' system for the edit project modal.
 * Also ensure the current user is always a part of a project
 */
sc.ProjectManager.prototype.clearEditUser = function(userElement){
    if (userElement.id == this.username){
        $(this.editHelp).text("You cannot delete yourself from a project.")
    }
    else{
        this.clearUser(userElement, this.editAddedUsersList)
    }
}

/* Appends username from input field into corresponding paragraph (creation modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
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

            this.isValidUser(val)
            // Wrapped in timeout bc the error code isn't breaking things the way I want
            setTimeout(function(){
                if (this.isValid){
                    if (this.newAddedUsersList.indexOf(val) == -1){
                        // "\xa0" is non-breaking whitespace for this library
                        var user = goog.dom.createDom("a",{id:val},val + "\xa0 \xa0")
                        // onClick refuses to be set when passed into above function
                        user.setAttribute('onclick','projectManager.clearNewUser(this)')
                        this.newAddedUsers.appendChild(user)
                        this.newAddedUsersList.push(val);

                        $(this.newUsers).val("")
                    }
                    else{
                        $(this.newHelp).text("This user is already added to the project.");
                    }
                }
                else{
                    $(this.newHelp).text("This is not a valid user.");
                }
            }.bind(this), 75)
        }
        else if (e.which == 16) this.shift = false;
    }.bind(this))
}

/* Appends username from input field into corresponding paragraph (edit modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
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

            this.isValidUser(val)

            // Wrapped in timeout bc the error code isn't breaking things the way I want
            setTimeout(function(){
                if (this.isValid){
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
            }.bind(this), 75)
        }
        else if (e.which == 16) this.shift = false;
    }.bind(this))
}

/* Creates the modal which handles new project creation
 * Elements which are manipulated by the user are declared globally
*/
sc.ProjectManager.prototype.createEditProjectModal = function(){
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

/* Gathers all of the relevant data about the current project and supplies it to the
 *  edit project modal
 * Called on switch to new project so that the modal is always prepared
*/
sc.ProjectManager.prototype.prepareForEdit = function(){
    // Ensure there is a current project; currently no project selected on load
    var project = this.databroker.currentProject
    if (project){
        this.databroker.getDeferredResource(project).done(function(projectResource){
            // Display title
            var title = $("#" + this.editTitleId)
            title.val(projectResource.getOneProperty('dc:title'))
            
            // Display description
            var description = $("#" + this.editDescriptionId)
            description.val(projectResource.getOneProperty('dcterms:description'))
            var wrap = sc.util.Namespaces.angleBracketWrap
            var strip = sc.util.Namespaces.angleBracketStrip

            

            this.editAddedUsersList = []

            // Add the correct users to the modal/global data
            var url = this.databroker.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user);
            this.databroker.getDeferredResource(url).done(function(){
                users = this.databroker.quadStore.subjectsMatchingQuery(null,this.databroker.namespaces.expand("perm","hasPermissionOver"),wrap(project))

                // Remove all users that were sitting in the modal/global data
                $(this.editAddedUsers).empty()

                for (var i = 0; i < users.length; i++) {
                    var url = strip(users[i])
                    var username = url.split("/").pop()
                    // console.log(element.get(0))


                    this.editAddedUsersList.push(username);

                    var user = goog.dom.createDom("a",{id:username},username + "\xa0 \xa0")
                    // onClick refuses to be set when passed into above function
                    user.setAttribute('onclick','projectManager.clearEditUser(this)')

                    this.editAddedUsers.appendChild(user)
                };
            }.bind(this))

        }.bind(this))

        
    }
}

/* Collects data from edit project modal
 * Always replaces data
 * * Checks to see if users have been removed from the project before setting permissions
 * Updates using resource set property method
*/
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
                var newUsers = this.editAddedUsersList

                for (var j = 0; j < newUsers.length; j++) {
                    if (newUsers[j] == username) stillHasPermission = true;
                };

                // Remove permissions if the user has been removed
                if (!stillHasPermission){
                    var uri = this.databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);
                    var r = this.databroker.getResource(wrap(uri));

                    r.deleteProperty(ns.expand('perm','hasPermissionOver'),wrap(projectId))
                }
            };

            // Set permissions for all users who are a part of the project
            for (var i = 0; i < this.editAddedUsersList.length; i++) {
                var username = this.editAddedUsersList[i]
                var uri = this.databroker.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);

                var r = this.databroker.getResource(wrap(uri))

                r.addProperty(ns.expand('perm','hasPermissionOver'),wrap(projectId))
                r.setProperty(ns.expand('rdf','type'), ns.expand('foaf','Agent'))
            };
        }.bind(this))

        this.setTitle()
        this.addAllUserProjects()
        
    }

    else{
        alert("Your project needs a title.")

    }
}

sc.ProjectManager.prototype.isValidUser = function(username){
    this.isValid = true;
    var url = databroker.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user, username, null)

    $.ajax({
        type: "GET",
        url: url,
        statusCode: {
            404: function(){
                this.isValid = false
            }.bind(this)
        }
    })

    // return this.isValid

    
}