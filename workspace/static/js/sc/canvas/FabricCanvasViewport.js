goog.provide('sc.canvas.FabricCanvasViewport');

goog.require('fabric');
goog.require('goog.object');
goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');
goog.require('goog.dom.DomHelper');
goog.require('goog.structs.Set');
goog.require('goog.async.Throttle');

sc.canvas.FabricCanvasViewport = function(databroker, options) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;

    this.options = jQuery.extend(true, {
        doc: window.document
    }, options || {});

    this.domHelper = new goog.dom.DomHelper(this.options.doc);
    var domHelper = new goog.dom.DomHelper(this.options.doc);

    this.baseDiv = domHelper.createDom('div', {'class': 'sc-CanvasViewport'});
    var canvasElement = domHelper.createDom('canvas');
    this.fabricCanvas = new fabric.Canvas(canvasElement, {
        selection: false,
        defaultCursor: 'inherit',
        hoverCursor: 'inherit',
        renderOnAddition: false
    });
    this.baseDiv.appendChild(canvasElement);
    this.baseDiv.appendChild(this.fabricCanvas.getSelectionElement());

    this._setupEventListeners();

    this.canvas = null;

    this.controlsByName = new goog.structs.Map();
    this.activeControls = new goog.structs.Set();
    this.inactiveControls = new goog.structs.Set();

    this.renderThrottle = new goog.async.Throttle(
        this._renderCanvas.bind(this),
        sc.canvas.FabricCanvasViewport.RENDER_INTERVAL
    );
};
goog.inherits(sc.canvas.FabricCanvasViewport, goog.events.EventTarget);

sc.canvas.FabricCanvasViewport.RENDER_INTERVAL = 18;

sc.canvas.FabricCanvasViewport.prototype._renderCanvas = function() {
    this.isRendering = true;

    this.fabricCanvas.clear();
    if (this.canvas) {
        goog.structs.forEach(this.canvas.objects, function(obj) {
            this.fabricCanvas.add(obj);
        }, this);
    }
    this.fabricCanvas.renderAll();

    this.isRendering = false;
    this.isAwaitingRenderFinish = false;
};

sc.canvas.FabricCanvasViewport.prototype.complainIfNoCanvas = function() {
    if (this.canvas == null) {
        var error = new Error('CanvasViewport has no canvas yet');
        error.canvasViewport = this;
        throw error;
    }
};

sc.canvas.FabricCanvasViewport.prototype._addControl = function(control) {
    if (this.controlsByName.containsKey(control.controlName)) {
        var e = new Error("A " + control.controlName + " control has already been registered for this canvas viewport");
        e.control = control;
        e.viewport = this;
        throw e;
    }

    if (control.isActive) {
        this.activeControls.add(control);
    }
    else {
        this.inactiveControls.add(control);
    }

    this.controlsByName.set(control.controlName, control);
};

sc.canvas.FabricCanvasViewport.prototype._removeControl = function(control) {
    this.inactiveControls.remove(control);
    this.activeControls.remove(control);
    this.controlsByName.remove(control.controlName);
};

sc.canvas.FabricCanvasViewport.prototype.getActiveControls = function() {
    return this.activeControls.getValues();
};

sc.canvas.FabricCanvasViewport.prototype.getInactiveControls = function() {
    return this.inactiveControls.getValues();
};

sc.canvas.FabricCanvasViewport.prototype.getControls = function() {
    return this.getActiveControls().concat(this.getInactiveControls());
};

sc.canvas.FabricCanvasViewport.prototype.getControl = function(name) {
    return this.controlsByName.get(name);
};

/**
 * Activates all inactive controls which have been connected to this viewport.
 * Note: You should really be sure you want to do this, as there may be controls
 * you aren't expecting attached.
 *
 * @return {Array.<sc.canvas.Control>} The controls which have been activated.
 */
