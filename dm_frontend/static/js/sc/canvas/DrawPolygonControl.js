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

/**
 * Overrides the line control path command creator so that polygons are drawn
 * rather than polylines.
 *
 * @override
 */
sc.canvas.DrawPolygonControl.prototype.createPathCommandsFromPoints = function(
                                                                       points) {
    return sc.canvas.Canvas.createPathCommandsFromPoints(points, true);
};
