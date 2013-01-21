goog.provide('atb.viewer.CanvasThumbnail');

goog.require('atb.viewer.ViewerThumbnail');
goog.require('atb.ui.Canvas');

atb.viewer.CanvasThumbnail = function (viewer) {
    atb.viewer.ViewerThumbnail.call(this, viewer);
    
    this.resource = this.viewer.resource;
    
    this.setTitle(this.resource.getTitle());
    
    this.setupRaphaelCanvas();
};
goog.inherits(atb.viewer.CanvasThumbnail, atb.viewer.ViewerThumbnail);

atb.viewer.CanvasThumbnail.prototype.setupRaphaelCanvas = function () {
    var size = new goog.math.Size(atb.viewer.ViewerThumbnail.WIDTH, atb.viewer.ViewerThumbnail.HEIGHT);
    
    this.canvas = new atb.ui.Canvas(this.clientApp, size, this.domHelper, this.resource);
    this.canvas.addMarkers(this.getAllShownMarkers());
    this.canvas.zoomToBounds(this.viewer.olViewer.getExtent());
    
    this.canvasDiv = this.canvas.render(this.baseDiv);
};

atb.viewer.CanvasThumbnail.prototype.getAllShownMarkers = function () {
    var markers = [];
    
    var olMarkers = this.viewer.dataModel.getAllMarkers();
    for (var i=0, len=olMarkers.length; i<len; i++) {
        var olMarker = olMarkers[i];
        
        if (olMarker.state.bEnabled) {
            markers.push(olMarker.resource);
        }
    }
    
    return markers;
};