sc.canvas.FabricCanvasViewport.prototype.activateAllControls = function() {
    var values = this.getInactiveControls();

    for (var i = 0, len = values.length; i < len; i++) {
        var control = values[i];

        control.activate();
    }

    return values;
};

/**
 * Deactivates all active controls which have been connected to this viewport.
 *
 * @return {Array.<sc.canvas.Control>} The controls which have been deactivated.
 */
sc.canvas.FabricCanvasViewport.prototype.deactivateAllControls = function() {
    var values = this.getActiveControls();

    for (var i = 0, len = values.length; i < len; i++) {
        var control = values[i];

        control.deactivate();
    }

    return values;
};

/**
 * Sets the time of the last handled click event on the canvas so that click
 * events can be supressed as necessary.
 *
 * @param {?(number|Event|null)} opt_time Optionally the time at which the event
 * was handled, the event itself, or null to use the time this method was
 * called.
 */
sc.canvas.FabricCanvasViewport.prototype.registerHandledMouseEvent = function(opt_time) {
    if (opt_time == null) {
        this.timeOfLastHandledClick = goog.now();
    }
    else if (goog.isNumber(opt_time)) {
        this.timeOfLastHandledClick = opt_time;
    }
    else if (goog.isNumber(opt_time.timeStamp)) {
        this.timeOfLastHandledClick = opt_time.timeStamp;
    }
    else {
        this.timeOfLastHandledClick = goog.now();
    }

    if (goog.isFunction(opt_time.stopPropagation)) {
        opt_time.stopPropagation();
    }
};

/**
 * Allows the CanvasViewer to determine if a click was intended as a resource
 * click or was the result of a drag
 *
 * @return {boolean} True if a click event should fire.
 */
sc.canvas.FabricCanvasViewport.prototype.shouldFireMouseEvents = function() {
    var time = goog.now();

    var msRange = 100;

    return time - this.timeOfLastHandledClick > msRange;
};

sc.canvas.FabricCanvasViewport.prototype.resize = function(width, height) {
    if (height == null) {
        height = width.height;
        width = width.width;
    }

    var oldSize = this.size;
    this.size = new goog.math.Size(width, height);

    jQuery(this.baseDiv).width(width).height(height);

    if (! this.isEmpty()) {
        var center = this.getCenterCoord();
    }

    this.fabricCanvas.setWidth(width).setHeight(height);

    if (center) {
        this.centerOnCanvasCoord(center);
    }

    return this;
};

sc.canvas.FabricCanvasViewport.prototype.isEmpty = function() {
    return ! this.canvas;
};

sc.canvas.FabricCanvasViewport.prototype.render = function(div) {
    div.appendChild(this.baseDiv);

    return this;
};

sc.canvas.FabricCanvasViewport.prototype.getElement = function() {
    return this.baseDiv;
};

sc.canvas.FabricCanvasViewport.prototype.setCanvas = function(canvas) {
    this.canvas = canvas;
    canvas.viewport = this;

    this.fabricCanvas.clear();

    goog.structs.forEach(canvas.objects, function(obj) {
        this.fabricCanvas.add(obj);
    }, this);

    this.requestFrameRender();

    var event = new goog.events.Event('canvasAdded', this);
    this.dispatchEvent(event);

    return this;
};

sc.canvas.FabricCanvasViewport.prototype.clear = function() {
    var canvas = this.canvas;

    if (canvas) {
        this.canvas = null;
        canvas.viewport = null;

        canvas = null;
    }

    if (! this.fabricCanvas.isEmpty()) {
        this.fabricCanvas.clear();
        this.requestFrameRender();
    }
};

sc.canvas.FabricCanvasViewport.prototype.addDeferredCanvas = function(deferred) {
    var _canvas = null;

    var withCanvas = function(canvas) {
        if (_canvas == null) {
            _canvas = canvas;
            this.setCanvas(canvas);
        }
    }.bind(this);

    deferred.progress(withCanvas).done(withCanvas);
};

