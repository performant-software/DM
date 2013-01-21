/*
 * @requires AnnotationToolbox.js
 */

AnnotationToolbox.Util = {};

/**
 * APIFunction: extend
 * Copy all properties of a source object to a destination object.  
 * Modifies the passed in destination object. Any properties on 
 * the source object that are set to undefined will not be (re)set 
 * on the destination object.
 *
 * Parameters:
 * destination - {Object} The object that will be modified
 * source - {Object} The object with properties to be set 
 *          on the destination
 *
 * Returns:
 * {Object} The destination object.
 */
AnnotationToolbox.Util.extend = function(destination, source) {
    destination = destination || {};
    if(source) {
        for(var property in source) {
            var value = source[property];
            if(value !== undefined) {
                destination[property] = value;
            }
        }

        /**
         * IE doesn't include the toString property when iterating 
         * over an object's properties with the for(property in 
         * object) syntax.  Explicitly check if
         * the source has its own toString property.
         */

        /*
         * FF/Windows < 2.0.0.13 reports "Illegal operation on 
         * WrappedNative prototype object" when calling 
         * hasOwnProperty if the source object
         * is an instance of window.Event.
         */

        var sourceIsEvt = typeof window.Event == "function"
                          && source instanceof window.Event; // Determines if the source passed to the function is an event

        if(!sourceIsEvt
           && source.hasOwnProperty 
		   && source.hasOwnProperty('toString')) {
            destination.toString = source.toString; // Copies the toString method of source to destination (as appropriate)
        }
    }
    return destination;
};


AnnotationToolbox.Util.jQueryLoaded = function() {
    var jQueryLoaded;

    try{
        jQueryLoaded = jQuery;
        jQueryLoaded = true;
    } catch(err){
        jQueryLoaded=false;
    }//If the jQuery object exists, jQueryLoaded is set to true, otherwise, false

    return jQueryLoaded;
}


AnnotationToolbox.Util.OpenLayersLoaded = function() {
    var OpenLayersLoaded;

    try{
        OpenLayersLoaded = OpenLayers;
        OpenLayersLoaded = true;
    } catch(err){
        OpenLayersLoaded=false;
    } //If the OpenLayers object exists, OpenLayersLoaded is set to true, otherwise, false

    return OpenLayersLoaded;
}


AnnotationToolbox.Util.throwIfJQueryNotLoaded = function() {
    if (! AnnotationToolbox.Util.jQueryLoaded()) {
        throw "jQuery required for annotation-toolbox."
    }
}


AnnotationToolbox.Util.throwIfOpenLayersNotLoaded = function() {
    if (! AnnotationToolbox.Util.OpenLayersLoaded()) {
        throw "OpenLayers required for annotation-toolbox."
    }
}

