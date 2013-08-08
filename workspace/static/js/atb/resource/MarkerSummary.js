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
    this.viewport.pauseRendering();
    this.viewport.addDeferredCanvas(deferredCanvas);
    this.viewport.render(this.imageDiv);

    deferredCanvas.always(function(canvas) {
        var feature = canvas.getFabricObjectByUri(this.resource.getOneProperty('oa:hasSelector'));

        if (feature) {
            canvas.hideMarkers();
            canvas.showObject(feature);

            var boundingBox = canvas.getFeatureBoundingBox(feature);

            if (feature.type == 'circle' && feature.getRadiusX() == 7) {
                // This is almost certainly an old dm 'point', so zoom out more
                var zoomOutFactor = 5;
            }
            else {
                var zoomOutFactor = 2;
            }

            var cx = boundingBox.x + boundingBox.width / 2;
            var cy = boundingBox.y + boundingBox.height / 2;
            var width = boundingBox.width * zoomOutFactor;
            var height = boundingBox.height * zoomOutFactor;
            var x = cx - width / 2;
            var y = cy - height / 2;

            this.viewport.zoomToRect(x, y, width, height);
        }

        this.viewport.resumeRendering();
    }.bind(this));
    
    this.div.appendChild(this.imageDiv);
};
