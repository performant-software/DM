goog.provide('sc.canvas.CanvasViewport');

goog.require('Raphael');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes'); // TODO: Move to control
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('jquery.event.drag');
goog.require('jquery.jQuery');
goog.require('sc.canvas.Canvas');

/**
 * A UI element which allows a canvas to be loaded, and viewed with panning and
 * zooming.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 *
 * @param {?object} options An object of options to be applied to the viewport.
 */
sc.canvas.CanvasViewport = function(databroker, options) {
    goog.events.EventTarget.call(this);
    
    this.databroker = databroker;
    
    var self = this;

    if (! options) {
        options = {};
    }

    this.options = jQuery.extend(true, {
        clickHandler: function(event) {
            if (event.uri == null) return;

            var resource = self.databroker.getResource(event.uri);

            if (resource.hasType('dms:AudioSegment')) {
                // A hacked together audio player for demo purposes in Safari 5+
                // only.
                var constraintAttrs = sc.data.Databroker.
                                 getConstraintAttrsFromUri(resource.getUri());

                var win = window.open(
                    constraintAttrs.baseUri,
                    '_blank',
                    'width=400,height=100'
                );
                jQuery(win).load(function() {
                    try {
                        var documentElement = win.document.documentElement;
                        var audio = documentElement.children[0].children[0];

                        audio.currentTime = constraintAttrs.startSeconds;
                        jQuery(audio).bind('timeupdate', function(timeEvent) {
                            var endSeconds = constraintAttrs.endSeconds;
                            if (endSeconds < audio.currentTime) {
                                audio.pause();
                                jQuery(audio).unbind('timeupdate');
                            }
                        });
                    }
                    catch (e) {}
                });
            }
        }
    }, options);

    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-CanvasViewport');

    this.viewportDiv = document.createElement('div');
    jQuery(this.viewportDiv).addClass('sc-CanvasViewport-viewport');
    this.contentDiv = document.createElement('div');
    jQuery(this.contentDiv).addClass('sc-CanvasViewport-content');

    this.canvas = null;

    this.isDragging = false;
    this.registerHandledMouseEvent();

    this.baseDiv.appendChild(this.viewportDiv);
    this.viewportDiv.appendChild(this.contentDiv);

    this.activeControls = new goog.structs.Set();
    this.inactiveControls = new goog.structs.Set();
};
goog.inherits(sc.canvas.CanvasViewport, goog.events.EventTarget);

/**
 * Activates all inactive controls which have been connected to this viewport.
 * Note: You should really be sure you want to do this, as there may be controls
 * you aren't expecting attached.
 *
 * @return {Array.<sc.canvas.Control>} The controls which have been activated.
 */
