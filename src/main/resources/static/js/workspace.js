goog.provide("dm.Workspace");

goog.require('goog.events');
goog.require('goog.dom');
goog.require('goog.Uri');
goog.require('goog.ui.Dialog');

goog.require('dm.data.Databroker');
goog.require('dm.data.SyncService');

goog.require('dm.data.Quad');
goog.require('dm.data.Term');

goog.require("dm.ClientApp");
goog.require('dm.ProjectViewer');
goog.require('dm.SearchViewer');

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
   goog.global.databroker = new dm.data.Databroker(basePath);

   goog.global.clientApp = new dm.ClientApp(basePath, username, goog.global.databroker);

   setupUser(goog.global.databroker, username);

   goog.global.projectViewer = new dm.ProjectViewer(goog.global.clientApp);
   goog.global.searchViewer = new dm.SearchViewer(goog.global.clientApp);
}
