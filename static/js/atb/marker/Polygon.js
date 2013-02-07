goog.provide('atb.marker.Polygon');

goog.require('atb.marker.Multipoint');
goog.require('atb.marker.Point');


atb.marker.Polygon = function(
    id, strokeWidth, strokeColor, opt_fillColor, opt_points
) {
    atb.marker.Multipoint.call(
        this, 
        id, 
        strokeWidth, 
        strokeColor, 
        opt_fillColor, 
        opt_points // must be atb.marker.Point
    );
};
goog.inherits(atb.marker.Polygon, atb.marker.Multipoint);


atb.marker.Polygon.prototype.marker = function(){//resourceSize) {
    return new OpenLayers.Feature.Vector(
        this.geometry(),
        {
            id: this.id,
            shape: this.markerType()
        },
        this.style()
    );
};


atb.marker.Polygon.prototype.geometry = function(){//resourceSize) {
    var ring = new OpenLayers.Geometry.LinearRing([]);
	
    var nPoints = this.points.length;
    //console.log(nPoints);
	for (var i=0; i<nPoints; i++) {
		ring.addComponent(this.points[i].geometry());//resourceSize));
	}
    
	return new OpenLayers.Geometry.Polygon([ring]);
}


atb.marker.Polygon.prototype.markerType = function() {
    return 'atb.marker.Polygon';
};
