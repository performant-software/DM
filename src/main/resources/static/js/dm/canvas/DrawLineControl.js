goog.provide('dm.canvas.DrawLineControl');

goog.require('goog.array');
goog.require('goog.events.KeyCodes');
goog.require('dm.canvas.DrawFeatureControl');

/**
 * A CanvasViewport controller which allows polylines to be drawn by clicking on
 * the canvas multiple times, and double clicking or pressing enter to complete
 * the line. Freehand drawing can be achieved by holding down the shift key
 * before clicking or by calling the enableFreehand() method.
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
dm.canvas.DrawLineControl = function(viewport, databroker) {
    dm.canvas.DrawFeatureControl.call(this, viewport, databroker);

    this.featureType = 'line';

    this.disableFreehand();

    this.proxiedHandleMousedown = jQuery.proxy(this.handleMousedown, this);
    this.proxiedHandleMouseup = jQuery.proxy(this.handleMouseup, this);
    this.proxiedHandleMousemove = jQuery.proxy(this.handleMousemove, this);
    this.proxiedHandleKeyup = jQuery.proxy(this.handleKeyup, this);
    this.proxiedHandleDblclick = jQuery.proxy(this.handleDblclick, this);

    this.points = [];
};
goog.inherits(dm.canvas.DrawLineControl, dm.canvas.DrawFeatureControl);

dm.canvas.DrawLineControl.prototype.controlName = 'DrawLineControl';

/**
 * @inheritDoc
 */
dm.canvas.DrawLineControl.prototype.activate = function() {
    dm.canvas.DrawFeatureControl.prototype.activate.call(this);

    var viewportDiv = this.viewport.getElement();

    jQuery(viewportDiv).bind('mousedown', this.proxiedHandleMousedown);
    jQuery(viewportDiv).bind('mouseup', this.proxiedHandleMouseup);
    jQuery(window).bind('keyup', this.proxiedHandleKeyup);
    jQuery(viewportDiv).bind('dblclick', this.proxiedHandleDblclick);
};

/**
 * @inheritDoc
 */
dm.canvas.DrawLineControl.prototype.deactivate = function() {
    dm.canvas.DrawFeatureControl.prototype.deactivate.call(this);

    var viewportDiv = this.viewport.getElement();

    jQuery(viewportDiv).unbind('mousedown', this.proxiedHandleMousedown);
    jQuery(viewportDiv).unbind('mouseup', this.proxiedHandleMouseup);
    jQuery(viewportDiv).unbind('mousemove', this.proxiedHandleMousemove);
    jQuery(window).unbind('keyup', this.proxiedHandleKeyup);
    jQuery(viewportDiv).unbind('dblclick', this.proxiedHandleDblclick);
};

/**
 * Helps to determine if a click event is the first click by checking to see if
 * there are any points in the array.
 * Note: Be careful to call this method before adding points to the array.
 *
 * @return {boolean} True if the points array is empty.
 */
dm.canvas.DrawLineControl.prototype.isFirstClick = function() {
    return this.points.length == 0;
};

/**
 * Makes the control work by starting to draw on mousedown, following the
 * cursor continuously, and finishing the drawing on mouseup.
 */
dm.canvas.DrawLineControl.prototype.enableFreehand = function() {
    this.freehandMode = true;
    this.useDragToDraw = true;
};

/**
 * (Default)
 * Makes the control work by adding points with each mouse click, and finishing
 * the drawing when the enter key is pressed or the mouse is double clicked.
 */
dm.canvas.DrawLineControl.prototype.disableFreehand = function() {
    this.freehandMode = false;
    this.useDragToDraw = false;
};

/**
 * Handles mousedown events by checking for the shift key and switching to
 * freehand drawing mode if appropriate.
 *
 * @param {Event} event The event fired.
 */
dm.canvas.DrawLineControl.prototype.handleMousedown = function(event) {
    if (event.which != 1) {
        return; // This was not a left button click
    }
    
    this.viewport.registerHandledMouseEvent(event);

    var viewportDiv = this.viewport.getElement();

    if (event.shiftKey || this.freehandMode) {
        event.preventDefault();
        event.stopPropagation();

        this.useDragToDraw = true;

        var canvasCoords = this.clientToCanvasCoord(event.clientX,
                                                    event.clientY);
        this.createInitialLine(canvasCoords);

        jQuery(viewportDiv).bind('mousemove', this.proxiedHandleMousemove);
    }
};

/**
 * Handles mouseup events by adding points for each click.
 *
 * @param {Event} event The event fired.
 */
