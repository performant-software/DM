goog.provide('sc.SyncManager');

goog.require('goog.dom.DomHelper');
goog.require('sc.data.SyncService');
goog.require('sc.data.Databroker');

// Create save button
  // Click to run sc.data.Databroker.prototype.sync
  // Button has save icon and Save text.

// Create error feedback element
  // Show element only when there are errors
    // Click to see details

sc.SyncManager = function(clientApp) {
    // above was.. function(clientApp, opt_domHelper)

    this.clientApp = clientApp;
    // this.databroker = clientApp.databroker;
    // this.projectController = this.databroker.projectController;
    // this.viewerGrid = clientApp.viewerGrid;

    this.domHelper = new goog.dom.DomHelper();

    // this.saveButtonElement = this.domHelper.createDom('button', {'class': 'btn btn-inverse'}, 
    //     this.domHelper.createDom('span', {'class': 'icon-save'}, 'Save'));
    this.saveButtonElement = this.domHelper.createDom('button', {'class': 'btn btn-inverse'}, 'Save all');
    // this.saveStatusElement = this.domHelper.createDom('a', {'class': ''}, 'Saved!');
    goog.events.listen(this.saveButtonElement, 'click', this._syncData, false, this);
};


sc.SyncManager.prototype.renderSaveButton = function(element) {
    $(element).append(this.saveButtonElement);
};

// sc.SyncManager.prototype.renderSaveStatus = function(element, savedStatus) {
//     $(element).append(this.saveStatusElement);
// };


sc.SyncManager.prototype._syncData = function() {
    console.warn('Save clicked.');
    // console.warn(this.clientApp.databroker);

    // this.syncService = new sc.data.SyncService();

    var databroker = this.clientApp.databroker;

    console.warn('My databroker sees hasUnsavedChanges?');
    console.warn(databroker.syncService.hasUnsavedChanges());

    databroker.sync();
    
    // this.syncService.databroker = databroker;

    // this.syncService.requestSync();
};