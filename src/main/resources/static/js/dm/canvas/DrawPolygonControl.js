goog.provide('dm.canvas.DrawPolygonControl');

goog.require('dm.canvas.DrawLineControl');

/**
 * A CanvasViewport controller which allows polygons to be drawn by clicking on
 * the canvas multiple times, and double clicking or pressing enter to complete
 * the polygon.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {dm.canvas.DrawLineControl}
 *
 * @param {dm.canvas.CanvasViewport} viewport The viewport to control.
 * @param {dm.data.Databroker} databroker A databroker from which uris should be
 * requested and new shape data should be sent.
 */
dm.canvas.DrawPolygonControl = function(viewport, databroker) {
    dm.canvas.DrawLineControl.call(this, viewport, databroker);

    this.featureType = 'polygon';
};
goog.inherits(dm.canvas.DrawPolygonControl, dm.canvas.DrawLineControl);

dm.canvas.DrawPolygonControl.prototype.controlName = 'DrawPolygonControl';

dm.canvas.DrawPolygonControl.prototype.createInitialLine = function(canvasCoord) {
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

dm.canvas.DrawPolygonControl.prototype.updateLine = function(points) {
    var boundingBox = this.getLayerBoundingBox(points);

    var canvas = this.viewport.canvas;
    this.feature = canvas.updatePath(
        this.feature,
        dm.canvas.FabricCanvas.convertPointsToSVGPathCommands(
            this.normalizePoints(points),
            null,
            boundingBox,
            true
        )
    );

    this.feature.set({
        left: boundingBox.x1 + (boundingBox.width / 2),
        top: boundingBox.y1 + (boundingBox.height / 2)
    });

    this.updateFeature();
};

dm.canvas.DrawPolygonControl.prototype.normalizePoints = function(points) {
    var boundingBox = dm.canvas.FabricCanvas.getPointsBoundingBox(points);

    var newPoints = [];

    var initialPoint = new fabric.Point(boundingBox.x1, boundingBox.y1);

    for (var i=0, len=points.length; i<len; i++) {
        var point = new fabric.Point(
            points[i].x - initialPoint.x,
            points[i].y - initialPoint.y
        );

        newPoints.push(point);
    }

    return newPoints;
};

/**
 * @inheritDoc
 */
dm.canvas.DrawPolygonControl.prototype.finishDrawFeature = function() {
    var boundingBox = this.getLayerBoundingBox(this.points);

    var canvas = this.viewport.canvas;
    canvas.removeFabricObject(this.feature, true);
    this.feature = canvas.addPolygon(this.normalizePoints(this.points), this.uri);
    this.feature.set({
        left: boundingBox.x1 + (boundingBox.width / 2),
        top: boundingBox.y1 + (boundingBox.height / 2)
    });

    this.updateFeature();

    dm.canvas.DrawFeatureControl.prototype.finishDrawFeature.call(this);

    var viewportDiv = this.viewport.getElement();

    this.points = [];
    jQuery(viewportDiv).unbind('mousemove', this.proxiedHandleMousemove);

    if (! this.freehandMode) {
        this.useDragToDraw = false;
    }
};