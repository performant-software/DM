goog.provide('sc.canvas.DrawCircleControl');

goog.require('sc.canvas.DrawFeatureControl');

/**
 * A CanvasViewport controller which allows circle to be drawn by dragging on
 * the canvas.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {sc.canvas.DrawFeatureControl}
 *
 * @param {sc.canvas.CanvasViewport} viewport The viewport to control.
 * @param {sc.data.Databroker} databroker A databroker from which uris should be
 * requested and new shape data should be sent.
 */
sc.canvas.DrawCircleControl = function(viewport, databroker) {
    sc.canvas.DrawFeatureControl.call(this, viewport, databroker);

    this.featureType = 'circle';

    this.proxiedHandleMousedown = jQuery.proxy(this.handleMousedown, this);
    this.proxiedHandleMousemove = jQuery.proxy(this.handleMousemove, this);
    this.proxiedHandleMouseup = jQuery.proxy(this.handleMouseup, this);
};
goog.inherits(sc.canvas.DrawCircleControl, sc.canvas.DrawFeatureControl);

sc.canvas.DrawCircleControl.prototype.controlName = 'DrawCircleControl';

/**
 * @inheritDoc
 */
sc.canvas.DrawCircleControl.prototype.activate = function() {
    sc.canvas.DrawFeatureControl.prototype.activate.call(this);

    var viewportDiv = this.viewport.getElement();
    this.viewport.fabricCanvas.on('mouse:down', this.proxiedHandleMousedown);
};

/**
 * @inheritDoc
 */
sc.canvas.DrawCircleControl.prototype.deactivate = function() {
    var viewportDiv = this.viewport.getElement();

    this.viewport.fabricCanvas.off('mouse:down', this.proxiedHandleMousedown);
    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    sc.canvas.DrawFeatureControl.prototype.deactivate.call(this);
};

/**
 * Handles a mousedown event by drawing a circle with radius 0 and saving it,
 * then adding mousemove handlers to resize the ellipse.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawCircleControl.prototype.handleMousedown = function(event) {
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
    var r = 0;

    this.feature = canvas.addCircle(cx, cy, r, this.uri);
    this.updateFeatureCoords();

    this.viewport.fabricCanvas.on('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.on('mouse:up', this.proxiedHandleMouseup);
};

/**
 * Handles a mousemove event by resizing the saved circle.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawCircleControl.prototype.handleMousemove = function(event) {
    this.viewport.registerHandledMouseEvent(event);

    var canvas = this.viewport.canvas;
    
    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);

    this.width = canvasCoords.x - this.x;
    this.height = canvasCoords.y - this.y;

    var smallestDimension = Math.min(Math.abs(this.width),
                                     Math.abs(this.height));

    var r = Math.abs(smallestDimension / 2);
    var cx = this.x + r;
    var cy = this.y + r;

    this.feature.set({
        'left': cx * canvas.displayToActualSizeRatio + canvas.offset.x,
        'top': cy * canvas.displayToActualSizeRatio + canvas.offset.y,
        'width': Math.abs(r),
        'height': Math.abs(r),
        'scaleX': canvas.displayToActualSizeRatio,
        'scaleY': canvas.displayToActualSizeRatio
    }).setRadius(Math.abs(r));

    this.updateFeature();
};

/**
 * Handles a mouseup event by completing the circle.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawCircleControl.prototype.handleMouseup = function(event) {
    var viewportDiv = this.viewport.getElement();

    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    this.viewport.registerHandledMouseEvent(event);

    this.finishDrawFeature();
};
