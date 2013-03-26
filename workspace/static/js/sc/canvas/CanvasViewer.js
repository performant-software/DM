goog.provide('sc.canvas.CanvasViewer');

goog.require('jquery.jQuery');
goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.events');

goog.require('sc.canvas.CanvasToolbar');
goog.require('sc.canvas.DragFeatureControl');
goog.require('sc.canvas.ZoomSliderControl');

goog.require('sc.canvas.FabricCanvasViewport');
goog.require('sc.canvas.FabricCanvas');
goog.require('sc.canvas.FabricCanvasFactory');

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

    this.proxiedOnMarqueeMousedown = this.handleMarqueeMousedown.bind(this);
    this.proxiedOnMarqueeMousemove = this.handleMarqueeMousemove.bind(this);
    this.proxiedOnMarqueeMouseup = this.handleMarqueeMouseup.bind(this);
    this.proxiedOnMarqueeMousewheel = this.handleMarqueeMousewheel.bind(this);
    
    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-CanvasViewer');
    
    this.mainViewport = new sc.canvas.FabricCanvasViewport(this.databroker);
    this.marqueeViewport = new sc.canvas.FabricCanvasViewport(this.databroker);
    
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

    this.maxMarqueeSize = new goog.math.Size(100, 100);

    this.mainViewport.addEventListener('mouseover', function(event) {
        var feature = event.getFeature();
        if (feature && feature.type != 'image') {
            jQuery(this.mainViewport.getElement()).addClass('sc-CanvasViewport-hand');
        }
    }, false, this);
    this.mainViewport.addEventListener('mouseout', function(event) {
        jQuery(this.mainViewport.getElement()).removeClass('sc-CanvasViewport-hand');
    }, false, this);
};

sc.canvas.CanvasViewer.prototype.options = {
    'databroker': new sc.data.Databroker(),
    'marqueeSize': new goog.math.Size(100, 100)
};

sc.canvas.CanvasViewer.prototype.setupControls = function() {
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
    
    this.mainViewport.setCanvas(canvas);
    this.mainViewport.zoomToFit();
    
    var deferredMarqueeCanvas = sc.canvas.FabricCanvasFactory.createDeferredCanvas(
        canvas.getUri(),
        this.databroker,
        this.marqueeViewport.getDisplaySize()
    );
    
    deferredMarqueeCanvas.done(function (marqueeCanvas) {
        canvas.addEventListener(
            ['featureAdded', 'featureModified', 'featureRemoved'],
            function(event) {
                sc.canvas.FabricCanvasFactory.findAndAddSelectors(marqueeCanvas);
            },
            false,
            this
        );
        canvas.addEventListener(
            'featureShown',
            function(event) {
                marqueeCanvas.showFeatureByUri(event.uri);
            },
            false,
            this
        );
        canvas.addEventListener(
            'featureHidden',
            function(event) {
                marqueeCanvas.hideFeatureByUri(event.uri);
            },
            false,
            this
        );
    }.bind(this));

    this.marqueeBox = new fabric.Rect({
        left: 0,
        top: 0,
        fill: 'rgba(15,108,214,0.4)',
        stroke: 'rgba(15,108,214,0.8)',
        strokeWidth: 1,
        selectable: true
    });
    
    goog.events.listenOnce(this.marqueeViewport, 'canvasAdded', function(e) {
        var marqueeSize = this.marqueeViewport.canvas.getSize().clone().scaleToFit(this.maxMarqueeSize);
        this.marqueeViewport.resize(marqueeSize.width, marqueeSize.height);

        this.marqueeViewport.zoomToFit();

        this.marqueeViewport.fabricCanvas.add(this.marqueeBox);
        
        this.updateMarqueeBox();
    }, false, this);
    
    this.marqueeViewport.addDeferredCanvas(deferredMarqueeCanvas);

    var $marqueeElement = jQuery(this.marqueeViewport.getElement());

    $marqueeElement.on('mousedown', this.proxiedOnMarqueeMousedown);
    $marqueeElement.on('mousemove', this.proxiedOnMarqueeMousemove);
    $marqueeElement.on('mouseup', this.proxiedOnMarqueeMouseup);
    $marqueeElement.on('mousewheel', this.proxiedOnMarqueeMousewheel);
};

sc.canvas.CanvasViewer.prototype.handleMarqueeMousedown = function(event) {
    if (this.mainViewport.isEmpty()) {
        return;
    }

    this.isMarqueeDragging = true;

    var canvasCoord = this.marqueeViewport.pageToCanvasCoord(event.pageX, event.pageY);
    this.mainViewport.centerOnCanvasCoord(canvasCoord);

    this.updateMarqueeBox();
};
sc.canvas.CanvasViewer.prototype.handleMarqueeMousemove = function(event) {
    if (this.isMarqueeDragging && !this.mainViewport.isEmpty()) {
        var canvasCoord = this.marqueeViewport.pageToCanvasCoord(event.pageX, event.pageY);
        this.mainViewport.centerOnCanvasCoord(canvasCoord);

        jQuery(this.marqueeViewport.getElement()).addClass('sc-CanvasViewport-drag');

        this.updateMarqueeBox();
    }
};
sc.canvas.CanvasViewer.prototype.handleMarqueeMouseup = function(event) {
    this.isMarqueeDragging = false;

    jQuery(this.marqueeViewport.getElement()).removeClass('sc-CanvasViewport-drag');
};
sc.canvas.CanvasViewer.prototype.handleMarqueeMousewheel = function(event, delta, deltaX, deltaY) {
    if (this.mainViewport.isEmpty()) {
        return;
    }

    if (event.shiftKey) {
        this.mainViewport.panByPageCoords(
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

        this.mainViewport.zoomByFactor(factor);
    }

    event.preventDefault();
    return false;
};

sc.canvas.CanvasViewer.prototype.updateMarqueeBox = function() {
    if (goog.now() - this.timeOfLastIgnorableBoundsChange < 200) {
        return;
    }
    
    if (this.marqueeBox && this.mainViewport.canvas && this.marqueeViewport.canvas) {
        var bounds = this.mainViewport.getBounds();
        
        var topLeft = this.marqueeViewport.canvasToLayerCoord(bounds.x, bounds.y);
        var bottomRight = this.marqueeViewport.canvasToLayerCoord(bounds.x2, bounds.y2);
        var width = bottomRight.x - topLeft.x;
        var height = bottomRight.y - topLeft.y;
        var centeredCoords = sc.canvas.FabricCanvas.toCenteredCoords(topLeft.x, topLeft.y, width, height);

        this.marqueeBox.set('left', centeredCoords.x).set('top', centeredCoords.y);
        this.marqueeBox.set('width', width).set('height', height);
        this.marqueeBox.setGradientFill({
            x1: 0, y1: 0,
            x2: 0, y2: this.marqueeBox.height,
            colorStops: {
                0: 'rgba(15, 108, 214, 0.5)',
                1: 'rgba(15, 108, 214, 0.25)'
            }
        });
        this.marqueeBox.bringToFront();

        this.marqueeViewport.requestFrameRender();
    }
};

sc.canvas.CanvasViewer.prototype.requestFrameRender = function() {
    this.mainViewport.requestFrameRender();
    this.marqueeViewport.requestFrameRender();
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
