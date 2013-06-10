goog.require("atb.ClientApp");
goog.require('atb.PassThroughLoginWebService');
goog.require('atb.viewer.Finder');
goog.require('atb.viewer.TextEditor');
goog.require('atb.viewer.AudioViewer');
goog.require('atb.ClientApp');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('atb.viewer.RepoBrowser');
goog.require('atb.widgets.WorkingResources');
goog.require('goog.ui.Dialog');

goog.require('atb.viewer.ViewerGrid');
goog.require('atb.viewer.ViewerContainer');


var clientApp = null;
var glasspane = null;
var workingResourcesViewer = null;
var repoBrowser = null;
var viewerGrid = null;

var setupWorkingResources = function (clientApp, username, wrContainerParent) {
    var databroker = clientApp.getDatabroker();

    workingResourcesViewer = new atb.widgets.WorkingResources(clientApp.getDatabroker());

    var wrContainer = jQuery('#workingResourcesModal .modal-body').get(0);

    workingResourcesViewer.render(wrContainer);
    workingResourcesViewer.loadUser(username);

    workingResourcesViewer.addEventListener('openRequested', function(event) {
        if (event.resource.hasAnyType(atb.viewer.RepoBrowser.RESOURCE_TYPES.canvases)) {
            openCanvas(event.uri, event.urisInOrder, event.currentIndex);
        }
    });

    return workingResourcesViewer;
};

var setupRepoBrowser = function(clientApp, wrContainerParent) {
    repoBrowser = new sc.RepoBrowser({
        repositories: [
            {
                title: 'Stanford University',
                // url: '/store/manifests/http://manifests.ydc2.yale.edu/Repository',
                url: '/store/resources/http://dms-data.stanford.edu/Repository3',
                uri: 'http://dms-data.stanford.edu/Repository3'
                // uri: 'http://manifests.ydc2.yale.edu/Repository'
            },
            {
                title: 'Yale University',
                // url: '/store/manifests/http://manifests.ydc2.yale.edu/Repository',
                url: '/store/resources/http://manifests.ydc2.yale.edu/Repository',
                uri: 'http://manifests.ydc2.yale.edu/Repository'
                // uri: 'http://manifests.ydc2.yale.edu/Repository'
            },
            {
                title: 'Shared-canvas.org Demos',
                url: '/store/resources/http://shared-canvas.org/Repository',
                uri: 'http://shared-canvas.org/Repository'
            }
        ],
        databroker: clientApp.getDatabroker()
    });

    repoBrowser.addEventListener('click', function(event) {
        var uri = event.uri;
        var resource = event.resource;

        if (resource.hasAnyType('dms:Canvas')) {
            var manifestUri = event.manifestUri;
            var urisInOrder = event.urisInOrder;
            var index = event.currentIndex;
            openCanvas(uri, urisInOrder, index);

            event.preventDefault();
        }
    });

    repoBrowser.addEventListener('add_request', function(event) {
        var resource = event.resource;
        var manuscriptResource = databroker.getResource(event.manifestUri); // If the added resource was a manuscript, then 
        // this will be the same as resource
        
        var manuscriptUri = manuscriptResource.getUri();

        console.log(resource.getSourceUrls(), manuscriptResource.getSourceUrls);
    });

    var repoBrowserContainer = jQuery('#repoBrowserModal .modal-body').get(0);
    repoBrowser.render(repoBrowserContainer);
};

var openCanvas = function(uri, urisInOrder, index) {
    var viewerContainer = new atb.viewer.ViewerContainer();
    var viewer = new atb.viewer.CanvasViewer(clientApp);
    viewerContainer.setViewer(viewer);
    viewerGrid.addViewerContainer(viewerContainer);
    viewer.setCanvasByUri(uri, null, null, urisInOrder, index);
};

var openBlankTextDocument = function() {
    var textResource = databroker.createResource(null, 'dctypes:Text');
    textResource.setProperty('dc:title', '"Untitled text document"');

    databroker.addResourceToCurrentProject(textResource);

    var viewerContainer = new atb.viewer.ViewerContainer();
    var viewer = new atb.viewer.TextEditor(clientApp);
    viewerGrid.addViewerContainer(viewerContainer);
    viewerContainer.setViewer(viewer);
    viewer.loadResourceByUri(textResource.uri);
};

var setupCurrentProject = function(clientApp, username) {
    var db = goog.global.databroker;
    var url = db.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user, username, null);
    var uri = db.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);
    db.fetchRdf(url, function() {
        var uris = db.dataModel.findAggregationContentsUris(uri);
        for (var i=0; i<uris.length; i++) {
            db.allProjects.push(uris[i]);
        }
        if (uris.length == 1) {
            db.currentProject = uris[0];

            workingResourcesViewer.loadManifest(uris[0]);
        }
    });
}

