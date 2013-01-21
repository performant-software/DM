/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 */
AnnotationToolbox.Marker = AnnotationToolbox.Class(OpenLayers.Marker, {
	id: null,

	initialize: function(id, lonLat) {
		this.id = id;
        
        var size = new OpenLayers.Size(21,25);
        var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
        var icon = new OpenLayers.Icon(
            "http://www.openlayers.org/dev/img/marker-blue.png", 
            size, 
            offset
        );
        
        OpenLayers.Marker.prototype.initialize.apply(this, [lonLat, icon]);
	},
	
	thumbUrl: function(baseUrl) {
		return baseUrl + "/annotation/" + this.id + "/thumb/";
	}

});
