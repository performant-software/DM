goog.provide('dm.canvas.DrawEllipseControl');

goog.require('dm.canvas.DrawFeatureControl');

/**
 * A CanvasViewport controller which allows ellipses to be drawn by dragging on
 * the canvas.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {dm.canvas.DrawFeatureControl}
 *
 * @param {dm.canvas.CanvasViewport} viewport The viewport to control.
 * @param {dm.data.Databroker} databroker A databroker from which uris should be
 * requested and new shape data should be sent.
 */
dm.canvas.DrawEllipseControl = function(viewport, databroker) {
    dm.canvas.DrawFeatureControl.call(this, viewport, databroker);

    this.featureType = 'ellipse';

    this.proxiedHandleMousedown = jQuery.proxy(this.handleMousedown, this);
    this.proxiedHandleMousemove = jQuery.proxy(this.handleMousemove, this);
    this.proxiedHandleMouseup = jQuery.proxy(this.handleMouseup, this);
};
goog.inherits(dm.canvas.DrawEllipseControl, dm.canvas.DrawFeatureControl);

dm.canvas.DrawEllipseControl.prototype.controlName = 'DrawEllipseControl';

/**
 * @inheritDoc
 */
dm.canvas.DrawEllipseControl.prototype.activate = function() {
    dm.canvas.DrawFeatureControl.prototype.activate.call(this);

    var viewportDiv = this.viewport.getElement();
    this.viewport.fabricCanvas.on('mouse:down', this.proxiedHandleMousedown);
};

/**
 * @inheritDoc
 */
dm.canvas.DrawEllipseControl.prototype.deactivate = function() {
    var viewportDiv = this.viewport.getElement();

    this.viewport.fabricCanvas.off('mouse:down', this.proxiedHandleMousedown);
    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    dm.canvas.DrawFeatureControl.prototype.deactivate.call(this);
};

/**
 * Handles a mousedown event by drawing an ellipse with 0 x and y radius and
 * saving it, then adding mousemove handlers to resize the ellipse.
 * @param {Event} event The jQuery event fired.
 */
dm.canvas.DrawEllipseControl.prototype.handleMousedown = function(opts) {
    var event = opts.e;

    this.beginDrawFeature();

    var viewportDiv = this.viewport.getElement();
    var canvas = this.viewport.canvas;
    
    this.viewport.registerHandledMouseEvent(event);

    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);

    this.x = canvasCoords.x;
    this.y = canvasCoords.y;
    this.width = 0;
    this.height = 0;

    var cx = this.x;
    var cy = this.y;
    var rx = 0;
    var ry = 0;

    this.feature = canvas.addEllipse(cx, cy, rx, ry, this.uri);
    this.updateFeatureCoords();

    this.viewport.fabricCanvas.on('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.on('mouse:up', this.proxiedHandleMouseup);
};

/**
 * Handles a mousemove event by resizing the saved ellipse.
 * @param {Event} event The jQuery event fired.
 */
dm.canvas.DrawEllipseControl.prototype.handleMousemove = function(opts) {
    var event = opts.e;

    var canvas = this.viewport.canvas;

    this.viewport.registerHandledMouseEvent(event);
    
    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);

    this.width = canvasCoords.x - this.x;
    this.height = canvasCoords.y - this.y;

    var rx = this.width / 2;
    var ry = this.height / 2;
    var cx = this.x + rx;
    var cy = this.y + ry;

    this.feature.set({
        'left': cx * canvas.displayToActualSizeRatio + canvas.offset.x,
        'top': cy * canvas.displayToActualSizeRatio + canvas.offset.y,
        'rx': Math.abs(rx),
        'ry': Math.abs(ry),
        'width': Math.abs(rx * 2),
        'height': Math.abs(ry * 2),
        'scaleX': canvas.displayToActualSizeRatio,
        'scaleY': canvas.displayToActualSizeRatio
    });

    this.updateFeature();
};

/**
 * Handles a mouseup event by completing the ellipse.
 * @param {Event} event The jQuery event fired.
 */
dm.canvas.DrawEllipseControl.prototype.handleMouseup = function(opts) {
    var event = opts.e;

    this.viewport.registerHandledMouseEvent(event);
    
    var viewportDiv = this.viewport.getElement();

    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    this.viewport.registerHandledMouseEvent(event);

    this.finishDrawFeature();
};