var GRID_BOTTOM_MARGIN = 20;
var GRID_LEFT_MARGIN = 20;
var GRID_RIGHT_MARGIN = 20;

var resizeViewerGrid = function() {
    var height = jQuery(window).height() - jQuery(viewerGrid.getElement()).offset().top - GRID_BOTTOM_MARGIN;
    var width = jQuery(window).width() - GRID_LEFT_MARGIN - GRID_RIGHT_MARGIN;

    viewerGrid.resize(width, height);
}

//TODO: kill the default content of the left/right panes probably and let the panels add the children of those tags themselves as they see fit, during their
//          tenure of their panelcontainer's tag...
//			maybe wrap them in another child tag that they "keep" owning and stops being a child when it moves...??

function initWorkspace(wsURI, mediawsURI, wsSameOriginURI, username, styleRoot, staticUrl) {
    goog.global.staticUrl = staticUrl;

    var markerEditor;
    var textEditor;
	goog.global.clientApp = new atb.ClientApp(
		new atb.PassThroughLoginWebService(wsURI, mediawsURI, wsSameOriginURI, username), 
        username,
        styleRoot
    );

    goog.global.databroker = clientApp.getDatabroker();

    goog.global.viewerGrid = new atb.viewer.ViewerGrid();
    viewerGrid.setDimensions(2,2);
    viewerGrid.render(goog.dom.getElement('grid'));

    clientApp.viewerGrid = goog.global.viewerGrid;

    resizeViewerGrid();
    jQuery(window).bind('resize', resizeViewerGrid);

    glasspane = goog.dom.createDom('div', {'class': 'frosted-glasspane'});
    jQuery(glasspane).hide();
    jQuery(document.body).prepend(glasspane);

    var wrContainerParent = goog.dom.createDom('div', {'class': 'working-resources-container-parent'});
    jQuery('#atb-footer-controls').prepend(wrContainerParent);

    setupWorkingResources(clientApp, username, wrContainerParent);
    setupRepoBrowser(clientApp, wrContainerParent);
    setupCurrentProject(clientApp, username);
    
}


var createCanvasViewer = function(uri) {
    var viewer = new atb.viewer.CanvasViewer(clientApp);
    viewer.setCanvasByUri(uri, null, null, null, null);
    return viewer;
}

/* Instantiate two variables with scope outside userTagSystem
 * Need to be accesibly by newRemoveUser as well
 * Instatiated here because they belong with the "tag system"
*/
var newAddedUsers = [];
var shift = false;

/* Appends username from input field into corresponding paragraph (creation modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * usernames: List of usernames in the database
 * * usernames is passed with an json dump in render_to_response
*/
function newUserTagSystem(usr, usernames){

    /* Ensures shift is down
     * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) shift = true;

        //Toggles off the "incorrect user" help text
        $("#newHelp").text("");
    })

    /* Script which adds users
     * Usernames assigned to project are stored in newAddedUsers
     * 'keyup' call ensures that the user has finished typing the username
     * Looks for Shift+Return combination ONLY
     * Checks for users already added
     * Rejects invalid usernames
     * ((Next Up: suggests usernames using typeahead))
    */
    usr.keyup(function(e){
        if (e.which == 13&&shift){
            var val = usr.val();
            
            if(val == clientApp.username){
                $("#newHelp").text("Your username is automatically added to the project.");
            }
            else{
                if (usernames.indexOf(val) != -1){
                    if (newAddedUsers.indexOf(val) == -1){
                        // "&nbsp" text allows 3 character widths between usernames
                        $("#newAddedUsers").append('<a onClick="newRemoveUser(this) id="' + usr.val() + '">'  + usr.val() + "&nbsp;&nbsp;&nbsp;</a>");
                        newAddedUsers.push(val);

                        usr.val("");
                    }
                    else{
                        $("#newHelp").text("You already added this user.");
                    }
                }
                else{
                    $("#newHelp").text("This is not a valid user.");
                }
            }
        }
        else if (e.which == 16) shift = false;
    })
}

/* Removes the user from the array of users in new project modal
 * Removes the "tag" displaying the username
 * e: html object - link with username as text
 * The user may be added again by re-typing the username
*/
function newRemoveUser(e){
    var u = e.id
    newAddedUsers.splice(newAddedUsers.indexOf(u) - 1, 1);
    e.remove();
}

