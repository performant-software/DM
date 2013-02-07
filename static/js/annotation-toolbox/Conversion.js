/*
 * @requires AnnotationToolbox.js
 */


/**
 * AnnotationToolbox.Conversion
 * 
 * Utility functions for converting similar OpenLayers types, such as
 * OpenLayers.Geometry.Point and OpenLayers.LonLat
 */	
AnnotationToolbox.Conversion = {};

AnnotationToolbox.Conversion.pointToLonLat = function (point) {
    var lon = point.x;
    var lat = point.y;
    
    return new OpenLayers.LonLat(lon, lat);
}

AnnotationToolbox.Conversion.lonLatToPoint = function (lonLat) {
    var x = lonLat.lon;
    var y = lonLat.lat;
    
    return new OpenLayers.Geometry.Point(x, y);
}