/**
 * Pans by the given page coordinates (relative to the current position)
 *
 * @param {(number|Object)} x The amount of x pixels to pan by or an object with
 * x and y properties.
 * @param {?number} y The amount of y pixels to pan by.
 */
sc.canvas.FabricCanvasViewport.prototype.panByPageCoords = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    if (x == 0 && y == 0) {
        return; // This prevents performing a dom operation to get the current
        // position without any need to do so, which provides a noticable
        // performance improvement with the pan/zoom controls.
    }

    this.complainIfNoCanvas();

    var offset = this.canvas.getOffset();
    this.canvas.setOffset(offset.x + x, offset.y + y);

    this.requestFrameRender();

    this.fireBoundsChanged();
};

sc.canvas.FabricCanvasViewport.prototype.centerOnLayerCoord = function(x, y) {
    this.centerOnCanvasCoord(this.layerToCanvasCoord(x, y));
};

sc.canvas.FabricCanvasViewport.prototype.centerOnCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var size = this.getDisplaySize();

    this.moveCanvasCoordToLayerCoord(
        {
            x: x,
            y: y
        },
        {
            x: size.width / 2,
            y: size.height / 2
        }
    );

    this.requestFrameRender();
};

sc.canvas.FabricCanvasViewport.prototype.moveCanvasCoordToLayerCoord = function(canvasCoord, layerCoord) {
    this.canvas.setOffset(
        layerCoord.x - (canvasCoord.x * this.canvas.displayToActualSizeRatio),
        layerCoord.y - (canvasCoord.y * this.canvas.displayToActualSizeRatio)
    );

    this.requestFrameRender();
    this.fireBoundsChanged();
};

sc.canvas.FabricCanvasViewport.prototype.panToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.moveCanvasCoordToLayerCoord({x: x, y: y}, {x: 0, y: 0});
};

sc.canvas.FabricCanvasViewport.prototype.fireBoundsChanged = function() {
    var event = new goog.events.Event('bounds changed', this);

    event.getBounds = this.getBounds.bind(this);

    this.dispatchEvent(event);
};

/**
 * Returns the location of the top left corner of the canvas within the viewport
 * relative to the top left corner of the page.
 * @return {Object} An object with left and right number properties.
 */
sc.canvas.FabricCanvasViewport.prototype.getCanvasOffset = function() {
    this.complainIfNoCanvas();

    var viewportOffset = jQuery(this.baseDiv).offset();
    var x = viewportOffset.left;
    var y = viewportOffset.top;

    var internalOffset = canvas.getOffset();
    x += internalOffset.x;
    y += internalOffset.y;

    return {
        left: x,
        top: y
    };
};

sc.canvas.FabricCanvasViewport.prototype.layerToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var offset = this.canvas.getOffset();
    x -= offset.x;
    y -= offset.y;

    var ratio = this.canvas.getDisplayToActualSizeRatio();
    x /= ratio;
    y /= ratio;

    return {
        x: x,
        y: y
    };
};

sc.canvas.FabricCanvasViewport.prototype.canvasToLayerCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var ratio = this.canvas.getDisplayToActualSizeRatio();
    x *= ratio;
    y *= ratio;

    var offset = this.canvas.getOffset();
    x += offset.x;
    y += offset.y;

    return {
        x: x,
        y: y
    };
};