/* Collects data from new project modal
 * Clears the data so that another project can be created without refresh
 * Serializes data and sends POST request /workspace/project_forward/
*/
function sendNewData(){
    //Add the current user to the project
    newAddedUsers.push(clientApp.username);

    //Easier reference to databroker
    var db = goog.global.databroker;

    //Collect data
    var t = $("#newTitle"), d = $("#newDescription");

    var data = $.rdf.databank([], { namespaces: {
                                    ore: "http://www.openarchives.org/ore/terms/", 
                                    dc: "http://purl.org/dc/elements/1.1/", 
                                    dcterms: "http://purl.org/dc/terms/",
                                    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
                                    dcmitype: "http://purl.org/dc/dcmitype/",
                                    }
                                  });

    //Create UUID for new project
    var p = db.createUuid();

    if(t.val() != ""){
        //Link user(s) and project
        for (var i = 0; i < newAddedUsers.length; i++) {
            var u = db.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, newAddedUsers[i], null);
            data.add("<" + u + "> ore:aggregates <" + p + ">");
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

        /* Part of csrf-token setup
         * Copied from Django documentation
         * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
        */
        $.ajaxSetup({
            crossDomain: false,
            beforeSend: function(xhr, settings) {
                if (!csrfSafeMethod(settings.type)) {
                    xhr.setRequestHeader("X-CSRFToken", 
                                         getCookie("csrftoken"));
                }
            }
        });
        
        $.post('project_forward/', postdata);

        //Clear data from create project form
        t.val("");
        d.val("");
        addedUsers = [];
        $("#newAddedUsers").text("");
    }

    else{
        alert("Your project needs a title.")

    }

    // Add the new project's title to project dropdown
    // Wrapped in timeout to avoid server errors from hitting database too quickly
    setTimeout(function(){
        var url = db.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user, clientApp.username, null)
        db.getDeferredResource(url).done(showProjectTitle(p));
    },3000)

    // Add the new project to the databroker as a valid project
    goog.global.databroker.addNewProject(p)
}

/* The following two methods are copied from Django documentation
 * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
 * Necessary to avoid 403 error when posting data
*/
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

/* Add project titles to "project" dropdown
 * Projects gathered by username
 * * At /store/users/<username> is rdf with all the projects belonging to a user,
 * *  and the url for more info ('ore:isDescribedBy')
*/
function showProjectTitles(username){
    // Variables used to shorten some references
    var db = goog.global.databroker;
    var wrap = sc.util.Namespaces.angleBracketWrap;

    // Get array of quads where subject is user's uri
    // (object will be uri of all projects owned by user)
    var userUri = db.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);
    var userProjects = db.quadStore.query(wrap(userUri), null, null, null);

    // Cycle through this array and add each project's title to dropdown
    for (var i = 0; i < userProjects.length; i++) {
        var project = userProjects[i]

        showProjectTitle(project.object)
    };
}

/* Add the title of a single project (with uri supplied) to the title dropdown
 * Abstracted from showProjectTitles so it can be called for just one new project
*/
function showProjectTitle(uri){
    var db = goog.global.databroker;
    var wrap = sc.util.Namespaces.angleBracketWrap;

    if (db.quadStore.numQuadsMatchingQuery(wrap(uri)) <= 1){
        setTimeout(function(){
            db.getDeferredResource(uri).done(function(resource){
                uri = sc.util.Namespaces.angleBracketStrip(uri)
                var title = resource.getOneProperty('dc:title')
                var projects = $("#projects");
                projects.append('<li><a onClick="selectProject(this)" id="' + uri + '">' + title + '</a></li>');
                sortChildrenAlphabetically(projects);
            })
        }, 1000)
    }
}

/* Sorts the children of a jQuery object in alphabetical order and replaces them
 *  in the original object
 * Can be used on any object but designed & tested for projects drop-down
 * Breaks if an object without children is passed
 * Uses custom sort method so as not to destroy the child & recreate when sorting
*/
function sortChildrenAlphabetically(parent){
    var childs = parent.children();
    
    /* Our drop-downs are currently structured to have text wrapped in <a> tags,
     *  so in order to get the actual text, we must call .firstChild.text instead
     *  of simply .text (no text is returned if we simply use .text)
     * This sorts the children in ascending alphabetical order based on the text
    */
    childs.sort(function(a,b){
        var str1=a.firstChild.text, str2=b.firstChild.text;

        return ((str1 == str2) ? 0 : ((str1 > str2) ? 1 : -1));
    })

    /* Remove all children (unordered) from parent and then adds them back in
     *  alphabetical order
     * This is inefficient, but only a small amount of data is being passed around
     *  at any given time, so it's not too bad
    */
    parent.empty()

    for(var i = 0; i < childs.length; i++){
        parent.append(childs[i])
    }

}

/* Ensures databroker has all information about the user's projects, and then adds
 *  each title to the projects dropdown menu in alphabetical order
*/
function setupProjects(){
    // Variables used to shorten some references
    var db = goog.global.databroker;
    var username = clientApp.username

    // Get address of information about current user
    var url = db.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user, username, null)

    // Ensure databroker is up-to-date on projects and then add all titles
    // Wrapped in timeout to avoid server errors from querying data too quickly
    setTimeout(function(){
        db.getDeferredResource(url).done(showProjectTitles(username))
    }, 3000)    
}

