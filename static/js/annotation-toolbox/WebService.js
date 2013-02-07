/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 */

AnnotationToolbox.WebService = AnnotationToolbox.Class({
	rootURI: null,

	initialize: function(rootURI) {
        if (rootURI[rootURI.length-1] != '/') {
            this.rootURI = rootURI + "/"; // Adds the necessary slash if the rootURI parameter does not include it
        } else {
		    this.rootURI = rootURI; // Assigns rootURI
        }
	},

	resourceMetaDataURI: function(resourceID) {
        var uri = this.rootURI + "resource/" + resourceID + "/meta_data.json"; // Creates the URI for the specified resource(by id)'s metadata json file
        return uri;
    },

	withResourceMetaData: function(resourceID, callback) {
        AnnotationToolbox.Util.throwIfJQueryNotLoaded(); // The program would hang without jQuery

        var uri = this.resourceMetaDataURI(resourceID); // Gets the appropriate URI


        $.getJSON(uri, callback); // Uses jQuery to request the necessary json file, and passes a callback function to be performed on that json metadata
    },

    resourceImageURI: function(resourceID, imageID, size, bounds) {
        var uri = 
            this.rootURI + 
            "resource/" + resourceID +
            "/image/" + imageID; // Creates the uri of the image to be displayed
        if (size) {
            uri += "_w" + size.width + "_h" + size.height; // If size is specified, adds the requested size to the URI
        }
        if (bounds) {
            uri += "_x1" + bounds.x1 + "_x2" + bounds.y1 + 
                "_x3" + bounds.x2 + "_x4" + bounds.y2; // If bounds are specified, adds the bounds to the URI
        }

        return uri;
    },
    
    annotationURI: function(annoID) {
        return this.rootURI + "annotation/" + annoID +"/annotation.json";
    },
    
    markerIconURI: function() {
        return this.rootURI + "../js/images/zoom-world-mini.png";
    }
});


