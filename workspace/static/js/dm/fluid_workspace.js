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
    var db = clientApp.databroker;
    var url = db.restUrl(null, db.RESTYPE.user, username, null);
    var uri = db.restUri(null, db.RESTYPE.user, username, null);
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
 * Need to be accesibly by removeUser as well
 * Instatiated here because they belong with the "tag system"
*/
var addedUsers = [];
var shift = false;

/* Appends username from input field into corresponding paragraph
 * Multiple elements; each has a description preceding
 * usr: Username input field
 * usernames: List of usernames in the database
 * * usernames is passed with an json dump in render_to_response
 * * ((Is there a better way to send things from python to js?))
*/
function userTagSystem(usr, usernames){

    /* Ensures shift is down
    * Shift+Return combo needed because the typeahead system uses Return
    */
    usr.keydown(function(e){
        // Watches the shift key
        if (e.which == 16) shift = true;

        //Toggles off the "incorrect user" help text
        $("#help").text("");
    })

    /* Script which adds users
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
            
            if(val == clientApp.username){
                $("#help").text("Your username is automatically added to the project.");
            }
            else{
                if (usernames.indexOf(val) != -1){
                    if (addedUsers.indexOf(val) == -1){
                        // "&nbsp" text allows 3 character widths between usernames
                        $(".users").append('<a href="#" onClick="removeUser(this)">' + usr.val() + "&nbsp;&nbsp;&nbsp;</a>");
                        addedUsers.push(val);

                        usr.val("");
                    }
                    else{
                        $("#help").text("You already added this user.");
                    }
                }
                else{
                    $("#help").text("This is not a valid user.");
                }
            }
        }
        else if (e.which == 16) shift = false;
    })
}

/* Removes the user from the array of users
 * Removes the "tag" displaying the username
 * e: html object - link with username as text
 * The user may be added again by re-typing the username
*/
function removeUser(e){
    var u = $(e).attr("text");
    addedUsers.splice(addedUsers.indexOf(u) - 1, 1);
    e.remove();
}

/* Collects data from new project modal
 * Clears the data so that another project can be created without refresh
 * Serializes data and sends POST request /workspace/project_forward/
 * * POST CURRENTLY RETURNS 500 ERROR
 * * (final create_project method is unfinished)
*/
function sendData(){
    addedUsers.push(clientApp.username);
    //Collect data
    var t = $(".title"), d = $("#description");
    /*
    console.log("Title:", t.val());
    console.log("Description:", d.val());
    console.log("Users:", addedUsers);
    */

    var data = $.rdf.databank([], { namespaces: {
                                    ore: "http://www.openarchives.org/ore/terms/", 
                                    dc: "http://purl.org/dc/elements/1.1/", 
                                    dcterms: "http://purl.org/dc/terms/",
                                    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
                                    dcmitype: "http://purl.org/dc/dcmitype/",
                                    }
                                  });

    //Create UUID for new project
    var p = goog.global.databroker.createUuid();

    if(t.val() != ""){
        //Link user(s) and project
        var db = clientApp.databroker;
        for (var i = 0; i < addedUsers.length; i++) {
            var u = db.restUri(null, db.RESTYPE.user, addedUsers[i], null);
            data.add("<" + u + "> ore:aggregates <" + p + ">");
        };

        //Give project title
        data.add('<' + p + '> dc:title "' + t.val() + '"');

        //Give project description
        data.add('<' + p + '> dcterms:description "' + d.val() + '"');

        //Set types on project
        data.add('<' + p + '> rdf:type dcmitype:Collection');
        data.add('<' + p + '> rdf:type ore:Aggregation');

        //$.post('<url>', data [string])
        var postdata = data.dump({format: 'application/rdf+xml', 
                                  serialize:true});
        //console.log("data:", postdata);

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
        
        /* For some reason the following line doesn't send request properly
         * * Yields 500 error with "global request not defined" as cause
         * * Abstracting it one level fixes that problem                   
         * 'project_forward/' links to a method that calls projects (/store/projects/)
        */
        //$.post('/store/projects/', postdata);
        $.post('project_forward/', postdata);
        console.log(postdata);
    }

    else{
        console.log("Your project needs a title.")
    }


    //Clear data
    t.val("");
    d.val("");
    addedUsers = [];
    $(".users").text("");
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
