goog.provide('atb.marker.Multipoint');

goog.require('atb.marker.Marker');
goog.require('atb.marker.Point');


/*
  @abstract: no marker method defined
*/
atb.marker.Multipoint = function(
    id, strokeWidth, strokeColor, opt_fillColor, opt_points
) {
    atb.marker.Marker.call(this, id, strokeWidth, strokeColor, opt_fillColor);
	this.points = [];
    if (opt_points) {
        this.addPoints(opt_points);
    }
};
goog.inherits(atb.marker.Multipoint, atb.marker.Marker);
	

atb.marker.Multipoint.prototype.addPoint = function(p) {
	this.points.push(p);
};


atb.marker.Multipoint.prototype.addPoints = function(points) {
    var nPoints = points.length;
    for (var i=0; i<nPoints; i++) {
        var p = points[i];
        this.addPoint(p);
    }
};


atb.marker.Multipoint.prototype.style = function() {
    return {
        strokeWidth: this.strokeWidth,
        strokeColor: this.strokeColor,
        fill: this.shouldFill,
        fillColor: this.fillColor,
        strokeOpacity: this.strokeOpacity,
        fillOpacity: this.fillOpacity
    };
}






