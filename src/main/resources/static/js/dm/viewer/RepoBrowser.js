goog.provide('dm.viewer.RepoBrowser');

goog.require('dm.viewer.Viewer');

goog.require('dm.RepoBrowser');
goog.require('dm.viewer.CanvasViewer');

/**
 * A drill-down browser for viewing RDF Manuscript Repositories and Collections
 * 
 * @param clientApp {dm.ClientApp}
 * @param opt_rdfPrefixes {!Object} Optional rdf uris by their prefixes to be used with loaded rdf files
 */
dm.viewer.RepoBrowser = function (clientApp) {
    dm.viewer.Viewer.call(this, clientApp);
};
goog.inherits(dm.viewer.RepoBrowser, dm.viewer.Viewer);

dm.viewer.RepoBrowser.RESOURCE_TYPES = {
    canvases: ['dms:Canvas']
}

dm.viewer.RepoBrowser.prototype.render = function (div) {
    if (this.rootDiv != null) {
        return;
    }

    dm.viewer.Viewer.prototype.render.call(this, div);
    
    jQuery(this.rootDiv).addClass('atb-RepoBrowser');
    
    this.browser = new dm.RepoBrowser({
        doc: this.domHelper.getDocument(),
        databroker: this.databroker,
        repositoryUrlsByName: {
            'Stanford DMS': 'http://dms-data.stanford.edu/Repository.xml',
            'Shared Canvas': 'http://ada.drew.edu/tandres/repos/SharedCanvas/Repository.xml'
        }
    });

    this.browser.addEventListener('click', this.openHandler, false, this);
    this.browser.addEventListener('add_request', this.addHandler, false, this);

    this.browser.render(this.rootDiv);
};

dm.viewer.RepoBrowser.prototype.finishRender = function (div) {

};

dm.viewer.RepoBrowser.prototype.openHandler = function(event) {
    var uri = event.uri;
    var urisInOrder = event.urisInOrder;
    var sequenceIndex = event.sequenceIndex;

    var resource = this.databroker.getResource(uri);
    
    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        var viewer = new dm.viewer.CanvasViewer(this.clientApp);
        
        this.getPanelContainer().setViewer(viewer);
        
        viewer.setCanvasByUri(uri, null, null,
                              urisInOrder, sequenceIndex);

        event.preventDefault();
    }
};

dm.viewer.RepoBrowser.prototype.addHandler =
function(event) {
    var resource = this.databroker.getResource(event.uri);
    
    return true;
};