sc.canvas.CanvasViewport.prototype.activateAllControls = function() {
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
sc.canvas.CanvasViewport.prototype.deactivateAllControls = function() {
    var values = this.getActiveControls();

    for (var i = 0, len = values.length; i < len; i++) {
        var control = values[i];

        control.deactivate();
    }

    return values;
};

/**
 * Returns an array of all active controls which have been connected to this
 * viewport.
 *
 * @return {Array.<sc.canvas.Control>} The active controls.
 */
sc.canvas.CanvasViewport.prototype.getActiveControls = function() {
    return this.activeControls.getValues();
};

/**
 * Returns an array of all inactive controls which have been connected to this
 * viewport.
 *
 * @return {Array.<sc.canvas.Control>} The inactive controls.
 */
sc.canvas.CanvasViewport.prototype.getInactiveControls = function() {
    return this.inactiveControls.getValues();
};

/**
 * Returns an array of all the controls which have been connected to this
 * viewport.
 *
 * @return {Array.<sc.canvas.Control>} The controls.
 */
sc.canvas.CanvasViewport.prototype.getAllControls = function() {
    return this.getActiveControls().concat(this.getInactiveControls());
};

/**
 * Throws an error if no canvas has been added to the viewport yet
 */
sc.canvas.CanvasViewport.prototype.complainIfNoCanvas = function() {
    if (this.canvas == null) {
        throw 'CanvasViewport has no canvas yet';
    }
};

/**
 * Sets the time of the last handled click event on the canvas so that click
 * events can be supressed as necessary.
 *
 * @param {?(number|Event|null)} opt_time Optionally the time at which the event
 * was handled, the event itself, or null to use the time this method was
 * called.
 */
sc.canvas.CanvasViewport.prototype.registerHandledMouseEvent = function(opt_time) {
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
};

/**
 * Allows the CanvasViewer to determine if a click was intended as a resource
 * click or was the result of a drag
 *
 * @return {boolean} True if a click event should fire.
 */
sc.canvas.CanvasViewport.prototype.shouldFireMouseEvents = function() {
    var time = goog.now();

    var msRange = 100;

    return time - this.timeOfLastHandledClick > msRange;
};

/**
 * Pans to the given page coordinates
 *
 * @param {(number|Object)} x The x coordinate or an object with x and y
 * properties.
 * @param {?number} y The y coordinate.
 */
sc.canvas.CanvasViewport.prototype.panToPageCoords = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var offset = jQuery(this.viewportDiv).offset();

    jQuery(this.contentDiv).css({
        top: offset.top - y,
        left: offset.left - x
    });

    this.fireBoundsChanged();
};

/**
 * Pans by the given page coordinates (relative to the current position)
 *
 * @param {(number|Object)} x The amount of x pixels to pan by or an object with
 * x and y properties.
 * @param {?number} y The amount of y pixels to pan by.
 */
sc.canvas.CanvasViewport.prototype.panByPageCoords = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    if (x == 0 && y == 0) {
        return; // This prevents performing a dom operation to get the current
        // position without any need to do so, which provides a noticable
        // performance improvement with the pan/zoom controls.
    }

    var oldPosition = jQuery(this.contentDiv).position();

    jQuery(this.contentDiv).css({
        top: oldPosition.top - y,
        left: oldPosition.left - x
    });

    this.fireBoundsChanged();
};

/**
 * Pans to the given client coordinates
 *
 * @param {(number|Object)} x The x coordinate or an object with x and y
 * properties.
 * @param {?number} y The y coordinate.
 */
sc.canvas.CanvasViewport.prototype.panToClientCoords = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var scrollTop = jQuery(window).scrollTop();
    var scrollLeft = jQuery(window).scrollLeft();

    x += scrollTop;
    y += scrollLeft;

    this.panToPageCoords(x, y);
};

/**
 * Pans by the given client coordinates (relative to the current position).
 *
 * @param {(number|Object)} x The amount of x pixels to pan by or an object with
 * x and y properties.
 * @param {?number} y The amount of y pixels to pan by.
 */
sc.canvas.CanvasViewport.prototype.panByClientCoords = function(x, y) {
    this.panByPageCoords(x, y);
};

/**
 * Pans to the given canvas coordinates.
 *
 * @param {(number|Object)} x The x coordinate or an object with x and y
 * properties.
 * @param {?number} y The y coordinate.
 */
sc.canvas.CanvasViewport.prototype.panToCanvasCoords = function(x, y) {
    this.panToProportionalCoords(this.canvas.canvasToProportionalCoord(x, y));
};

/**
 * Pans to the given coordinates in proportions of the canvas dimensions.
 *
 * @param {(number|Object)} x The x coordinate or an object with x and y
 * properties.
 * @param {?number} y The y coordinate.
 */
sc.canvas.CanvasViewport.prototype.panToProportionalCoords = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var displaySize = this.canvas.getDisplaySize();

    jQuery(this.contentDiv).css({
        top: -y * displaySize.height,
        left: -x * displaySize.width
    });

    this.fireBoundsChanged();
};

/**
 * Pans by the given canvas coordinates (relative to the current position).
 *
 * @param {(number|Object)} x The amount of x pixels to pan by or an object with
 * x and y properties.
 * @param {?number} y The amount of y pixels to pan by.
 */
