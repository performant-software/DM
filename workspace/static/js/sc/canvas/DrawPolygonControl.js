goog.provide('sc.canvas.DrawPolygonControl');

goog.require('sc.canvas.DrawLineControl');

/**
 * A CanvasViewport controller which allows polygons to be drawn by clicking on
 * the canvas multiple times, and double clicking or pressing enter to complete
 * the polygon.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {sc.canvas.DrawLineControl}
 *
 * @param {sc.canvas.CanvasViewport} viewport The viewport to control.
 * @param {sc.data.Databroker} databroker A databroker from which uris should be
 * requested and new shape data should be sent.
 */
sc.canvas.DrawPolygonControl = function(viewport, databroker) {
    sc.canvas.DrawLineControl.call(this, viewport, databroker);

    this.featureType = 'polygon';
};
goog.inherits(sc.canvas.DrawPolygonControl, sc.canvas.DrawLineControl);

sc.canvas.DrawPolygonControl.prototype.createInitialLine = function(canvasCoord) {
    var viewportDiv = this.viewport.getElement();
    var canvas = this.viewport.canvas;

    this.beginDrawFeature();

    this.points.push(canvasCoord);
    
    this.feature = canvas.addPath([], this.uri);
    this.feature.set({
        top: canvasCoord.y * canvas.displayToActualSizeRatio + canvas.offset.x,
        left: canvasCoord.x * canvas.displayToActualSizeRatio + canvas.offset.y,
        scaleX: canvas.displayToActualSizeRatio,
        scaleY: canvas.displayToActualSizeRatio
    });
    this.updateFeatureCoords();
};

sc.canvas.DrawPolygonControl.prototype.normalizePoints = function(points) {
    var newPoints = [];

    var initialPoint = this.points[0];

    for (var i=0, len=points.length; i<len; i++) {
        var point = {
            x: points[i].x,
            y: points[i].y
        };

        point.x -= initialPoint.x;
        point.y -= initialPoint.y;

        newPoints.push(point)
    }

    return newPoints;
};