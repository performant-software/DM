//atb.marker.Marker
goog.provide('atb.marker.Marker');


atb.marker.Marker = function(
    id, strokeWidth, strokeColor, opt_fillColor
) {
	this.id = id;
    this.strokeWidth = strokeWidth;
    this.strokeColor = strokeColor;
    if (opt_fillColor) {
        this.shouldFill = true;
        this.fillColor = opt_fillColor;
    } else {
        this.shouldFill = false;
        this.fillColor = '#000000';
    }
    this.fillOpacity = 0.5;
    this.strokeOpacity = 0.8;
};


atb.marker.Marker.prototype.markerType = function() {
    throw "markerType() should not be called on instance of base class Marker. Should be overriden in subclass.";
};


atb.marker.Marker.prototype.geometry = function() {
    throw "geometry() should not be called on instance of base class Marker. Should be overriden in subclass.";
};

