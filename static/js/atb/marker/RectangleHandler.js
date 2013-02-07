goog.provide('atb.marker.Handler.Rectangle');

goog.require('openlayers.OpenLayers');

/**
 * Based on code from http://www.osgeo.org/pipermail/openlayers-users/2007-April/001220.html
 * Modified for modern OpenLayers library by Tim Andres
 */

/* Copyright (c) 2006 MetaCarta, Inc., published under a modified BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/repository-license.txt 
 * for the full text of the license. */


/**
 * Handler to draw a rectangle on the map. Rectangle is displayed on mouse down,
 * moves on mouse move, and is finished on mouse up.
 * 
 * @class
 * @requires OpenLayers/Handler/Polygon.js
 */
atb.marker.Handler.Rectangle = OpenLayers.Class.create();
atb.marker.Handler.Rectangle.prototype = 
  OpenLayers.Class.inherit(OpenLayers.Handler.Polygon, {
    /**
     * Method: createFeature
     * Add temporary geometries
     *
     * Parameters:
     * pixel - {<OpenLayers.Pixel>} The initial pixel location for the new
     *     feature.
     */
    createFeature: function(pixel) {
        var lonlat = this.layer.getLonLatFromViewPortPx(pixel);
        var geometry = new OpenLayers.Geometry.Point(
            lonlat.lon, lonlat.lat
        );
        this.point = new OpenLayers.Feature.Vector(geometry);
        this.line = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LinearRing([this.point.geometry])
        );
        this.polygon = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Polygon([this.line.geometry])
        );
        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
    },
    
    addPoint: function (pixel) {
        OpenLayers.Handler.Path.prototype.addPoint.call(this, pixel);
    },
    
    drawFeature: function () {
        this.layer.drawFeature(this.polygon, this.style);
    },

    /**
     * Handle mouse move.  Adjust the geometry and redraw.
     * Return determines whether to propagate the event on the map.
     * 
     * @param {Event} evt
     * @type Boolean
     */
    mousemove: function(evt) {
        if (this.drawing) {
            var lonlat = this.map.getLonLatFromPixel(evt.xy);
            this.point.x = lonlat.lon;
            this.point.y = lonlat.lat;
            
            var topLeftPoint = new OpenLayers.Geometry.Point(this.originalPoint.x, this.originalPoint.y);
            var topRightPoint = new OpenLayers.Geometry.Point(this.point.x, this.originalPoint.y);
            var bottomLeftPoint = new OpenLayers.Geometry.Point(this.originalPoint.x, this.point.y);
            var bottomRightPoint = new OpenLayers.Geometry.Point(this.point.x, this.point.y);

            this.line.geometry.components = [];
            
            this.line.geometry.addComponent(topLeftPoint);
            this.line.geometry.addComponent(topRightPoint);
            this.line.geometry.addComponent(bottomRightPoint);
            this.line.geometry.addComponent(bottomLeftPoint);
            
            this.drawFeature();
        }
        return false;
    },

    /**
     * Handle mouse up. Finalize the geometry.
     * Return determines whether to propagate the event on the map.
     * 
     * @param {Event} evt
     * @type Boolean
     */
    mouseup: function (evt) {
        if (this.drawing) {
            this.drawing = false;
            this.finalize();
        }
        return false;
    },

    /**
     * Handle mouse down. Create the geometry.
     * Return determines whether to propagate the event on the map.
     * 
     * @param {Event} evt
     * @type Boolean
     */
    mousedown: function(evt) {
        // ignore double-clicks
        if (this.lastDown && this.lastDown.equals(evt.xy)) {
            return false;
        }
        this.lastDown = evt.xy;
        this.drawing = true;

        var pixel = new OpenLayers.Pixel(evt.clientX, evt.clientY);
        this.createFeature(pixel);
        
        var lonlat = this.control.map.getLonLatFromPixel(evt.xy);
        this.point.x = lonlat.lon;
        this.point.y = lonlat.lat;
        
        this.originalPoint = new OpenLayers.Geometry.Point(this.point.x, this.point.y);

        this.addPoint(pixel);
        this.addPoint(pixel);
        
        return false;
    },


    /** @final @type String */
    CLASS_NAME: "atb.marker.Handler.Rectangle"
});