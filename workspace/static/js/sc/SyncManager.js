goog.provide('sc.SyncManager');

goog.require('goog.dom.DomHelper');
goog.require('sc.data.SyncService');
goog.require('sc.data.Databroker');

sc.SyncManager = function(clientApp) {
    // above was.. function(clientApp, opt_domHelper)

    this.clientApp = clientApp;
    this.domHelper = new goog.dom.DomHelper();

    // this.saveButtonElement = this.domHelper.createDom('button', {'class': 'btn btn-inverse'}, 'Sync all');

    // goog.events.listen(this.saveButtonElement, 'click', this._syncData, false, this);
};


sc.SyncManager.prototype.renderSaveButton = function(element) {
    $(element).append(this.saveButtonElement);
};


sc.SyncManager.prototype._syncData = function() {
    console.warn('Save clicked.');

    var databroker = this.clientApp.databroker;

    console.warn('My databroker sees hasUnsavedChanges?');
    console.warn(databroker.syncService.hasUnsavedChanges());

    databroker.sync();
};