sc.canvas.CanvasViewport.prototype.panByCanvasCoords = function(x, y) {
    this.panByPageCoords(this.canvasToPageCoord(x, y));
};

/**
 * The smallest width or height at which a canvas may display (in screen
 * pixels).
 * Effectively limits how far the user can zoom out.
 * @const
 */
sc.canvas.CanvasViewport.MIN_CANVAS_DISPLAY_SIZE = 50;

/**
 * The maximum ratio of display size (in screen pixels) to actual size (in
 * canvas pixels) at which a canvas may be displayed.
 * Effectively limits how far the user can zoom in.
 * @const
 */
sc.canvas.CanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO = 25;

/**
 * Returns whether the canvas will meet the minimum and maximum size constraints
 * if it is resized to a given size.
 *
 * @param {object} size The new size to try (as an object with width and height
 * properties).
 * @return {boolean} True if the resize should be performed.
 */
sc.canvas.CanvasViewport.prototype.canZoomToSize = function(size) {
    this.complainIfNoCanvas();

    var actualSize = this.canvas.getActualSize();

    var minDisplaySize = sc.canvas.CanvasViewport.MIN_CANVAS_DISPLAY_SIZE;
    var maxDisplayRatio = sc.canvas.CanvasViewport.
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
sc.canvas.CanvasViewport.prototype.calculateClosestAllowedZoomRatio = function(
                                                                       ratio) {
    if (ratio > sc.canvas.CanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO) {
        return sc.canvas.CanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO;
    }

    this.complainIfNoCanvas();

    var actualSize = this.canvas.getActualSize();

    var minDisplaySize = sc.canvas.CanvasViewport.MIN_CANVAS_DISPLAY_SIZE;
    var smallestAllowedRatio = minDisplaySize / actualSize.getShortest();

    if (ratio < smallestAllowedRatio) {
        return smallestAllowedRatio;
    }
    else {
        return ratio;
    }
};

/**
 * Scales the size of the canvas by a multiplicative factor relative to its
 * current display size
 *
 * @param {number} factor 0-1 shrinks, 1+ enlarges.
 * @param {?Object} opt_centerOn The page coordinates to center the zoom on
 * (defaults to the center of the view).
 */
sc.canvas.CanvasViewport.prototype.zoomByFactor = function(factor,
                                                           opt_centerOn) {
    if (this.canvas == null) {
        return;
    }

    if (factor == 1) {
        return;
    }

    var canvas = this.canvas;

    var oldSize = canvas.getDisplaySize();
    var actualSize = canvas.getActualSize();

    var displayToActualRatio = oldSize.width / actualSize.width;

    this.zoomToRatio(displayToActualRatio * factor, opt_centerOn);
};

/**
 * Scales the size of the canvas so that its display size is ratio * actual size
 *
 * @param {number} ratio The ratio of display size to actual size to use.
 * @param {?Object} opt_centerOn The page coordinates to center the zoom on
 * (defaults to the center of the view).
 */
sc.canvas.CanvasViewport.prototype.zoomToRatio = function(ratio, opt_centerOn) {
    var canvas = this.canvas;

    if (canvas == null) {
        return;
    }

    var actualSize = canvas.getActualSize();
    var oldSize = canvas.getDisplaySize();

    var newWidth = actualSize.width * ratio;
    var newHeight = actualSize.height * ratio;

    if (newWidth == actualSize.width && newHeight == actualSize.height) {
        return;
    }

    var newSize = new goog.math.Size(newWidth, newHeight);
    if (! this.canZoomToSize(newSize)) {
        var closestRatio = this.calculateClosestAllowedZoomRatio(ratio);
        this.zoomToRatio(closestRatio, opt_centerOn);

        return;
    }

    canvas.resize(newWidth, newHeight);

    var deltaWidth = newWidth - oldSize.width;
    var deltaHeight = newHeight - oldSize.height;

    if (opt_centerOn) {
        var offs = jQuery(this.contentDiv).offset();
        var offsetX = opt_centerOn.x - offs.left;
        var offsetY = opt_centerOn.y - offs.top;

        var x = offsetX / oldSize.width * deltaWidth;
        var y = offsetY / oldSize.height * deltaHeight;

        this.panByPageCoords(x, y);
    }
    else {
        var x = (deltaWidth / 2);
        var y = (deltaHeight / 2);
        
        this.panByPageCoords(x, y);
    }

    this.updateScale();
    this.fireBoundsChanged();
};

/**
 * Zooms the viewport so that the canvas fits within the viewport at the largest
 * size possible.
 *
 * @return {sc.canvas.CanvasViewport} This viewport.
 */
sc.canvas.CanvasViewport.prototype.zoomToFit = function() {
    this.complainIfNoCanvas();

    var viewportDisplaySize = this.getDisplaySize();

    this.canvas.resize(viewportDisplaySize.width, viewportDisplaySize.height);
    this.updateScale();

    var canvasDisplaySize = this.canvas.getDisplaySize();

    var widthDiff = viewportDisplaySize.width - canvasDisplaySize.width;
    var heightDiff = viewportDisplaySize.height - canvasDisplaySize.height;

    jQuery(this.contentDiv).css({
        top: heightDiff / 2,
        left: widthDiff / 2
    });

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
sc.canvas.CanvasViewport.prototype.zoomToRect = function(x, y, width, height) {
    this.complainIfNoCanvas();
    
    console.warn('CanvasViewport#zoomToRect is not yet fully implemented. ' +
                 'The viewport will pan to the xy coords, but will not zoom.');
    
    // Incomplete Implementation

//    var canvas = this.canvas;
//    var actualSize = canvas.getActualSize();
//
//    var largestDimension = Math.max(width, height);
//
//    var ratio = largestDimension / actualSize.getLongest();//FIXME
//
//    this.zoomToRatio(ratio);
    this.panToCanvasCoords(x, y);
};

/**
 * Zooms the viewer to the specified bounds in canvas coordinates
 *
 * @param {(number|Object)} top The top bound in canvas pixels or an object with
 * top, left, bottom, and right properties.
 * @param {?number} left The left bound in canvas pixels.
 * @param {?number} bottom The bottom bound in canvas pixels.
 * @param {?number} right The right bound in canvas pixels.
 */
sc.canvas.CanvasViewport.prototype.zoomToBounds = function(top, left,
                                                           bottom, right) {
    if (left == null && bottom == null && right == null) {
        left = top.left || top.x;
        bottom = top.bottom || top.y2;
        right = top.right || top.x2;
        top = top.top || top.y;
    }

    var x = left;
    var y = top;
    var height = bottom - top;
    var width = right - left;

    this.zoomToRect(x, y, width, height);
};

/**
 * Updates the display to actual size ratio instance variable, and returns the
 * new value
 *
 * @return {number} The ratio of the canvas display size to its actual size.
 */
sc.canvas.CanvasViewport.prototype.updateScale = function() {
    this.complainIfNoCanvas();

    var canvas = this.canvas;

    var actualWidth = canvas.getActualSize().width;
    var displayWidth = canvas.getDisplaySize().width;

    var ratio = displayWidth / actualWidth;

    this.displayToActualSizeRatio = ratio;

    return ratio;
};

/**
 * Fires an event on the viewport indicating that the bounds of the viewport
 * have been changed. Should be called by any method that pans or zooms the
 * viewport.
 */
sc.canvas.CanvasViewport.prototype.fireBoundsChanged = function() {
    var event = new goog.events.Event('bounds changed', this);

    event.getBounds = jQuery.proxy(this.getBounds, this);

    this.dispatchEvent(event);
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
sc.canvas.CanvasViewport.prototype.pageToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var canvasOffset = jQuery(this.canvas.getElement()).offset();

    x -= canvasOffset.left;
    y -= canvasOffset.top;

    x /= this.displayToActualSizeRatio;
    y /= this.displayToActualSizeRatio;

    return {
        x: x,
        y: y
    };
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
sc.canvas.CanvasViewport.prototype.clientToCanvasCoord = function(x, y) {
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
sc.canvas.CanvasViewport.prototype.canvasToPageCoord = function(x, y) {
    var proportionalCoords = this.canvas.canvasToProportionalCoord(x, y);

    return this.proportionalToPageCoord(proportionalCoords);
};

/**
 * Converts canvas coordinates into the corresponding client coordinates.
 *
 * @param {(number|Object)} x The canvas x coordinate or an object with x and y
 * properties.
 * @param {?number} y The canvas y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.CanvasViewport.prototype.canvasToClientCoord = function(x, y) {
    var pageCoords = this.canvasToPageCoord(x, y);

    return this.pageToClientCoord(pageCoords);
};

sc.canvas.CanvasViewport.prototype.proportionalToPageCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    this.complainIfNoCanvas();

    var displaySize = this.canvas.getDisplaySize();
    var offset = jQuery(this.canvas.getElement()).offset();

    x *= displaySize.width;
    y *= displaySize.height;

    x += offset.left;
    y += offset.top;

    return {
        'x': x,
        'y': y
    };
};

sc.canvas.CanvasViewport.prototype.pageToClientCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var scrollTop = jQuery(window).scrollTop();
    var scrollLeft = jQuery(window).scrollLeft();

    return {
        'x': x - scrollLeft,
        'y': y - scrollTop
    };
};

sc.canvas.CanvasViewport.prototype.clientToPageCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var scrollTop = jQuery(window).scrollTop();
    var scrollLeft = jQuery(window).scrollLeft();

    return {
        'x': x + scrollLeft,
        'y': y + scrollTop
    };
};

sc.canvas.CanvasViewport.prototype.proportionalToClientCoord = function(x, y) {
    return this.pageToClientCoord(this.proportionalToClientCoord(x, y));
};

/**
 * Resizes the canvas viewer to the given dimensions (in screen pixels)
 *
 * @param {Number} width The new width.
 * @param {Number} height The new height.
 */
sc.canvas.CanvasViewport.prototype.resize = function(width, height) {
    jQuery(this.viewportDiv).width(width).height(height);
};

/**
 * Returns the size in screen pixels of the viewport area.
 *
 * @return {goog.math.Size} The size of the viewport.
 */
sc.canvas.CanvasViewport.prototype.getDisplaySize = function() {
    var width = jQuery(this.viewportDiv).width();
    var height = jQuery(this.viewportDiv).height();

    return new goog.math.Size(width, height);
};

/**
 * Returns the bounds of the viewport in canvas coordinates (the size and
 * coordinates of the viewable area of the canvas, which may possibly be larger
 * than the entire canvas and include negative coordinates).
 *
 * @return {Object} An object with the coordinates and dimensions of the
 * bounding box specified in both x, x2, y, y2 and top, left, bottom, right
 * formats.
 */
sc.canvas.CanvasViewport.prototype.getBounds = function() {
    var $viewportDiv = jQuery(this.viewportDiv);

    var offset = $viewportDiv.offset();

    var pageTopLeft = {
        'x': offset.left,
        'y': offset.top
    };
    var pageBottomRight = {
        'x': pageTopLeft.x + $viewportDiv.width(),
        'y': pageTopLeft.y + $viewportDiv.height()
    };

    var canvasTopLeft = this.pageToCanvasCoord(pageTopLeft);
    var canvasBottomRight = this.pageToCanvasCoord(pageBottomRight);

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
        'height': height
    };
};

/**
 * Returns an HTML DOM Element containing the CanvasViewer, and optionally
 * appends it to a given div
 *
 * @param {?(Element|string)} opt_div The div to which the CanvasViewer should
 * be appended, or the id of that element.
 * @return {Element} The gui element.
 */
sc.canvas.CanvasViewport.prototype.render = function(opt_div) {
    if (opt_div) {
        opt_div = goog.dom.getElement(opt_div);
        opt_div.appendChild(this.baseDiv);
    }

    return this.baseDiv;
};

/**
 * Returns the HTML DOM Element containing the CanvasViewer
 *
 * @return {Element} The gui element.
 */
sc.canvas.CanvasViewport.prototype.getElement = function() {
    return this.baseDiv;
};

/**
 * @protected
 * The event handler for resource click events fired by canvases
 * Filters out clicks from drag events
 * @param {goog.events.Event} event The event fired by the canvas.
 */
sc.canvas.CanvasViewport.prototype.handleCanvasResourceClick = function(event) {
    if (this.shouldFireMouseEvents()) {
        this.options.clickHandler(event);
    }
};

sc.canvas.CanvasViewport.MOUSE_EVENTS = new goog.structs.Set([
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

/**
 * Handles any event fired by the canvas by propagating the event through the
 * viewport and adding additional information. Will not propagate the event if
 * it is a click or mouseup event and the click has been registered as handled.
 *
 * @param {Event} event The event fireed.
 */
sc.canvas.CanvasViewport.prototype.handleCanvasEvent = function(event) {
    if (!sc.canvas.CanvasViewport.MOUSE_EVENTS.contains(event.type) ||
        this.shouldFireMouseEvents()) {
        var canvasCoords = this.clientToCanvasCoord(event.clientX,
                                                    event.clientY);

        event.canvasX = canvasCoords.x;
        event.canvasY = canvasCoords.y;

        event.viewport = this;

        this.dispatchEvent(event);
    }
};

/**
 * Binds the standard event handlers to an added canvas.
 * @protected
 *
 * @param {sc.canvas.Canvas} canvas The canvas to which the handlers should be
 * added.
 */
sc.canvas.CanvasViewport.prototype.bindEventHandlersToCanvas = function(
                                                                    canvas) {
    var eventTypes = goog.events.EventType;
    for (var x in eventTypes) {
        if (eventTypes.hasOwnProperty(x)) {
            var type = eventTypes[x];

            canvas.addEventListener(type, this.handleCanvasEvent, false, this);
        }
    }

    canvas.addEventListener('click', this.handleCanvasResourceClick,
                            false, this);
};

/**
 * Adds a canvas to the viewer
 *
 * @param {sc.canvas.Canvas} canvas The canvas to be added.
 */
sc.canvas.CanvasViewport.prototype.addCanvas = function(canvas) {
    this.bindEventHandlersToCanvas(canvas);

    var uri = canvas.getUri();

    this.canvas = canvas;

    var element = canvas.render();

    jQuery(element).css({
        position: 'absolute',
        top: 0,
        left: 0
    });

    jQuery(this.contentDiv).width(canvas.displaySize.width);
    jQuery(this.contentDiv).height(canvas.displaySize.height);

    this.contentDiv.appendChild(element);

    this.updateScale();

    var event = new goog.events.Event('canvasAdded', this);
    this.dispatchEvent(event);
};

/**
 * Removes all canvases from the viewer, and resets the origin
 */
sc.canvas.CanvasViewport.prototype.clear = function() {
    jQuery(this.contentDiv).empty();

    this.canvas = null;
    jQuery(this.contentDiv).css({
        top: 0,
        left: 0
    });
};

/**
 * Takes a deferred canvas object, and adds it to the viewer as soon as
 * possible, updating when necessary
 *
 * @param {jQuery.Deferred} deferred The deferred object to be added.
 * @return {jQuery.Deferred} The given deferred object for chaining methods.
 */
sc.canvas.CanvasViewport.prototype.addDeferredCanvas = function(deferred) {
    var self = this;
    var _canvas = null;

    var withCanvas = function(canvas) {
        if (! _canvas) {
            _canvas = canvas;
            self.addCanvas(canvas);
        }
    };

    deferred.progress(withCanvas).done(withCanvas);

    return deferred;
};
