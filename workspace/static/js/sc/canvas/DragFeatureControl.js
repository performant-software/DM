goog.provide('sc.canvas.DragFeatureControl');

goog.require('sc.canvas.FeatureControl');

/**
 * Allows features on a canvas to be dragged with the mouse.
 *
 * @param {sc.canvas.CanvasViewport} viewport The viewport to control.
 * @param {sc.data.Databroker} databroker The databroker to which data should
 * be sent.
 */
sc.canvas.DragFeatureControl = function(viewport, databroker) {
    sc.canvas.FeatureControl.call(this, viewport, databroker);
    
    this.allowedFeatures = null;
};
goog.inherits(sc.canvas.DragFeatureControl, sc.canvas.FeatureControl);

sc.canvas.DragFeatureControl.prototype.allowAllFeatures = function() {
    this.allowedFeatures = null;
};

sc.canvas.DragFeatureControl.prototype.disallowAllFeatures = function() {
    if (this.allowedFeatures) {
        this.allowedFeatures.clear();
    }
    else {
        this.allowedFeatures = new goog.structs.Set();
    }
};

sc.canvas.DragFeatureControl.prototype.addAllowedFeature = function(feature) {
    if (this.allowedFeatures) {
        this.allowedFeatures.add(feature);
    }
    else {
        this.allowedFeatures = new goog.structs.Set([feature]);
    }
};

sc.canvas.DragFeatureControl.prototype.addAllowedFeatures = function(features) {
    if (this.allowedFeatures) {
        this.allowedFeatures.addAll(features);
    }
    else {
        this.allowedFeatures = new goog.structs.Set(features);
    }
};

sc.canvas.DragFeatureControl.prototype.removeAllowedFeature =
function(feature) {
    if (this.allowedFeatures) {
        return this.allowedFeatures.remove(feature);
    }
    else {
        return false;
    }
};

sc.canvas.DragFeatureControl.prototype.activate = function() {
    sc.canvas.FeatureControl.prototype.activate.call(this);
    
    this.feature = null;
    
    this.isDragging = false;
    
    goog.events.listen(this.viewport, 'mousedown', this.handleMousedown,
                       false, this);
    goog.events.listen(window.document, 'mouseup', this.handleMouseup,
                       false, this);
};

sc.canvas.DragFeatureControl.prototype.fireCustomEvent =
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

sc.canvas.DragFeatureControl.prototype.deactivate = function() {
    sc.canvas.FeatureControl.prototype.deactivate.call(this);
    
    this.isDragging = false;
    
    goog.events.unlisten(this.viewport, 'mousedown', this.handleMousedown,
                         false, this);
    goog.events.unlisten(window.document, 'mouseup', this.handleMouseup,
                         false, this);
    goog.events.unlisten(window.document, 'mousemove', this.handleMousemove,
                         false, this);
};

sc.canvas.DragFeatureControl.prototype.handleMousedown = function(event) {
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

sc.canvas.DragFeatureControl.prototype.handleMousemove = function(event) {
    var feature = this.feature;
    
    this.viewport.registerHandledMouseEvent(event);
    
    var canvasCoords = this.clientToCanvasCoord(event.clientX, event.clientY);
    
    var newX = canvasCoords.x - this.mouseOffsetFromFeature.x;
    var newY = canvasCoords.y - this.mouseOffsetFromFeature.y;
    
    this.setFeatureCoordinates(newX, newY);
    
    this.fireCustomEvent('drag', event, canvasCoords);
};

sc.canvas.DragFeatureControl.prototype.handleMouseup = function(event) {
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