dm.canvas.DrawLineControl.prototype.handleMouseup = function(event) {
    if (event.which != 1) {
        return; // This was not a left button click
    }

    this.viewport.registerHandledMouseEvent(event);

    var viewportDiv = this.viewport.getElement();
    var canvas = this.viewport.canvas;

    var canvasCoord = this.clientToCanvasCoord(event.clientX, event.clientY);

    if (this.useDragToDraw) {
        this.points.push(canvasCoord);
        this.finishDrawFeature();
    }
    else {
        if (this.isFirstClick()) {
            this.createInitialLine(canvasCoord);

            jQuery(viewportDiv).bind('mousemove', this.proxiedHandleMousemove);
        }
        else {
            this.points.push(canvasCoord);
        }
    }
};

/**
 * Sets this.feature to a path with only a move to command of the starting
 * coordinates.
 *
 * @param {Object} canvasCoord An object with x and y properties representing
 * the x and y canvas coordinates.
 */
dm.canvas.DrawLineControl.prototype.createInitialLine = function(canvasCoord) {
    var viewportDiv = this.viewport.getElement();
    var canvas = this.viewport.canvas;

    this.beginDrawFeature();

    this.points.push(canvasCoord);
    
    this.feature = canvas.addPath("M 0 0", this.uri);

    this.feature.set({
        top: canvasCoord.y * canvas.displayToActualSizeRatio + canvas.offset.x,
        left: canvasCoord.x * canvas.displayToActualSizeRatio + canvas.offset.y,
        scaleX: canvas.displayToActualSizeRatio,
        scaleY: canvas.displayToActualSizeRatio
    });
    this.updateFeatureCoords();
};

/**
 * Handles mousemove events by temporarily adjusting the path of the line to
 * follow the cursor, but does not add a point to the points array.
 *
 * @param {Event} event The event fired.
 */
dm.canvas.DrawLineControl.prototype.handleMousemove = function(event) {
    this.viewport.registerHandledMouseEvent(event);
    
    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);

    var pointsToDraw;

    if (this.useDragToDraw) {
        pointsToDraw = this.points;
    }
    else {
        pointsToDraw = goog.array.clone(this.points);
    }

    pointsToDraw.push(canvasCoords);
    
    this.updateLine(pointsToDraw);
};

dm.canvas.DrawLineControl.prototype.normalizePoints = function(points) {
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

    for (var i=newPoints.length - 1; i>=0; i--) {
        var point = new fabric.Point(newPoints[i].x, newPoints[i].y);

        newPoints.push(point);
    }

    return newPoints;
};

dm.canvas.DrawLineControl.prototype.updateLine = function(points) {
    var boundingBox = this.getLayerBoundingBox(points);

    var canvas = this.viewport.canvas;
    this.feature = canvas.updatePath(
        this.feature,
        dm.canvas.FabricCanvas.convertPointsToSVGPathCommands(
            this.normalizePoints(points),
            null,
            boundingBox
        )
    );

    this.feature.set({
        left: boundingBox.x1 + (boundingBox.width / 2),
        top: boundingBox.y1 + (boundingBox.height / 2)
    });

    this.updateFeature();
};

/**
 * Handles keyup events by checking for the enter key to finish drawing the line
 *
 * @param {Event} event The event fired.
 */
dm.canvas.DrawLineControl.prototype.handleKeyup = function(event) {
    var keycode = event.keyCode;

    if ((keycode == goog.events.KeyCodes.ENTER ||
        keycode == goog.events.KeyCodes.MAC_ENTER) &&
        this.feature) {
        this.finishDrawFeature();
    }
};

/**
 * Handles double click events by finishing the line if necessary.
 *
 * @param {Event} event The event fired.
 */
dm.canvas.DrawLineControl.prototype.handleDblclick = function(event) {
    if (this.feature) {
        this.viewport.registerHandledMouseEvent(event);
        
        this.finishDrawFeature();
    }
};

dm.canvas.DrawLineControl.prototype.getLayerBoundingBox = function(points) {
    var layerPoints = [];
    goog.structs.forEach(points, function(point) {
        layerPoints.push(this.viewport.canvasToLayerCoord(point));
    }, this);

    return dm.canvas.FabricCanvas.getPointsBoundingBox(layerPoints);
};

/**
 * @inheritDoc
 */
dm.canvas.DrawLineControl.prototype.finishDrawFeature = function() {
    var boundingBox = this.getLayerBoundingBox(this.points);

    var canvas = this.viewport.canvas;
    canvas.removeFabricObject(this.feature, true);
    this.feature = canvas.addPolyline(this.normalizePoints(this.points), this.uri);
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
