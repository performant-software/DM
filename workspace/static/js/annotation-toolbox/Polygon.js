/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 * @requires Marker.js
 */
AnnotationToolbox.Polygon = AnnotationToolbox.Class(AnnotationToolbox.Marker, {
	id: null,
	points: null,
	
	initialize: function(id) {
		this.id = id;
		this.points = [];
	},
	
	addPoint: function(point) {
		this.points.push(point);
	},
	
	addPoint: function(x, y) {
		this.points.push(new OpenLayers.LonLat(x, y));
	},
	
	generateVector: function() {
		var ring = new OpenLayers.Geometry.LinearRing([]);
		
		for (var i=0, len=this.points.length; i<len; i++) {
			var point = this.points[i];
			
			ring.addComponent(new OpenLayers.Geometry.Point(point.lon, point.lat));
		}
		
		var polygonGeometry = new OpenLayers.Geometry.Polygon([ring]);
		
		return new OpenLayers.Feature.Vector(polygonGeometry);
	}
	
});

