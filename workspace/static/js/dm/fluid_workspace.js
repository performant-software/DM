goog.require("atb.ClientApp");
goog.require('atb.PassThroughLoginWebService');
goog.require('atb.viewer.Finder');
goog.require('atb.viewer.TextEditor');
goog.require('atb.viewer.AudioViewer');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.Uri');
goog.require('goog.net.Cookies');
goog.require('goog.Uri');
goog.require('atb.viewer.RepoBrowser');
goog.require('atb.widgets.WorkingResources');
goog.require('goog.ui.Dialog');

goog.require('atb.viewer.ViewerGrid');
goog.require('atb.viewer.ViewerContainer');

goog.require("sc.ProjectManager")


var clientApp = null;
var glasspane = null;
var workingResourcesViewer = null;
var repoBrowser = null;
var viewerGrid = null;
var cookies = null;



var setupWorkingResources = function (clientApp, username, wrContainerParent) {
    var databroker = clientApp.getDatabroker();

    workingResourcesViewer = new atb.widgets.WorkingResources(clientApp.getDatabroker());

    var wrContainer = jQuery('#workingResourcesModal .modal-body').get(0);

    jQuery('#my_resources_button').on('click', function(event) {
        workingResourcesViewer.refreshCurrentItems();
    });

    workingResourcesViewer.render(wrContainer);
    workingResourcesViewer.loadUser(username)

    workingResourcesViewer.addEventListener('openRequested', function(event) {
        if (event.resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
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
                url: '/store/resources/http://dms-data.stanford.edu/Repository',
                uri: 'http://dms-data.stanford.edu/Repository'
            },
            {
                title: 'Yale University',
                url: '/store/resources/http://manifests.ydc2.yale.edu/Repository',
                uri: 'http://manifests.ydc2.yale.edu/Repository'
            },
            {
                title: 'Shared-canvas.org Demos',
                url: '/store/resources/http://shared-canvas.org/Repository',
                uri: 'http://shared-canvas.org/Repository'
            }
        ],
        databroker: clientApp.getDatabroker(),
        showErrors: false
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

        databroker.addResourceToCurrentProject(resource);
        if (workingResourcesViewer) {
            workingResourcesViewer.loadManifest(databroker.currentProject);
        }
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
    databroker.dataModel.setTitle(textResource, 'Untitled text document');

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
        var uris = db.getResource(uri).getProperties('perm:hasPermissionOver');
        for (var i=0; i<uris.length; i++) {
            db.allProjects.push(uris[i]);
        }
        // Where we should check for "last worked on" triple
        /*if (uris.length == 1) {
            db.currentProject = uris[0];

            workingResourcesViewer.loadManifest(uris[0]);
        }*/

        goog.global.projectManager.addAllUserProjects(username)
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

function initWorkspace(wsURI, mediawsURI, wsSameOriginURI, username, styleRoot, staticUrl, usernames) {
    cookies = new goog.net.Cookies(window.document);
    /* The following method is copied from Django documentation
     * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
     * Necessary to avoid 403 error when posting data
    */
    var csrfSafeMethod = function(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    /* Part of csrf-token setup
     * Copied from Django documentation
     * Source: https://docs.djangoproject.com/en/1.4/ref/contrib/csrf/
    */
    jQuery.ajaxSetup({
        crossDomain: false,
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && goog.Uri.haveSameDomain(window.location.href, settings.url)) {
                xhr.setRequestHeader("X-CSRFToken", cookies.get("csrftoken"));
            }
        }
    });
    
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
    
    goog.global.projectManager = new sc.ProjectManager(databroker, $("#projectManagerButton").get(0),viewerGrid, workingResourcesViewer, $("body").get(0), username, usernames);

    setupWorkingResources(clientApp, username, wrContainerParent);
    setupRepoBrowser(clientApp, wrContainerParent);
    setupCurrentProject(clientApp, username);
}


var createCanvasViewer = function(uri) {
    var viewer = new atb.viewer.CanvasViewer(clientApp);
    viewer.setCanvasByUri(uri, null, null, null, null);
    return viewer;
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
     * Usernames assigned to project are stored in editAddedUsers
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

/* Saves changes to data
 * ((Waiting on Resource.setProperty to work properly, but correctly implemented))
*/
function updateEditedData(){
    //Easier reference to databroker
    var db = goog.global.databroker;

    //Collect data
    var t = $("#editTitle"), d = $("#editDescription");

    //Get UUID of current project
    var p = db.currentProject;

    if(t.val() != ""){
        var resource = db.getResource(p);
        var qwrap = sc.util.Namespaces.quoteWrap
        var wrap = sc.util.Namespaces.angleBracketWrap;
        var strip = sc.util.Namespaces.angleBracketStrip;
        var ns = db.namespaces;

        // Set the new values of title & description
        resource.setProperty('dc:title',qwrap(t.val()))
        resource.setProperty('dcterms:description',qwrap(d.val()))

        var url = db.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user);
        var oldUsers = []

        // Get data on all users and projects they own
        db.getDeferredResource(url).done(function(){
            // Get all users with proper permissions on project prior to edit
            var query = db.quadStore.subjectsMatchingQuery(null, ns.expand("perm","hasPermissionOver"),wrap(p))
            
            for (var i = 0; i < query.length; i++) {
                // Separate the username from the (bracketed) url
                var url = strip(query[i])                
                var username = url.split("/").pop()

                // Add username to list of users with permission prior to edit
                oldUsers.push(username)
            };
        })

        // Compare list of new users to old users
        for (var i = 0; i < oldUsers.length; i++) {
            var username = oldUsers[i]
            var stillHasPermission = false;

            for (var j = 0; j < editAddedUsers.length; j++) {
                if (editAddedUsers[j] == username) stillHasPermission = true;
            };

            if (!stillHasPermission){
                var r = db.getResource(wrap(username));
                r.deleteProperty(ns.expand('ore','aggregates'),wrap(p))
                r.deleteProperty(ns.expand('perm','hasPermissionOver'),wrap(p))
            }
        };

        for (var i = 0; i < editAddedUsers.length; i++) {
            var username = editAddedUsers[i]
            var uri = db.syncService.restUri(null, sc.data.SyncService.RESTYPE.user, username, null);

            var r = db.getResource(wrap(uri))
            r.setProperty(ns.expand('ore','aggregates'),wrap(p))
            r.setProperty(ns.expand('perm','hasPermissionOver'),wrap(p))
        };
    }

    else{
        alert("Your project needs a title.")

    }

}

function prepareForEdit(){
    var db = goog.global.databroker
    var project = db.currentProject;
    var ns = db.namespaces;
    var wrap = sc.util.Namespaces.angleBracketWrap
    var strip = sc.util.Namespaces.angleBracketStrip;

    editAddedUsers = [];
    $("#editAddedUsers").children().remove()

    db.getDeferredResource(project).done(function(resource){
        // Set title & description directly from resource
        $("#editTitle").val(resource.getOneProperty('dc:title'))
        $("#editDescription").val(resource.getOneProperty('dcterms:description'))

        var url = db.syncService.restUrl(null, sc.data.SyncService.RESTYPE.user);

        // Get data on all users and projects they own
        db.getDeferredResource(url).done(function(){
            // Get all users with proper permissions on project
            var query = db.quadStore.subjectsMatchingQuery(null, ns.expand("perm","hasPermissionOver"),wrap(project))
            
            for (var i = 0; i < query.length; i++) {
                // Separate the username from the (bracketed) url
                var url = strip(query[i])                
                var username = url.split("/").pop()
                
                // Add username to list of added users & to tag system
                editAddedUsers.push(username);
                $("#editAddedUsers").append('<a onClick="editRemoveUser(this)" id="' + username + '">' + username + "&nbsp;&nbsp;&nbsp;</a>");
            };
        })
    })
}
