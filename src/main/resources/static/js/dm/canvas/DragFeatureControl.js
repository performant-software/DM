goog.provide('dm.canvas.DragFeatureControl');

goog.require('dm.canvas.FeatureControl');

/**
 * Allows features on a canvas to be dragged with the mouse.
 *
 * @param {dm.canvas.CanvasViewport} viewport The viewport to control.
 * @param {dm.data.Databroker} databroker The databroker to which data should
 * be sent.
 */
dm.canvas.DragFeatureControl = function(viewport, databroker) {
    dm.canvas.FeatureControl.call(this, viewport, databroker);
    
    this.allowedFeatures = null;
};
goog.inherits(dm.canvas.DragFeatureControl, dm.canvas.FeatureControl);

dm.canvas.DragFeatureControl.prototype.controlName = 'DragFeatureControl';

dm.canvas.DragFeatureControl.prototype.allowAllFeatures = function() {
    this.allowedFeatures = null;
};

dm.canvas.DragFeatureControl.prototype.disallowAllFeatures = function() {
    if (this.allowedFeatures) {
        this.allowedFeatures.clear();
    }
    else {
        this.allowedFeatures = new goog.structs.Set();
    }
};

dm.canvas.DragFeatureControl.prototype.addAllowedFeature = function(feature) {
    if (this.allowedFeatures) {
        this.allowedFeatures.add(feature);
    }
    else {
        this.allowedFeatures = new goog.structs.Set([feature]);
    }
};

dm.canvas.DragFeatureControl.prototype.addAllowedFeatures = function(features) {
    if (this.allowedFeatures) {
        this.allowedFeatures.addAll(features);
    }
    else {
        this.allowedFeatures = new goog.structs.Set(features);
    }
};

dm.canvas.DragFeatureControl.prototype.removeAllowedFeature =
function(feature) {
    if (this.allowedFeatures) {
        return this.allowedFeatures.remove(feature);
    }
    else {
        return false;
    }
};

dm.canvas.DragFeatureControl.prototype.activate = function() {
    dm.canvas.FeatureControl.prototype.activate.call(this);
    
    this.feature = null;
    
    this.isDragging = false;
    
    goog.events.listen(this.viewport, 'mousedown', this.handleMousedown,
                       false, this);
    goog.events.listen(window.document, 'mouseup', this.handleMouseup,
                       false, this);
};

dm.canvas.DragFeatureControl.prototype.fireCustomEvent =
function(type, originalEvent, opt_canvasCoords) {
    var customEvent = new goog.events.Event(type, this);
    customEvent.feature = originalEvent.feature;
    customEvent.clientX = originalEvent.clientX;
    customEvent.clientY = originalEvent.clientY;
    
    if (opt_canvasCoords) {
        customEvent.canvasX = opt_canvasCoords.x;
        customEvent.canvasY = opt_canvasCoords.y;
    }
    else {
        customEvent.canvasX = originalEvent.canvasX;
        customEvent.canvasY = originalEvent.canvasY;
    }
    
    this.dispatchEvent(customEvent);
};

dm.canvas.DragFeatureControl.prototype.deactivate = function() {
    dm.canvas.FeatureControl.prototype.deactivate.call(this);
    
    this.isDragging = false;
    
    goog.events.unlisten(this.viewport, 'mousedown', this.handleMousedown,
                         false, this);
    goog.events.unlisten(window.document, 'mouseup', this.handleMouseup,
                         false, this);
    goog.events.unlisten(window.document, 'mousemove', this.handleMousemove,
                         false, this);
};

dm.canvas.DragFeatureControl.prototype.handleMousedown = function(event) {
    if (this.allowedFeatures != null &&
        !this.allowedFeatures.contains(event.feature)) {
        return;
    }
    
    if (event.which == 2) {
        return;
    }
    
    this.isDragging = true;
    
    this.viewport.registerHandledMouseEvent(event);
    
    this.feature = event.feature;
    
    var featureCoords = this.getFeatureCoordinates();
    
    this.mouseOffsetFromFeature = {
        'x': event.canvasX - featureCoords.x,
        'y': event.canvasY - featureCoords.y
    };
    
    goog.events.listen(window.document, 'mousemove', this.handleMousemove,
                       false, this);
    
    this.fireCustomEvent('dragstart', event);
};

dm.canvas.DragFeatureControl.prototype.handleMousemove = function(event) {
    var feature = this.feature;
    
    this.viewport.registerHandledMouseEvent(event);
    
    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);
    
    var newX = canvasCoords.x - this.mouseOffsetFromFeature.x;
    var newY = canvasCoords.y - this.mouseOffsetFromFeature.y;
    
    this.setFeatureCoordinates(newX, newY);
    
    this.fireCustomEvent('drag', event, canvasCoords);
};

dm.canvas.DragFeatureControl.prototype.handleMouseup = function(event) {
    goog.events.unlisten(window.document, 'mousemove', this.handleMousemove, 
                         false, this);
    
    this.isDragging = false;
    
    if (this.feature == null) {
        return;
    }
    
    this.viewport.registerHandledMouseEvent(event);
    
    this.fireCustomEvent('dragend', event);
    
    this.sendFeatureToDatabroker();
    
    this.feature = null;
};