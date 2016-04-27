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
atb.resource.MarkerSummary = function(uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
   atb.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);

   this.selected = false;

   this.setTooltip('Show this marker on the canvas');

   this.size = new goog.math.Size(75, 75);

   this.decorate();
};
goog.inherits(atb.resource.MarkerSummary, atb.resource.ResourceSummary);

atb.resource.MarkerSummary.prototype.resourceType = 'Marker';

atb.resource.MarkerSummary.prototype.decorate = function() {
   $(this.outerDiv).addClass('atb-markersummary');

   this.imageDiv = $("<div class='atb-markersummary-thumb atb-markersummary-loadingSpinner'></div>");
   $(this.imageDiv).width(this.size.width);
   $(this.imageDiv).height(this.size.height);

   this.viewport = new sc.canvas.FabricCanvasViewport(this.databroker);
   this.viewport.resize(this.size.width, this.size.height);
   var deferredCanvas = sc.canvas.FabricCanvasFactory.createDeferredCanvas(this.resource.getOneProperty('oa:hasSource'), this.databroker);
   this.viewport.addDeferredCanvas(deferredCanvas);
   this.viewport.render(this.imageDiv[0]);

   var showFeature = function(canvas) {
      
      var txt = this.databroker.dataModel.getTitle(canvas.uri);
      $("#img-title").text(txt);
  
      $(".atb-markersummary-loadingSpinner").removeClass("atb-markersummary-loadingSpinner");
      
      var featureUri = this.resource.getOneProperty('oa:hasSelector');
      var feature = canvas.getFabricObjectByUri(featureUri);

      if (feature) {
         canvas.hideMarkers();
         canvas.showObject(feature);
         this.viewport.zoomToFeatureByUri(featureUri);
      }
   }.bind(this);

   deferredCanvas.progress(showFeature);

   $(this.div).append(this.imageDiv);
   var title = $("<div id='img-title'></div>");
   $(this.div).append(title);
};
