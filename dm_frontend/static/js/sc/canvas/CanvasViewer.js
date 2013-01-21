goog.provide('sc.canvas.CanvasViewer');

goog.require('jquery.jQuery');
goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.events');

goog.require('sc.canvas.CanvasViewport');
goog.require('sc.canvas.Canvas');
goog.require('sc.canvas.CanvasToolbar');
goog.require('sc.canvas.DragFeatureControl');
goog.require('sc.canvas.ZoomSliderControl');

/**
 * A tool for viewing and annotating canvases, which provides an interactive
 * marquee view and a customizable toolbar.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @param {Object} options Configuration options.
 */
sc.canvas.CanvasViewer = function(options) {
    this.options = jQuery.extend(this.options, options);
    
    this.databroker = this.options.databroker;
    
    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-CanvasViewer');
    
    this.mainViewport = new sc.canvas.CanvasViewport(this.databroker);
    this.marqueeViewport = new sc.canvas.CanvasViewport(this.databroker);
    
    this.toolbar = this.options.toolbar || new sc.canvas.CanvasToolbar(this);
    
    this.setupControls();
    
    this.toolbarDiv = this.toolbar.getElement();
    this.mainViewportDiv = this.mainViewport.getElement();
    this.marqueeViewportDiv = this.marqueeViewport.getElement();
    jQuery(this.marqueeViewportDiv).addClass('sc-CanvasViewer-marquee');
    
    this.toolbar.render(this.baseDiv);
    this.mainViewport.render(this.baseDiv);
    this.marqueeViewport.render(this.baseDiv);
    
    this.marqueeViewport.resize(this.options.marqueeSize.width,
                                this.options.marqueeSize.height);
    
    this.timeOfLastIgnorableBoundsChange = 0;
    
    this.mainViewport.addEventListener('bounds changed', this.updateMarqueeBox,
                                       false, this);
};

sc.canvas.CanvasViewer.prototype.options = {
    'databroker': new sc.data.Databroker(),
    'marqueeSize': new goog.math.Size(100, 100)
};

sc.canvas.CanvasViewer.prototype.setupControls = function() {
    this.marqueeControls = {
        'dragFeature': new sc.canvas.DragFeatureControl(this.marqueeViewport,
                                                        this.databroker)
    };
    
    this.marqueeControls.dragFeature.disallowAllFeatures();
    this.marqueeControls.dragFeature.setShouldSaveChanges(false);
    this.marqueeControls.dragFeature.activate();
    
    var dragHandler = function(event) {
        if (this.mainViewport.canvas && this.marqueeBox) {
            var x = this.marqueeBox.attr('x');
            var y = this.marqueeBox.attr('y');
            var width = this.marqueeBox.attr('width');
            var height = this.marqueeBox.attr('height');
            
            this.timeOfLastIgnorableBoundsChange = goog.now();
            //this.mainViewport.panToCanvasCoords(x, y);
            this.mainViewport.zoomToRect(x, y, width, height);
        }
    };
    this.marqueeControls.dragFeature.addEventListener('drag', dragHandler,
                                                      false, this);
    
    this.zoomSlider = new sc.canvas.ZoomSliderControl(this.mainViewport);
    this.zoomSlider.activate();
};

sc.canvas.CanvasViewer.prototype.render = function(div) {
    div.appendChild(goog.dom.getElement(this.baseDiv));
};

sc.canvas.CanvasViewer.prototype.getElement = function() {
    return this.baseDiv;
};

sc.canvas.CanvasViewer.prototype.resize = function(width, height) {
    if (height == null) {
        height = width.height;
        width = width.width;
    }
    
    var toolbarHeight = jQuery(this.toolbarDiv).height();
    
    this.mainViewport.resize(width, height - toolbarHeight);
};

sc.canvas.CanvasViewer.prototype.getDisplaySize = function() {
    var width = jQuery(this.viewportDiv).width();
    var height = jQuery(this.viewportDiv).height();
    
    return new goog.math.Size(width, height);
};
sc.canvas.CanvasViewer.prototype.getSize =
sc.canvas.CanvasViewer.prototype.getDisplaySize;

sc.canvas.CanvasViewer.MARQUEE_BOX_STYLE = {
    'fill': '#0F6CD6',
    'fill-opacity': 0.4,
    'stroke': '#0F6CD6',
    'stroke-opacity': 0.75,
    'stroke-width': '15%',
    'cursor': 'move'
};

sc.canvas.CanvasViewer.prototype.setCanvas = function(canvas) {
    this.mainViewport.clear();
    this.marqueeViewport.clear();
    
    this.mainViewport.addCanvas(canvas);
    this.mainViewport.zoomToFit();
    
    var deferredMarqueeCanvas = sc.canvas.Canvas.createDeferredCanvas(
        canvas.getUri(),
        this.databroker,
        this.marqueeViewport.getDisplaySize()
    );
    
    var self = this;
    deferredMarqueeCanvas.done(function (marqueeCanvas) {
        canvas.addEventListener(
            ['feature added', 'feature modified'],
            function(event) {
                marqueeCanvas.findAndAddConstraints(self.databroker);
            },
            false,
            self
        );
        canvas.addEventListener(
            'feature shown',
            function(event) {
                marqueeCanvas.showFeatureByUri(event.uri);
            },
            false,
            self
        );
        canvas.addEventListener(
            'feature hidden',
            function(event) {
                marqueeCanvas.hideFeatureByUri(event.uri);
            },
            false,
            self
        );
    });
    
    goog.events.listenOnce(this.marqueeViewport, 'canvasAdded', function(e) {
        this.marqueeViewport.zoomToFit();

        this.marqueeBox = this.marqueeViewport.canvas.paper.rect(0, 0, 0, 0);
        this.marqueeBox.attr(sc.canvas.CanvasViewer.MARQUEE_BOX_STYLE);
        this.marqueeControls.dragFeature.addAllowedFeature(this.marqueeBox);
        
        this.updateMarqueeBox();
        
        this.marqueeViewport.canvas.bindEventHandlersToFeature(this.marqueeBox);
    }, false, this);
    
    this.marqueeViewport.addDeferredCanvas(deferredMarqueeCanvas);
};

sc.canvas.CanvasViewer.prototype.updateMarqueeBox = function() {
    if (goog.now() - this.timeOfLastIgnorableBoundsChange < 200) {
        return;
    }
    
    if (this.marqueeBox && this.mainViewport.canvas) {
        var bounds = this.mainViewport.getBounds();
        
        this.marqueeBox.attr('x', bounds.x).attr('y', bounds.y);
        this.marqueeBox.attr('width', bounds.width);
        this.marqueeBox.attr('height', bounds.height);
        this.marqueeBox.toFront();
    }
};

sc.canvas.CanvasViewer.prototype.addDeferredCanvas = function(deferred) {
    var self = this;
    var _canvas = null;
    
    var withCanvas = function(canvas) {
        if (! _canvas) {
            _canvas = canvas;
            self.setCanvas(canvas);
        }
    };
    
    deferred.progress(withCanvas).done(withCanvas);
    
    return deferred;
};