/**
 * Converts page coordinates (such as those from a mouse event) into coordinates
 * on the canvas. (Useful with jQuery events, which calculate pageX and pageY
 * using client coordinates and window scroll values).
 *
 * @param {(number|Object)} x The page x coordinate or an object with x and y
 * properties.
 * @param {?number} y The page y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FabricCanvasViewport.prototype.pageToCanvasCoord = function(x, y) {
    return this.layerToCanvasCoord(this.pageToLayerCoord(x, y));
};

/**
 * Converts client coordinates (such as those from a mouse event) into
 * coordinates on the canvas.
 *
 * @param {(number|Object)} x The client x coordinate or an object with x and y
 * properties.
 * @param {?number} y The client y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FabricCanvasViewport.prototype.clientToCanvasCoord = function(x, y) {
    return this.pageToCanvasCoord(this.clientToPageCoord(x, y));
};

/**
 * Converts canvas coordinates into the corresponding coordinates on the page.
 *
 * @param {(number|Object)} x The canvas x coordinate or an object with x and y
 * properties.
 * @param {?number} y The canvas y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FabricCanvasViewport.prototype.canvasToPageCoord = function(x, y) {
    return this.layerToPageCoord(this.canvasToLayerCoord(x, y));
};

/**
 * Converts canvas coordinates into the corresponding client coordinates.
 *
 * @param {(number|Object)} x The canvas x coordinate or an object with x and y
 * properties.
 * @param {?number} y The canvas y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FabricCanvasViewport.prototype.canvasToClientCoord = function(x, y) {
    return this.pageToClientCoord(this.canvasToPageCoord(x, y));
};

sc.canvas.FabricCanvasViewport.prototype.proportionalToPageCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var displaySize = this.canvas.getDisplaySize();
    var offset = this.getCanvasOffset();

    x *= displaySize.width;
    y *= displaySize.height;

    x += offset.left;
    y += offset.top;

    return {
        'x': x,
        'y': y
    };
};

sc.canvas.FabricCanvasViewport.prototype.pageToClientCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x - jQuery(window).scrollLeft(),
        'y': y - jQuery(window).scrollTop()
    };
};

sc.canvas.FabricCanvasViewport.prototype.clientToPageCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x + jQuery(window).scrollLeft(),
        'y': y + jQuery(window).scrollTop()
    };
};

sc.canvas.FabricCanvasViewport.prototype.pageToLayerCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var offset = jQuery(this.baseDiv).offset();
    x -= offset.left;
    y -= offset.top;

    return {
        x: x, 
        y: y
    };
};

sc.canvas.FabricCanvasViewport.prototype.layerToPageCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var offset = jQuery(this.baseDiv).offset();
    x += offset.left;
    y += offset.top;

    return {
        x: x, 
        y: y
    };
};

sc.canvas.FabricCanvasViewport.prototype.layerToClientCoord = function(x, y) {
    return this.pageToClientCoord(this.layerToPageCoord(x, y));
};

sc.canvas.FabricCanvasViewport.prototype.proportionalToClientCoord = function(x, y) {
    return this.pageToClientCoord(this.proportionalToClientCoord(x, y));
};

/**
 * Returns the bounds of the viewport in canvas coordinates (the size and
 * coordinates of the viewable area of the canvas, which may possibly be larger
 * than the entire canvas and include negative coordinates).
 *
 * @return {Object} An object with the coordinates and dimensions of the
 * bounding box specified in both x, x2, y, y2 and top, left, bottom, right
 * formats, including width and height properties.
 */
sc.canvas.FabricCanvasViewport.prototype.getBounds = function() {
    var size = this.getDisplaySize();
    var canvasTopLeft = this.layerToCanvasCoord(0, 0);
    var canvasBottomRight = this.layerToCanvasCoord(size.width, size.height);

    var width = canvasBottomRight.x - canvasTopLeft.x;
    var height = canvasBottomRight.y - canvasTopLeft.y;

    return {
        'top': canvasTopLeft.y,
        'y': canvasTopLeft.y,
        'left': canvasTopLeft.x,
        'x': canvasTopLeft.x,
        'bottom': canvasBottomRight.y,
        'y2': canvasBottomRight.y,
        'right': canvasBottomRight.x,
        'x2': canvasBottomRight.x,
        'width': width,
        'height': height,
        'cx': canvasTopLeft.x + width / 2,
        'cy': canvasTopLeft.y + height / 2
    };
};

sc.canvas.FabricCanvasViewport.prototype.getCenterCoord = function() {
    var bounds = this.getBounds();

    return {
        x: bounds.cx,
        y: bounds.cy
    };
};

