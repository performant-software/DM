goog.provide('sc.canvas.ZoomSliderControl');

goog.require('sc.canvas.Control');

goog.require('jquery.jQueryUI');
goog.require('jquery.jQuery');

sc.canvas.ZoomSliderControl = function(viewport) {
    sc.canvas.Control.call(this, viewport);
    
    this.sliderDiv = document.createElement('div');
    jQuery(this.sliderDiv).addClass('sc-CanvasViewer-zoomSlider');
    jQuery(this.sliderDiv).attr('title', 'Slide to adjust the zoom level');
    jQuery(this.sliderDiv).bind('mousewheel',
                                jQuery.proxy(this.handleScrollWheel, this));
    jQuery(this.sliderDiv).slider({
        'orientation': 'vertical',
        'slide': jQuery.proxy(this.handleSlide, this),
        'animate': 200,
        'step': 0.005
    });
};
goog.inherits(sc.canvas.ZoomSliderControl, sc.canvas.Control);

sc.canvas.ZoomSliderControl.prototype.activate = function() {
    sc.canvas.Control.prototype.activate.call(this);
    
    jQuery(this.viewport.getElement()).append(this.sliderDiv);
    
    this.updateRange();
    
    goog.events.listen(this.viewport, 'canvasAdded', this.handleCanvasAdded,
                       false, this);
    goog.events.listen(this.viewport, 'bounds changed',
                       this.handleBoundsChanged, false, this);
};

sc.canvas.ZoomSliderControl.prototype.deactivate = function() {
    sc.canvas.Control.prototype.deactivate.call(this);
    
    jQuery(this.sliderDiv).detach();
    
    goog.events.unlisten(this.viewport, 'canvasAdded', this.handleCanvasAdded,
                         false, this);
    goog.events.unlisten(this.viewport, 'bounds changed',
                         this.handleBoundsChanged, false, this);
};

sc.canvas.ZoomSliderControl.prototype.updateRange = function() {
    if (this.viewport.canvas) {
        var actualCanvasSize = this.viewport.canvas.getActualSize();
        var minSize = Math.log(sc.canvas.CanvasViewport.MIN_CANVAS_DISPLAY_SIZE);
        var maxSize = Math.log(actualCanvasSize.getShortest() *
            sc.canvas.CanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO);
    }
    else {
        var minSize = 0;
        var maxSize = 100;
    }
    var maxRatio = sc.canvas.CanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO;
    
    jQuery(this.sliderDiv).slider('option', {
        'min': minSize,
        'max': maxSize
    });
};

sc.canvas.ZoomSliderControl.prototype.handleSlide = function(event, ui) {
    this.updateZoomFromSliderValue(ui.value);
    this.viewport.registerHandledMouseEvent(event);
};

sc.canvas.ZoomSliderControl.prototype.updateZoomFromSliderValue =
function(value) {
    var size = Math.exp(value);
    var actualCanvasSize = this.viewport.canvas.getActualSize();
    
    var ratio = size / actualCanvasSize.getShortest();
    
    this.viewport.zoomToRatio(ratio);
    
    this.updateTooltip();
};

sc.canvas.ZoomSliderControl.prototype.handleBoundsChanged = function(event) {
    var ratio = this.viewport.displayToActualSizeRatio;
    
    var displaySize = this.viewport.canvas.getDisplaySize();
    
    jQuery(this.sliderDiv).slider('value', Math.log(displaySize.getShortest()));
    
    this.updateTooltip();
};

sc.canvas.ZoomSliderControl.prototype.handleCanvasAdded = function(event) {
    this.updateRange();
};

sc.canvas.ZoomSliderControl.prototype.updateTooltip = function() {
    var zoomPercentage = Math.round(this.viewport.displayToActualSizeRatio
                                    * 100);
    
    jQuery(this.sliderDiv).attr('title', 'Zoomed to ' +
        zoomPercentage + '% of actual canvas image size. ' +
        'Slide to adjust the zoom level.');
};

sc.canvas.ZoomSliderControl.prototype.handleScrollWheel =
function(event, delta, deltaX, deltaY) {
    event.preventDefault();
    event.stopPropagation();
    
    var newValue = jQuery(this.sliderDiv).slider('value') + delta / 10;
    
    jQuery(this.sliderDiv).slider('value', newValue);
    
    this.updateZoomFromSliderValue(newValue);
};