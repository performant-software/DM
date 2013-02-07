/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 * @requires Resource.js
 * @requires Size.js
 */

AnnotationToolbox.Viewer = {};

AnnotationToolbox.Viewer.ResourceViewer = AnnotationToolbox.Class({
	webService: null,
    resourceID: null,
    image: null,
	olViewer: null,
	olViewerSize: null,
	olBaseLayer: null,
	olNumZoomLevels: 5,

	initialize: function(viewerDomId, viewerSize) {
		this.olViewerSize = viewerSize;
		this.olViewer = new OpenLayers.Map(viewerDomId);
		return this.olViewer;
	},

    setWebService: function(webService) {
        this.webService = webService;
    },


	// This method should be in a base class called ResourceViewer
	setResource: function(resourceID, imageID, doAfter) {

        var viewer = this;

        var setBaseLayer = function(resource) {
            var imageData = resource.getImages()[imageID+'']; 
            viewer.image = 
                new AnnotationToolbox.Resource.Image(
                    imageID, 
                    new AnnotationToolbox.Size(imageData.width, 
                                               imageData.height)
                );

            var resourceImageURI = 
				viewer.webService.resourceImageURI(
                    resourceID,
                    imageID,
                    viewer.image.size
                );

            if (viewer.olBaseLayer != null) {
                viewer.olViewer.removeLayer(viewer.olBaseLayer);
            }

            viewer.olBaseLayer = 
			    new OpenLayers.Layer.Image(
				    resource.getTitle(),
                    resourceImageURI,
				    new OpenLayers.Bounds(0.0, 
                                          0.0, 
                                          viewer.image.size.width,
                                          viewer.image.size.height),
				    new OpenLayers.Size(viewer.olViewerSize.width, 
									    viewer.olViewerSize.height),
				    {numZoomLevels: viewer.olNumZoomLevels}
			    );
		    
            viewer.olViewer.addLayers([viewer.olBaseLayer]);
			
            viewer.centerOnCenter();
            viewer.setMinZoom();
            if (doAfter) {
                doAfter();
            }
        }
        
		this.resourceID = resourceID;
        this.webService.withResource(resourceID, setBaseLayer);
	},

    centerOnCenter: function() {
        this.olViewer.setCenter(new OpenLayers.LonLat(0, 0), 3);
    },

    setMinZoom: function() {
        this.olViewer.zoomToMaxExtent();
    },
});