sc.canvas.FabricCanvasViewport.prototype.getTopCanvasElement = function() {
    return this.fabricCanvas.getSelectionElement();
};

sc.canvas.FabricCanvasViewport.LOADING_CURSOR_DISPLAY_DELAY = 700;

sc.canvas.FabricCanvasViewport.prototype._maybeShowProgressCursor = function() {
    if (this.isAwaitingRenderFinish) {
        
    }
};

sc.canvas.FabricCanvasViewport.prototype.setCursor = function(cursorName) {
    this.baseDiv.style.cursor = cursorName;
};

sc.canvas.FabricCanvasViewport.prototype.showProgressCursor = function() {
    if (! this.isShowingProgressCursor) {
        this.isShowingProgressCursor = true;
        jQuery(this.getElement()).addClass('sc-CanvasViewport-progress');
    }
};

sc.canvas.FabricCanvasViewport.prototype.hideProgressCursor = function() {
    if (this.isShowingProgressCursor) {
        jQuery(this.getElement()).removeClass('sc-CanvasViewport-progress');
        this.isShowingProgressCursor = false;
    }
};

sc.canvas.FabricCanvasViewport.prototype.requestFrameRender = function() {
    this.isAwaitingRenderFinish = true;

    window.setTimeout(
        this._maybeShowProgressCursor.bind(this),
        sc.canvas.FabricCanvasViewport.LOADING_CURSOR_DISPLAY_DELAY
    );

    this.renderThrottle.fire();

    this.hideProgressCursor();

    return this;
};

sc.canvas.FabricCanvasViewport.prototype.pauseRendering = function() {
    this.renderThrottle.pause();

    return this;
};

sc.canvas.FabricCanvasViewport.prototype.resumeRendering = function() {
    this.renderThrottle.resume();

    return this;
};

/**
 * Scales the size of the canvas by a multiplicative factor relative to its
 * current display size
 *
 * @param {number} factor 0-1 shrinks, 1+ enlarges.
 * @param {?Object} opt_centerOn The page coordinates to center the zoom on
 * (defaults to the center of the view).
 */
sc.canvas.FabricCanvasViewport.prototype.zoomByFactor = function(factor,
                                                           opt_centerOn) {
    this.complainIfNoCanvas();

    if (factor == 1) {
        return;
    }

    this.zoomToRatio(factor * this.canvas.getDisplayToActualSizeRatio(), opt_centerOn);
};

/**
 * Scales the size of the canvas so that its display size is ratio * actual size
 *
 * @param {number} ratio The ratio of display size to actual size to use.
 * @param {?Object} opt_centerOn The layer coordinates to center the zoom on
 * (defaults to the center of the view).
 */
sc.canvas.FabricCanvasViewport.prototype.zoomToRatio = function(ratio, opt_centerOn) {
    var canvas = this.canvas;
    this.complainIfNoCanvas();

    if (canvas.getDisplayToActualSizeRatio() == ratio) {
        return;
    }

    var actualSize = canvas.getSize();
    var oldSize = canvas.getDisplaySize();
    var center = this.getCenterCoord();

    var newWidth = actualSize.width * ratio;
    var newHeight = actualSize.height * ratio;

    var newSize = new goog.math.Size(newWidth, newHeight);
    if (! this.canZoomToSize(newSize)) {
        var closestRatio = this.calculateClosestAllowedZoomRatio(ratio);
        this.zoomToRatio(closestRatio, opt_centerOn);

        return;
    }

    canvas.setDisplayToActualSizeRatio(ratio);
    this.centerOnCanvasCoord(center);

    this.requestFrameRender();

    this.fireBoundsChanged();
};

/**
 * The smallest width or height at which a canvas may display (in screen
 * pixels).
 * Effectively limits how far the user can zoom out.
 * @const
 */
sc.canvas.FabricCanvasViewport.MIN_CANVAS_DISPLAY_SIZE = 50;

/**
 * The maximum ratio of display size (in screen pixels) to actual size (in
 * canvas pixels) at which a canvas may be displayed.
 * Effectively limits how far the user can zoom in.
 * @const
 */
