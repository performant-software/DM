goog.provide('dm.resource.CanvasSummary');

goog.require('dm.resource.ResourceSummary');
goog.require('goog.math.Size');
goog.require('dm.canvas.FabricCanvasViewport');
goog.require('dm.canvas.FabricCanvasFactory');

/**
 * dm.resource.CanvasSummary
 *
 * Provides an overview of an image based resource
 *
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends dm.resource.ResourceSummary
 */
dm.resource.CanvasSummary = function (uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    dm.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);

    this.size = new goog.math.Size(75, 75);
    this.title = this.databroker.dataModel.getTitle(this.resource);

    this.decorate();
};
goog.inherits(dm.resource.CanvasSummary, dm.resource.ResourceSummary);

dm.resource.CanvasSummary.prototype.resourceType = 'Canvas';

dm.resource.CanvasSummary.prototype.decorate = function () {
    // if (! this.styleOptions.titleOnly) {
    var image = this.domHelper.createDom('div');
    this.viewport = new dm.canvas.FabricCanvasViewport(this.databroker);
    this.viewport.resize(this.size.width, this.size.height);
    var deferredCanvas = dm.canvas.FabricCanvasFactory.createDeferredCanvas(this.resource.getUri(), this.databroker);
    this.viewport.addDeferredCanvas(deferredCanvas);
    this.viewport.render(image);

    this.div.appendChild(image);
    // }

    var showFeature = function(canvas) {
       $(".atb-markersummary-loadingSpinner").removeClass("atb-markersummary-loadingSpinner");
       canvas.hideMarkers();
       this.viewport.zoomToFit();
    }.bind(this);

    deferredCanvas.progress(showFeature);

    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-resourcesummary-title'
        }
    );
    jQuery(this.titleDiv).text(this.title);
    jQuery(this.div).append(this.titleDiv);

    if (! this.styleOptions.titleOnly) {
        jQuery(this.div).append('<div style="clear:both;" />');
    }
};
