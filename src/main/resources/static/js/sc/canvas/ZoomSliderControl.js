goog.provide('sc.canvas.ZoomSliderControl');

goog.require('sc.canvas.Control');

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
        'step': 0.005,
        'start': function(event, ui) {
            this.dispatchEvent(event);
        }.bind(this),
        'stop': function(event, ui) {
            this.dispatchEvent(event);
        }.bind(this)
    });
};
goog.inherits(sc.canvas.ZoomSliderControl, sc.canvas.Control);

sc.canvas.ZoomSliderControl.prototype.controlName = 'ZoomSliderControl';

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
        var actualCanvasSize = this.viewport.canvas.getSize();
        var minSize = Math.log(sc.canvas.FabricCanvasViewport.MIN_CANVAS_DISPLAY_SIZE);
        var maxSize = Math.log(actualCanvasSize.getShortest() *
            sc.canvas.FabricCanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO);
    }
    else {
        var minSize = 0;
        var maxSize = 100;
    }
    var maxRatio = sc.canvas.FabricCanvasViewport.MAX_DISPLAY_TO_ACTUAL_SIZE_RATIO;
    
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
    var actualCanvasSize = this.viewport.canvas.getSize();
    
    var ratio = size / actualCanvasSize.getShortest();
    
    this.viewport.zoomToRatio(ratio);
    
    this.updateZoomLevelDisplay();
};

sc.canvas.ZoomSliderControl.prototype.handleBoundsChanged = function(event) {
    var ratio = this.viewport.displayToActualSizeRatio;
    
    var displaySize = this.viewport.canvas.getDisplaySize();
    
    jQuery(this.sliderDiv).slider('value', Math.log(displaySize.getShortest()));
    
    this.updateZoomLevelDisplay();
};

sc.canvas.ZoomSliderControl.prototype.handleCanvasAdded = function(event) {
    this.updateRange();
};

sc.canvas.ZoomSliderControl.prototype.getZoomPercentage = function() {
    return Math.round(this.viewport.canvas.getDisplayToActualSizeRatio() * 100);
};

sc.canvas.ZoomSliderControl.prototype.updateZoomLevelDisplay = function() {
    if (this.viewport.canvas) {
        jQuery(this.sliderDiv).attr('title', 'Zoomed to ' +
            this.getZoomPercentage() + '%.\n' +
            'Slide to adjust the zoom level.');
        jQuery(this.sliderDiv).find('.ui-slider-handle').text(this.getZoomPercentage());
    }
};

sc.canvas.ZoomSliderControl.prototype.handleScrollWheel =
function(event, delta, deltaX, deltaY) {
    event.preventDefault();
    event.stopPropagation();
    
    var newValue = jQuery(this.sliderDiv).slider('value') + delta / 10;
    
    jQuery(this.sliderDiv).slider('value', newValue);
    
    this.updateZoomFromSliderValue(newValue);
};