goog.provide('atb.marker.Point');

goog.require('atb.marker.Marker');


atb.marker.Point = function(
    id, cx, cy, radius, strokeWidth, strokeColor, opt_fillColor
) {
    atb.marker.Marker.call(
        this, 
        id, 
        strokeWidth, 
        strokeColor, 
        opt_fillColor
    ); 

    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
};
goog.inherits(atb.marker.Point, atb.marker.Marker);


atb.marker.Point.DEFAULT_RADIUS = 6;


atb.marker.Point.prototype.marker = function(){//resourceSize) {
    var pointGeometry = new OpenLayers.Geometry.Point(
        this.cx,
        this.cy
    );

    return new OpenLayers.Feature.Vector(
        pointGeometry,
        {
            id: this.id,
            shape: this.markerType()
        },
        this.style()
    );
};

atb.marker.Point.prototype.style = function() {
    return {
        pointRadius: this.radius,
        strokeWidth: this.strokeWidth,
        strokeColor: this.strokeColor,
        fill: this.shouldFill,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
        strokeOpacity: this.strokeOpacity
    };
}

/*
  @param resourceSize Not used. Included because we may store x,y as 
  percent of width,height.
 */
atb.marker.Point.prototype.geometry = function(){//resourceSize) {
    return new OpenLayers.Geometry.Point(
        this.cx,
        this.cy
    );
};


atb.marker.Point.vertexId = function(markerId, vertexId) {
    return markerId + "-" + vertexId;
}


atb.marker.Point.prototype.markerType = function() {
    return 'atb.marker.Point';
};


atb.marker.Point.prototype.projection = function(
    coord, 
    coordDim, 
    projectionDim
) {
	var proj = ( (1.0 * coord) / (1.0 * coordDim) ) * projectionDim;
    return proj;
};

