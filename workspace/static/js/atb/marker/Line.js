goog.provide('atb.marker.Line');

goog.require('atb.marker.Multipoint');
goog.require('atb.marker.Point');


atb.marker.Line = function(
    id, strokeWidth, strokeColor, opt_fillColor, opt_points
) {
    atb.marker.Multipoint.call(
        this, 
        id, 
        strokeWidth, 
        strokeColor, 
        opt_fillColor, 
        opt_points
    );
};
goog.inherits(atb.marker.Line, atb.marker.Multipoint);
	

atb.marker.Line.prototype.marker = function(){//resourceSize) {
    return new OpenLayers.Feature.Vector(
        this.geometry(),//resourceSize),
        {
            id: this.id,
            shape: this.markerType()
        },
        this.style()
    );
};


atb.marker.Line.prototype.geometry = function(){//resourceSize) {
	var olLine = new OpenLayers.Geometry.LineString([]);
	
    var nPoints = this.points.length;
	for (var i=0; i<nPoints; i++) {
		olLine.addPoint(this.points[i].geometry());//resourceSize));
	}

    return olLine;
}


atb.marker.Line.prototype.markerType = function() {
    return 'atb.marker.Line';
};