/* Switches between projects, which are labeled with the title
 * Confirms that switching projects will close all resources
 * When current project is selected, prompts to reload the current project
*/
function selectProject(e){
    // Simplify reference
    var db = goog.global.databroker

    // Skips checking on initial load (when there is no current project)
    if (db.currentProject){

        // Prompts to reload current project when it is selected
        if (db.currentProject == e.id){
            if(confirm("You have selected the current project!\nWould you like to reload it? Doing so will close all resources.")){
                db.setCurrentProject(e.id)
                workingResourcesViewer.loadManifest(e.id);
            }
        } 

        // Warns that changing projects closes all resources
        else if (confirm("Selecting a new project will close all resources.\nIs this OK?")){
            db.setCurrentProject(e.id);
            workingResourcesViewer.loadManifest(e.id);
        }
    }

    // Does not need to warn about closing resources when no resources are open!
    else{
        db.setCurrentProject(e.id);
        workingResourcesViewer.loadManifest(e.id);
    }
}

var editAddedUsers = [];

/* Appends username from input field into corresponding paragraph (edit modal)
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * usernames: List of usernames in the database
 * * usernames is passed with an json dump in render_to_response
*/
function editUserTagSystem(usr, usernames){

    /* Ensures shift is down
     * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) shift = true;

        //Toggles off the "incorrect user" help text
        $("#editHelp").text("");
    })

    /* Script which adds users to current project
     * Usernames assigned to project are stored in addedUsers
     * 'keyup' call ensures that the user has finished typing the username
     * Looks for Shift+Return combination ONLY
     * Checks for users already added
     * Rejects invalid usernames
     * ((Next Up: suggests usernames using typeahead))
    */
    usr.keyup(function(e){
        if (e.which == 13&&shift){
            var val = usr.val();

            if (usernames.indexOf(val) != -1){
                if (editAddedUsers.indexOf(val) == -1){
                    // "&nbsp" text allows 3 character widths between usernames
                    $("#editAddedUsers").append('<a onClick="editRemoveUser(this)" id="' + usr.val() + '">' + usr.val() + "&nbsp;&nbsp;&nbsp;</a>");
                    editAddedUsers.push(val);

                    usr.val("");
                }
                else{
                    $("#editHelp").text("You already added this user.");
                }
            }
            else{
                $("#editHelp").text("This is not a valid user.");
            }
        }
        else if (e.which == 16) shift = false;
    })
}

function editRemoveUser(e){
    var u = e.id;
    if (u==clientApp.username){
        $("#editHelp").text("You can't remove yourself from the project.")
    }
    else{
        editAddedUsers.splice(editAddedUsers.indexOf(u) - 1, 1);
        e.remove();
    }
}

function updateEditedData(){
    //Add the current user to the project
    newAddedUsers.push(clientApp.username);

    //Easier reference to databroker
    var db = goog.global.databroker;

    //Collect data
    var t = $("#editTitle"), d = $("#editDescription");

    var data = $.rdf.databank([], { namespaces: {
                                    ore: "http://www.openarchives.org/ore/terms/", 
                                    dc: "http://purl.org/dc/elements/1.1/", 
                                    dcterms: "http://purl.org/dc/terms/",
                                    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
                                    dcmitype: "http://purl.org/dc/dcmitype/",
                                    }
                                  });

    //Get UUID of current project
    var p = db.currentProject;

    if(t.val() != ""){
        //Link user(s) and project
        for (var i = 0; i < editAddedUsers.length; i++) {
            var u = db.restUri(null, db.RESTYPE.user, editAddedUsers[i], null);
            data.add("<" + u + "> ore:aggregates <" + p + ">");
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

        /* Part of csrf-token setup
         * Copied from Django documentation
         * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
        */
        $.ajaxSetup({
            crossDomain: false,
            beforeSend: function(xhr, settings) {
                if (!csrfSafeMethod(settings.type)) {
                    xhr.setRequestHeader("X-CSRFToken", 
                                         getCookie("csrftoken"));
                }
            }
        });
        
        $.post('update_project/', postdata);

        //Clear data from create project form
        t.val("");
        d.val("");
        addedUsers = [];
        $("#editAddedUsers").text("");
    }

    else{
        alert("Your project needs a title.")

    }
}

function prepareForEdit(){
    var db = goog.global.databroker
    var project = db.currentProject;
    var wrap = sc.util.Namespaces.angleBracketWrap;

    db.getDeferredResource(project).done(function(resource){
        var resources = db.quadStore.query(wrap(project))

        $("#editTitle").val(resource.getOneProperty('dc:title'))
        
        $("#editDescription").val(resource.getOneProperty('dcterms:description'))
    })
}
