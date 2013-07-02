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
    
    setupWorkingResources(clientApp, username, wrContainerParent);
    setupRepoBrowser(clientApp, wrContainerParent);
    goog.global.projectManager = new sc.ProjectManager(databroker, $("#projectManagerButton").get(0),viewerGrid, workingResourcesViewer, $("body").get(0), username, usernames);

    setupCurrentProject(clientApp, username);
}


var createCanvasViewer = function(uri) {
    var viewer = new atb.viewer.CanvasViewer(clientApp);
    viewer.setCanvasByUri(uri, null, null, null, null);
    return viewer;
}
