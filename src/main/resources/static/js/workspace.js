goog.provide("dm.Workspace");

goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.Uri');
goog.require('goog.ui.Dialog');

goog.require('dm.data.Databroker');
goog.require('dm.data.SyncService');

goog.require('dm.data.Quad');
goog.require('dm.data.Term');

goog.require('dm.viewer.ViewerGrid');

goog.require("dm.ClientApp");
goog.require('dm.ProjectViewer');
goog.require('dm.SearchViewer');


var clientApp = null;
var glasspane = null;
var workingResourcesViewer = null;
var viewerGrid = null;

var scrollIntoView = function(element) {
    var offsetTop = $(element).offset().top;
    offsetTop -= $("#main-nav").outerHeight();
    if (offsetTop < 0) offsetTop = 0;

    $(window).scrollTop(offsetTop);
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

   goog.global.projectViewer = new dm.ProjectViewer(clientApp);
   goog.global.projectViewer.renderButtons('#projectViewerButtons');
   goog.global.projectViewer.renderModals('body');

   goog.global.searchViewer = new dm.SearchViewer(clientApp);
   goog.global.searchViewer.render('body');
   goog.global.searchViewer.addListenersToButton('#searchButton');
}
