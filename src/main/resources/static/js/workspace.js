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

var scrollIntoView = function(element) {
    var offsetTop = $(element).offset().top;
    offsetTop -= $("#main-nav").outerHeight();
    if (offsetTop < 0) offsetTop = 0;

    $(window).scrollTop(offsetTop);
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

   setupUser(databroker, username);

   goog.global.viewerGrid = new dm.viewer.ViewerGrid();
   goog.global.clientApp.viewerGrid = goog.global.viewerGrid;

   goog.global.projectViewer = new dm.ProjectViewer(goog.global.clientApp);
   goog.global.projectViewer.renderButtons('#projectViewerButtons');
   goog.global.projectViewer.renderModals('body');

   goog.global.searchViewer = new dm.SearchViewer(goog.global.clientApp);
   goog.global.searchViewer.render('body');
   goog.global.searchViewer.addListenersToButton('#searchButton');
}
