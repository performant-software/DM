goog.provide('sc.canvas.PanZoomGesturesControl');

goog.require('goog.events');
goog.require('jquery.event.drag');
goog.require('jquery.jQuery');
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

    this.proxiedHandleDraginit = jQuery.proxy(this.handleDraginit, this);
    this.proxiedHandleMousewheel = jQuery.proxy(this.handleMousewheel, this);
    this.proxiedHandleDrag = jQuery.proxy(this.handleDrag, this);
    this.proxiedHandleDragend = jQuery.proxy(this.handleDragend, this);
    this.proxiedHandleDblclick = jQuery.proxy(this.handleDblclick, this);
};
goog.inherits(sc.canvas.PanZoomGesturesControl, sc.canvas.Control);

/**
 * @inheritDoc
 */
sc.canvas.PanZoomGesturesControl.prototype.activate = function() {
    sc.canvas.Control.prototype.activate.call(this);

    var $viewport = jQuery(this.viewport.viewportDiv);

    $viewport.bind('draginit', this.proxiedHandleDraginit);

    $viewport.bind('mousewheel', this.proxiedHandleMousewheel);

    $viewport.bind('dblclick', this.proxiedHandleDblclick);

    $viewport.addClass('sc-CanvasViewport-drag');
};

/**
 * @inheritDoc
 */
sc.canvas.PanZoomGesturesControl.prototype.deactivate = function() {
    var $viewport = jQuery(this.viewport.viewportDiv);

    $viewport.unbind('draginit', this.proxiedHandleDraginit);
    $viewport.trigger('dragend');
    $viewport.unbind('drag', this.proxiedHandleDrag);
    $viewport.unbind('dragend', this.proxiedHandleDragend);

    $viewport.unbind('mousewheel', this.proxiedHandleMousewheel);

    $viewport.unbind('dblclick', this.proxiedHandleDblclick);

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

    if (event.shiftKey) {
        this.viewport.panByPageCoords(
            deltaX * 3,
            -deltaY * 3
        );
    }
    else {
        var factor = 1;

        if (delta > 0) {
            factor = 1 + Math.log(delta + 1) / 30;
        }
        else if (delta < 0) {
            factor = 1 - Math.log(-delta + 1) / 30;
        }

        this.viewport.zoomByFactor(
            factor,
            {x: event.pageX, y: event.pageY}
        );
    }

    return false;
};

/**
 * Event handler for draginit events on the viewport
 * @this {sc.canvas.PanZoomGesturesControl}
 * @param {Event} event The browser event.
 * @param {Object} dragDrop The DragDrop plugin data.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleDraginit = function(event,
                                                                     dragDrop) {
    var $viewport = jQuery(this.viewport.viewportDiv);
    var self = this;

    this.isDragging = true;
    this.viewport.isDragging = true;

    this.lastPageX = event.pageX;
    this.lastPageY = event.pageY;

    $viewport.bind('drag', this.proxiedHandleDrag);

    $viewport.one('dragend', this.proxiedHandleDragend);
};

/**
 * Event handler for drag events on the viewport
 * @this {sc.canvas.PanZoomGesturesControl}
 * @param {Event} event The browser event.
 * @param {Object} dragDrop The DragDrop plugin data.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleDrag = function(event,
                                                                  dragDrop) {
    var dx = this.lastPageX - event.pageX;
    var dy = this.lastPageY - event.pageY;

    this.lastPageX = event.pageX;
    this.lastPageY = event.pageY;

    this.viewport.panByPageCoords(dx, dy);
};

/**
 * Event handler for dragend events on the viewport
 * @this {sc.canvas.PanZoomGesturesControl}
 * @param {Event} event The browser event.
 * @param {Object} dragDrop The DragDrop plugin data.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleDragend = function(event,
                                                                     dragDrop) {
    var $viewport = jQuery(this.viewport.viewportDiv);

    this.isDragging = false;
    this.viewport.isDragging = false;
    this.timeOfLastDragEnd = event.timeStamp;
    this.viewport.registerHandledMouseEvent(event);

    $viewport.unbind('drag', this.proxiedHandleDrag);
};

/**
 * Event handler for dblclick events on the viewport.
 * @this {sc.canvas.PanZoomGesturesControl}
 * Double clicks will cause the viewport to zoom in, and double clicks with the
 * shift key depressed will cause the viewport to zoom out.
 * @param {Event} event The jQuery event fired.
 */
sc.canvas.PanZoomGesturesControl.prototype.handleDblclick = function(event) {
    if (event.shiftKey) {
        this.viewport.zoomByFactor(1 / 1.5, {x: event.pageX, y: event.pageY});
    }
    else {
        this.viewport.zoomByFactor(1.5, {x: event.pageX, y: event.pageY});
    }

    this.viewport.registerHandledMouseEvent(event);
};
