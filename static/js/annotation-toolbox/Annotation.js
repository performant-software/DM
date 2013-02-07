/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 */
AnnotationToolbox.Annotation = AnnotationToolbox.Class({
	id: null,
	label: null,
	text: null,
    annoType: "", // "Marker" or "Polygon"
    marker: null, // Can hold a marker, or its subclass polygon
	
	initialize: function(id) {
		this.id = id;
	}
});
