goog.provide('sc.canvas.DrawRectControl');

goog.require('sc.canvas.DrawFeatureControl');

/**
 * A CanvasViewport controller which allows rectangles to be drawn by dragging
 * on the canvas.
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
sc.canvas.DrawRectControl = function(viewport, databroker) {
    sc.canvas.DrawFeatureControl.call(this, viewport, databroker);

    this.featureType = 'rect';

    this.proxiedHandleMousedown = jQuery.proxy(this.handleMousedown, this);
    this.proxiedHandleMousemove = jQuery.proxy(this.handleMousemove, this);
    this.proxiedHandleMouseup = jQuery.proxy(this.handleMouseup, this);
};
goog.inherits(sc.canvas.DrawRectControl, sc.canvas.DrawFeatureControl);

sc.canvas.DrawRectControl.prototype.controlName = 'DrawRectControl';

/**
 * @inheritDoc
 */
sc.canvas.DrawRectControl.prototype.activate = function() {
    sc.canvas.DrawFeatureControl.prototype.activate.call(this);

    this.viewport.fabricCanvas.on('mouse:down', this.proxiedHandleMousedown);
};

/**
 * @inheritDoc
 */
sc.canvas.DrawRectControl.prototype.deactivate = function() {
    var viewportDiv = this.viewport.viewportDiv;

    this.viewport.fabricCanvas.off('mouse:down', this.proxiedHandleMousedown);
    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    sc.canvas.DrawFeatureControl.prototype.deactivate.call(this);
};

/**
 * Handles a mousedown event by drawing a rectangle with 0 width and height and
 * saving it, then adding mousemove handlers to resize the rectangle.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawRectControl.prototype.handleMousedown = function(opts) {
    var event = opts.e;

    this.beginDrawFeature();

    var viewportDiv = this.viewport.viewportDiv;
    var canvas = this.viewport.canvas;
    
    this.viewport.registerHandledMouseEvent(event);

    var canvasCoords = this.pageToCanvasCoord(event.pageX, event.pageY);

    this.startX = canvasCoords.x;
    this.startY = canvasCoords.y;
    this.width = 0;
    this.height = 0;

    this.feature = canvas.addRect(this.startX, this.startY,
                                  this.width, this.height, this.uri);
    this.updateFeatureCoords();

    this.viewport.fabricCanvas.on('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.on('mouse:up', this.proxiedHandleMouseup);
};

/**
 * Handles a mousemove event by resizing the saved rectangle.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawRectControl.prototype.handleMousemove = function(opts) {
    var event = opts.e;

    var canvas = this.viewport.canvas;

    this.viewport.registerHandledMouseEvent(event);
    
    var canvasCoords = this.pageToCanvasCoord(event.pageX, event.pageY);

    var x, y;

    // Check to see if the starting coordinates are now the top left or bottom
    // right of the rectangle
    if (canvasCoords.x < this.startX) {
        x = canvasCoords.x;
    }
    else {
        x = this.startX;
    }

    if (canvasCoords.y < this.startY) {
        y = canvasCoords.y;
    }
    else {
        y = this.startY;
    }

    this.width = Math.abs(canvasCoords.x - this.startX);
    this.height = Math.abs(canvasCoords.y - this.startY);

    this.feature.set({
        'left': (x + this.width / 2) * canvas.displayToActualSizeRatio + canvas.offset.x,
        'top': (y + this.height / 2) * canvas.displayToActualSizeRatio + canvas.offset.y,
        'width': this.width,
        'height': this.height
    });

    this.updateFeature();
};

/**
 * Handles a mouseup event by completing the rectangle.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.DrawRectControl.prototype.handleMouseup = function(opts) {
    var event = opts.e;

    var viewportDiv = this.viewport.viewportDiv;

    this.viewport.fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    this.viewport.fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    this.viewport.registerHandledMouseEvent(event);

    this.finishDrawFeature();
};
