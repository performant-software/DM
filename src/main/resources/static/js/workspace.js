goog.provide("dm.Workspace");

goog.require("dm.ClientApp");

goog.require('dm.viewer.Finder');
goog.require('dm.viewer.TextEditor');
goog.require('dm.viewer.AudioViewer');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.Uri');
goog.require('goog.Uri');
goog.require('dm.viewer.RepoBrowser');
goog.require('dm.widgets.WorkingResources');
goog.require('goog.ui.Dialog');

goog.require('dm.viewer.ViewerGrid');
goog.require('dm.viewer.ViewerContainer');

goog.require("dm.ProjectManager");
goog.require('dm.ProjectViewer');

goog.require('dm.SearchViewer');
goog.require('dm.SyncManager');


var clientApp = null;
var glasspane = null;
var workingResourcesViewer = null;
var repoBrowser = null;
var viewerGrid = null;

var scrollIntoView = function(element) {
    var offsetTop = $(element).offset().top;
    offsetTop -= $("#main-nav").outerHeight();
    if (offsetTop < 0) offsetTop = 0;

    $(window).scrollTop(offsetTop);
};


var setupProjectViewer = function(clientApp, viewerGrid) {
    goog.global.projectViewer = new dm.ProjectViewer(clientApp);
    projectViewer.renderButtons('#projectViewerButtons');
    projectViewer.renderModals('body');
};

var setupSearchViewer = function(clientApp) {
    goog.global.searchViewer = new dm.SearchViewer(clientApp);
    searchViewer.render('body');
    searchViewer.addListenersToButton('#searchButton');
};

var setupSyncManager = function(clientApp) {
    goog.global.syncManager = new dm.SyncManager(clientApp);
    syncManager.renderSaveButton('#js_save_button');
};

var setupRepoBrowser = function(clientApp, wrContainerParent) {
    repoBrowser = new dm.RepoBrowser({
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

        if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
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

        databroker.projectController.addResourceToProject(resource);
        // if (workingResourcesViewer) {
        //     workingResourcesViewer.loadManifest(databroker.currentProject);
        // }
    });

    var repoBrowserContainer = jQuery('#repoBrowserModal .modal-body').get(0);
    repoBrowser.render(repoBrowserContainer);
};

var GRID_BOTTOM_MARGIN = 20;
var GRID_LEFT_MARGIN = 20;
var GRID_RIGHT_MARGIN = 20;

var resizeViewerGrid = function() {
    var height = jQuery(window).height() - jQuery(viewerGrid.getElement()).offset().top - GRID_BOTTOM_MARGIN;
    var width = jQuery(window).width() - GRID_LEFT_MARGIN - GRID_RIGHT_MARGIN;

    viewerGrid.resize(width, height);

    if ($(window).width() > 1275 && $(window).height() > 825) {
        $('#3x4_layout_button').show();
        $('#4x4_layout_button').show();
    }
    else {
        $('#3x4_layout_button').hide();
        $('#4x4_layout_button').hide();
    }
};

var setupUser = function(databroker, username) {
    databroker.user = databroker.getResource(databroker.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, username, null));
    var userUrl = databroker.syncService.restUrl(null, dm.data.SyncService.RESTYPE.user, username, null);
    databroker.quadStore.addQuad(new dm.data.Quad(databroker.user.bracketedUri, databroker.namespaces.expand('ore', 'isDescribedBy'), dm.data.Term.wrapUri(userUrl)));

    var selectProject = function() {
        if (goog.global.projectViewer) {
            projectViewer.updateButtonUI();
        }
        databroker.projectController.autoSelectProject();
        if (databroker.projectController.currentProject) {
            var deferredProject = databroker.projectController.currentProject.defer();

            var updateUI = function() {
                if (goog.global.projectViewer) {
                    projectViewer.updateButtonUI();
                    projectViewer.updateModalUI();
                    projectViewer.showModal();
                }
            };

            deferredProject.progress(updateUI).done(updateUI);
        }
    };

    databroker.user.defer().done(selectProject);
};

function initWorkspace(basePath, username) {
   goog.global.baseUri = [ window.location.protocol, "//", window.location.host, basePath ].join("");
   goog.global.databroker = new dm.data.Databroker({
       'syncService': new dm.data.SyncService({
           'dmBaseUri': [goog.global.baseUri, "store"].join("/"),
           'restBasePath' : [basePath, "store"].join("/")
       })
   });

   goog.global.clientApp = new dm.ClientApp(basePath, username, goog.global.databroker);
   goog.global.clientApp.renderLinkCreationUI();

   setupUser(databroker, username);

   goog.global.viewerGrid = new dm.viewer.ViewerGrid();
   viewerGrid.setDimensions(1, 2);
   viewerGrid.render(goog.dom.getElement('grid'));

   clientApp.viewerGrid = goog.global.viewerGrid;

   resizeViewerGrid();
   jQuery(window).bind('resize', resizeViewerGrid);

   glasspane = goog.dom.createDom('div', {
      'class' : 'frosted-glasspane'
   });
   jQuery(glasspane).hide();
   jQuery(document.body).prepend(glasspane);

   var wrContainerParent = goog.dom.createDom('div', {
      'class' : 'working-resources-container-parent'
   });
   jQuery('#atb-footer-controls').prepend(wrContainerParent);

   //setupRepoBrowser(clientApp, wrContainerParent);
   setupProjectViewer(clientApp, viewerGrid);
   setupSearchViewer(clientApp);
   // setupSyncManager(clientApp);
}


var createCanvasViewer = function(uri) {
    var viewer = new dm.viewer.CanvasViewer(clientApp);
    viewer.setCanvasByUri(uri, null, null, null, null);
    return viewer;
};