sc.canvas.FabricCanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO = 25;

/**
 * Returns whether the canvas will meet the minimum and maximum size constraints
 * if it is resized to a given size.
 *
 * @param {object} size The new size to try (as an object with width and height
 * properties).
 * @return {boolean} True if the resize should be performed.
 */
sc.canvas.FabricCanvasViewport.prototype.canZoomToSize = function(size) {
    this.complainIfNoCanvas();

    var actualSize = this.canvas.getSize();

    var minDisplaySize = sc.canvas.FabricCanvasViewport.MIN_CANVAS_DISPLAY_SIZE;
    var maxDisplayRatio = sc.canvas.FabricCanvasViewport.
                          MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO;

    var displayToActualRatio = size.width / actualSize.width;
    var smallestAllowedRatio = minDisplaySize / actualSize.getShortest();

    return (displayToActualRatio >= smallestAllowedRatio &&
    displayToActualRatio <= maxDisplayRatio);
};

/**
 * If the given zoom ratio is not within the bounds for canvas display size, the
 * closest ratio is returned; otherwise, the given ratio is returned
 *
 * @param {number} ratio The ratio of display size to actual size to test.
 * @return {number} The valid ratio or the closest valid ratio.
 */
sc.canvas.FabricCanvasViewport.prototype.calculateClosestAllowedZoomRatio = function(
                                                                       ratio) {
    if (ratio > sc.canvas.FabricCanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO) {
        return sc.canvas.FabricCanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO;
    }

    this.complainIfNoCanvas();

    var actualSize = this.canvas.getSize();

    var minDisplaySize = sc.canvas.FabricCanvasViewport.MIN_CANVAS_DISPLAY_SIZE;
    var smallestAllowedRatio = minDisplaySize / actualSize.getShortest();

    if (ratio < smallestAllowedRatio) {
        return smallestAllowedRatio;
    }
    else {
        return ratio;
    }
};

/**
 * Zooms the viewport so that the canvas fits within the viewport at the largest
 * size possible.
 *
 * @return {sc.canvas.FabricCanvasViewport} This viewport.
 */
sc.canvas.FabricCanvasViewport.prototype.zoomToFit = function() {
    this.complainIfNoCanvas();

    var viewportDisplaySize = this.getDisplaySize();
    var canvasSize = this.canvas.getSize();

    var ratio = Math.min(
        viewportDisplaySize.width / canvasSize.width,
        viewportDisplaySize.height / canvasSize.height
    );

    this.canvas.setDisplayToActualSizeRatio(ratio);

    this.moveCanvasCoordToLayerCoord({
        // Move the center of the canvas...
        x: canvasSize.width / 2,
        y: canvasSize.height / 2
    }, {
        // to the center of the viewport
        x: viewportDisplaySize.width / 2,
        y: viewportDisplaySize.height / 2
    });

    this.requestFrameRender();
    this.fireBoundsChanged();

    return this;
};

/**
 * Zooms the viewer so that the specified rectangle is completely visible
 *
 * @param {number} x The top left x coordinate of the rectangle.
 * @param {number} y The top left y coordinate of the rectangle.
 * @param {number} width The width of the rectangle.
 * @param {number} height The height of the rectangle.
 */
