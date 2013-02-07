/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 * @requires Marker.js
 */

AnnotationToolbox.Line = AnnotationToolbox.Class(AnnotationToolbox.Marker, {
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
		var line = new OpenLayers.Geometry.LineString([]);
		
		for (var i=0, len=this.points.length; i<len; i++) {
			var point = this.points[i];
			
			line.addPoint(new OpenLayers.Geometry.Point(point.lon, point.lat));
		}
		
		return new OpenLayers.Feature.Vector(line);
	}
});

