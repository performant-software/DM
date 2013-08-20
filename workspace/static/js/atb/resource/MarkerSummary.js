goog.provide('atb.resource.MarkerSummary');

goog.require('atb.resource.ResourceSummary');
goog.require('goog.math.Size');
goog.require('sc.canvas.FabricCanvasViewport');
goog.require('sc.canvas.FabricCanvasFactory');

/**
 * @extends atb.resource.ResourceSummary
 * 
 * @param resourceId
 * @param clickHandler
 * @param clickHandlerScope
 * @param resource
 * @param webService
 */
atb.resource.MarkerSummary = function (uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);

    this.selected = false;

    this.setTooltip('Show this marker on the canvas');

    this.size = new goog.math.Size(75, 75);

    this.decorate();
};
goog.inherits(atb.resource.MarkerSummary, atb.resource.ResourceSummary);

atb.resource.MarkerSummary.prototype.resourceType = 'Marker';

atb.resource.MarkerSummary.prototype.decorate = function () {
    jQuery(this.outerDiv).addClass('atb-markersummary');
    
    this.imageDiv = this.domHelper.createDom(
        'div',
        {
            'class' : 'atb-markersummary-thumb atb-markersummary-loadingSpinner'
        }
    );
    jQuery(this.imageDiv).width(this.size.width);
    jQuery(this.imageDiv).height(this.size.height);
    
    this.viewport = new sc.canvas.FabricCanvasViewport(this.databroker);
    this.viewport.resize(this.size.width, this.size.height);
    var deferredCanvas = sc.canvas.FabricCanvasFactory.createDeferredCanvas(this.resource.getOneProperty('oa:hasSource'), this.databroker);
    this.viewport.addDeferredCanvas(deferredCanvas);
    this.viewport.render(this.imageDiv);

    var showFeature = function(canvas) {
        var featureUri = this.resource.getOneProperty('oa:hasSelector');
        var feature = canvas.getFabricObjectByUri(featureUri);

        if (feature) {
            this.viewport.pauseRendering();

            canvas.hideMarkers();
            canvas.showObject(feature);

            this.viewport.zoomToFeatureByUri(featureUri);

            this.viewport.resumeRendering();
        }
    }.bind(this);

    deferredCanvas.progress(showFeature).always(showFeature);
    
    this.div.appendChild(this.imageDiv);
};
