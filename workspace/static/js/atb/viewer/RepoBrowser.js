goog.provide('atb.viewer.RepoBrowser');

goog.require('atb.viewer.Viewer');

goog.require('sc.RepoBrowser');
goog.require('atb.viewer.CanvasViewer');

/**
 * A drill-down browser for viewing RDF Manuscript Repositories and Collections
 * 
 * @param clientApp {atb.ClientApp}
 * @param opt_rdfPrefixes {!Object} Optional rdf uris by their prefixes to be used with loaded rdf files
 */
atb.viewer.RepoBrowser = function (clientApp) {
    atb.viewer.Viewer.call(this, clientApp);
};
goog.inherits(atb.viewer.RepoBrowser, atb.viewer.Viewer);

atb.viewer.RepoBrowser.RESOURCE_TYPES = {
    canvases: ['dms:Canvas']
}

atb.viewer.RepoBrowser.prototype.render = function (div) {
    if (this.rootDiv != null) {
        return;
    }

    atb.viewer.Viewer.prototype.render.call(this, div);
    
    jQuery(this.rootDiv).addClass('atb-RepoBrowser');
    
    this.browser = new sc.RepoBrowser({
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

atb.viewer.RepoBrowser.prototype.finishRender = function (div) {

};

atb.viewer.RepoBrowser.prototype.openHandler = function(event) {
    var uri = event.uri;
    var urisInOrder = event.urisInOrder;
    var sequenceIndex = event.sequenceIndex;

    var resource = this.databroker.getResource(uri);
    
    if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
        var viewer = new atb.viewer.CanvasViewer(this.clientApp);
        
        this.getPanelContainer().setViewer(viewer);
        
        viewer.setCanvasByUri(uri, null, null,
                              urisInOrder, sequenceIndex);

        event.preventDefault();
    }
};

atb.viewer.RepoBrowser.prototype.addHandler =
function(event) {
    var resource = this.databroker.getResource(event.uri);
    
    return true;
};