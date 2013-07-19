goog.provide('sc.canvas.PanZoomGesturesControl');

goog.require('goog.events');
goog.require('jquery.event.drag');
goog.require('jquery.mousewheel');
goog.require('sc.canvas.Control');

/**
 * A CanvasViewport controller which enables panning and zooming through mouse
 * drags and scroll-wheel events.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {sc.canvas.Control}
 *
 * @param {sc.canvas.CanvasViewport} viewport The canvas viewport to
 * control.
 */
sc.canvas.PanZoomGesturesControl = function(viewport) {
    sc.canvas.Control.call(this, viewport);

    this.timeOfLastDragEnd = goog.now();
    this.viewport.registerHandledMouseEvent(this.timeOfLastDragEnd);
    
    this.mouseIsDown = false;

    this.proxiedHandleMousedown = this.handleMousedown.bind(this);
    this.proxiedHandleMouseup = this.handleMouseup.bind(this);
    this.proxiedHandleMousemove = this.handleMousemove.bind(this);
    this.proxiedHandleMousewheel = this.handleMousewheel.bind(this);
    this.proxiedHandleDblclick = this.handleDblclick.bind(this);
};
goog.inherits(sc.canvas.PanZoomGesturesControl, sc.canvas.Control);

sc.canvas.PanZoomGesturesControl.prototype.controlName = 'PanZoomGesturesControl';

/**
 * @inheritDoc
 */
sc.canvas.PanZoomGesturesControl.prototype.activate = function() {
    sc.canvas.Control.prototype.activate.call(this);

    var fabricCanvas = this.viewport.fabricCanvas;
    var div = this.viewport.getTopCanvasElement();
    div = this.viewport.getElement();
    
    fabricCanvas.on('mouse:down', this.proxiedHandleMousedown);
    fabricCanvas.on('mouse:move', this.proxiedHandleMousemove);
    fabricCanvas.on('mouse:up', this.proxiedHandleMouseup);

    jQuery(div).on('mousewheel', this.proxiedHandleMousewheel);
    jQuery(div).on('dblclick', this.proxiedHandleDblclick);

    jQuery(div).addClass('sc-CanvasViewport-drag');
};

/**
 * @inheritDoc
 */
sc.canvas.PanZoomGesturesControl.prototype.deactivate = function() {
    var $viewport = jQuery(this.viewport.getElement());

    var fabricCanvas = this.viewport.fabricCanvas;
    var div = this.viewport.getElement();
    
    fabricCanvas.off('mouse:down', this.proxiedHandleMousedown);
    fabricCanvas.off('mouse:move', this.proxiedHandleMousemove);
    fabricCanvas.off('mouse:up', this.proxiedHandleMouseup);

    jQuery(div).off('mousewheel', this.proxiedHandleMousewheel);
    jQuery(div).off('dblclick', this.proxiedHandleDblclick);

    $viewport.removeClass('sc-CanvasViewport-drag');

    sc.canvas.Control.prototype.deactivate.call(this);
};

/**
 * Event handler for mousewheel events on the viewport
 * @this {sc.canvas.PanZoomGesturesControl}
 * @param {Event} event The jQuery event fired.
 * @return {boolean} False to stop propagation.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleMousewheel =
function(event, delta, deltaX, deltaY) {
    event.preventDefault();
    event.stopPropagation();

    if (this.viewport.isEmpty()) {
        return;
    }

    if (event.shiftKey) {
        this.viewport.panByPageCoords(
            deltaX * 3,
            -deltaY * 3
        );
    }
    else {
        var factor = 1;

        if (deltaY > 0) {
            factor = 1 + Math.log(deltaY + 1) / 30;
        }
        else if (deltaY < 0) {
            factor = 1 - Math.log(-deltaY + 1) / 30;
        }

        var canvasCoords = this.viewport.clientToCanvasCoord(event.clientX, event.clientY);
        var layerCoords = this.viewport.pageToLayerCoord(event.pageX, event.pageY);

        this.viewport.pauseRendering();
        this.viewport.zoomByFactor(factor);
        this.viewport.moveCanvasCoordToLayerCoord(canvasCoords, layerCoords);
        this.viewport.resumeRendering();
    }

    return false;
};

sc.canvas.PanZoomGesturesControl.prototype.handleMousedown = function(opts) {
    var event = opts.e;

    this.isDragging = true;
    this.viewport.isDragging = true;

    this.lastPageX = event.pageX;
    this.lastPageY = event.pageY;

    this.mouseDownX = event.pageX;
    this.mouseDownY = event.pageY;

    jQuery(document.body).addClass('user-select-none');

    this.dispatchEvent(new goog.events.Event('panstart', this));
};

sc.canvas.PanZoomGesturesControl.prototype.handleMousemove = function(opts) {
    if (this.isDragging && this.viewport.canvas) {
        var event = opts.e;

        this.viewport.registerHandledMouseEvent(event);

        var dx = event.pageX - this.lastPageX;
        var dy = event.pageY - this.lastPageY;

        this.lastPageX = event.pageX;
        this.lastPageY = event.pageY;

        this.viewport.panByPageCoords(dx, dy);

        event.preventDefault();

        this.dispatchEvent(new goog.events.Event('pan', this));
    }
};

sc.canvas.PanZoomGesturesControl.prototype.handleMouseup = function(opts) {
    var event = opts.e;

    this.isDragging = false;
    this.viewport.isDragging = false;
    this.timeOfLastDragEnd = event.timeStamp;
    this.viewport.registerHandledMouseEvent(event);

    if (!(this.mouseDownX == event.pageX && this.mouseDownY == event.pageY)) {
        this.viewport.registerHandledMouseEvent(event);
        event.preventDefault();
        event.stopPropagation();
    }

    jQuery(document.body).removeClass('user-select-none');

    this.dispatchEvent(new goog.events.Event('panstop', this));
};

/**
 * Event handler for dblclick events on the viewport.
 * @this {sc.canvas.PanZoomGesturesControl}
 * Double clicks will cause the viewport to zoom in, and double clicks with the
 * shift key depressed will cause the viewport to zoom out.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleDblclick = function(event) {
    var canvasCoords = this.viewport.clientToCanvasCoord(event.pageX, event.pageY);

    this.viewport.pauseRendering();

    if (event.shiftKey) {
        this.viewport.zoomByFactor(1 / 1.5);
    }
    else {
        this.viewport.zoomByFactor(1.5);
    }
    this.viewport.centerOnCanvasCoord(canvasCoords);

    this.viewport.resumeRendering();

    this.viewport.registerHandledMouseEvent(event);
};