sc.canvas.FabricCanvasViewport.prototype.zoomToRect = function(x, y, width, height) {
    if (y == null) {
        y = x.y;
        width = x.width;
        height = x.height;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var canvas = this.canvas;
    var canvasSize = canvas.getSize();

    var rectSize = new goog.math.Size(width, height);
    rectSize.scaleToFit(this.getDisplaySize());
    var coord = this.canvasToLayerCoord(rectSize.width, rectSize.height);
    var ratio = coord.x / width;

    this.zoomToRatio(ratio);
    this.centerOnCanvasCoord(x + width / 2, y + height / 2);
};

sc.canvas.FabricCanvasViewport.prototype.getDisplaySize = function() {
    return new goog.math.Size(
        this.fabricCanvas.getWidth(),
        this.fabricCanvas.getHeight()
    );
};

sc.canvas.FabricCanvasViewport.prototype.getSize = sc.canvas.FabricCanvasViewport.prototype.getDisplaySize;

sc.canvas.FabricCanvasViewport.MOUSE_EVENTS = new goog.structs.Set([
    'click',
    'dblclick',
    'mousewheel',
    'contextmenu',
    'mouseup',
    'mousedown',
    'mouseover',
    'mouseout',
    'mousemove'
]);

sc.canvas.FabricCanvasViewport.prototype._setupEventListeners = function() {
    var types = sc.canvas.FabricCanvasViewport.MOUSE_EVENTS.getValues();
    for (var i=0, len=types.length; i<len; i++) {
        var type = types[i];

        goog.events.listen(this.baseDiv, type, function(event) {
            if (this.shouldFireMouseEvents()) {
                var customEvent = new sc.canvas.FabricCanvasViewportEvent(
                    event.type, event, this,
                    type == 'mouseover' || type == 'mouseout' ? this : null
                );

                this.dispatchEvent(customEvent);
            }
        }, false, this);
    }

    goog.events.listen(this, 'mousemove', this._handleMouseMove, false, this);
};

sc.canvas.FabricCanvasViewport.prototype._handleMouseMove = function(event) {
    if (!this.shouldFireMouseEvents() || this.isEmpty()) {
        return;
    }

    var hoveredFeature = event.getFeature();

    if (hoveredFeature != this._hoveredFeature) {
        var oldHoveredFeature = this._hoveredFeature;
        this._hoveredFeature = hoveredFeature;

        if (oldHoveredFeature != null) {
            var mouseoutEvent = new sc.canvas.FabricCanvasViewportEvent('mouseout', event, this, oldHoveredFeature);
            this.dispatchEvent(mouseoutEvent);
        }

        if (hoveredFeature != null) {
            var mouseoverEvent = new sc.canvas.FabricCanvasViewportEvent('mouseover', event, this, hoveredFeature);
            this.dispatchEvent(mouseoverEvent);
        }
    }
};

sc.canvas.FabricCanvasViewport.prototype.getFeatureForEvent = function(event) {
    var feature = null;

    if (this.canvas) {
        feature = this.fabricCanvas.findTarget(event);
    }

    return feature;
};

goog.provide('sc.canvas.FabricCanvasViewportEvent');
sc.canvas.FabricCanvasViewportEvent = function(type, originalEvent, viewport, opt_feature) {
    goog.events.BrowserEvent.call(this, originalEvent, viewport);

    this.type = type;
    this.viewport = viewport;

    this.canvas = viewport.canvas;

    this.layerX = originalEvent.offsetX;
    this.layerY = originalEvent.offsetY;
    this.layerCoord = {
        x: this.layerX,
        y: this.layerY
    };

    if (this.canvas) {
        this.canvasCoord = viewport.layerToCanvasCoord(this.layerCoord);
        this.canvasX = this.canvasCoord.x;
        this.canvasY = this.canvasCoord.y;
    }

    if (opt_feature) {
        this._feature = opt_feature;
    }

    if (this.__defineGetter__) {
        this.__defineGetter__('feature', this.getFeature.bind(this));
        this.__defineGetter__('uri', this.getFeatureUri.bind(this));
    }
};
goog.inherits(sc.canvas.FabricCanvasViewportEvent, goog.events.BrowserEvent);

sc.canvas.FabricCanvasViewportEvent.prototype.getFeature = function() {
    if (! this._feature && ! this.viewport.isEmpty()) {
        this._feature = this.viewport.getFeatureForEvent(this);
    }

    return this._feature;
};

sc.canvas.FabricCanvasViewportEvent.prototype.getFeatureUri = function() {
    return this.canvas.getFabricObjectUri(this.getFeature());
};
