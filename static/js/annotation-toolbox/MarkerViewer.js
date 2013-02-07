/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 * @requires ResourceViewer.js
 */
AnnotationToolbox.Viewer.MarkerViewer = AnnotationToolbox.Class(
AnnotationToolbox.Viewer.ResourceViewer, {
	annoID: null,
	annotation: null,
	markerLayer: null,
	vectorLayer: null,
	
	DEFAULT_MARKER_ZOOM: 3,

	addMarker: function(annoID) {
        var viewer = this;
        function addMarkerHelper(data) {
            var markerData = data.marker;
            
            if (markerData.type == "point") {
                var markerPoint = markerData.point;
                var marker = new AnnotationToolbox.Marker
                (markerData.id,
                 new OpenLayers.LonLat(markerPoint.lon, markerPoint.lat));
                
                viewer.markerLayer.addMarker(marker);
            } else if (markerData.type == "polygon") {
                var polygon = new AnnotationToolbox.Polygon(markerData.id);
                
                for (var i=0, len=markerData.points.length; i<len; i++) {
                    var point = markerData.points[i];
                    
                    polygon.addPoint(point.lon, point.lat);
                }
                
                viewer.vectorLayer.addFeatures([polygon.generateVector()]);
            } else if (markerData.type == "line") {
                var line = new AnnotationToolbox.Line(markerData.id);
                
                for (var i=0, len=markerData.points.length; i<len; i++) {
                    var point = markerData.points[i];
                    
                    line.addPoint(point.lon, point.lat);
                }
                
                viewer.vectorLayer.addFeatures([line.generateVector()]);
            } else {
                throw "unrecognized marker type";
            }
        }
        
		$.getJSON(this.webService.annotationURI(annoID), addMarkerHelper);
	},
    
	centerOnMarker: function(annoID) {
		var viewer = this;
		
		$.getJSON(this.webService.annotationURI(annoID),
				  function(data) {
					  var markerData = data.marker;
					  
					  if(markerData.type == "point") {
						  var markerPoint = markerData.point;
						  viewer.olViewer.setCenter(new OpenLayers.LonLat(markerPoint.lon, markerPoint.lat), 
													viewer.DEFAULT_MARKER_ZOOM);
					  }
					  else if(markerData.type == "polygon") {
						  var ring = new OpenLayers.Geometry.LinearRing([]);
		                  
						  for (var i=0, len=markerData.points.length; i<len; i++) {
							  var point = markerData.points[i]; // for(var in object) syntax does not work
							  
							  ring.addComponent(new OpenLayers.Geometry.Point(point.lon, point.lat));
						  }
						  
						  var centroid = ring.getCentroid();
						  
						  viewer.olViewer.setCenter(new OpenLayers.LonLat(centroid.x, centroid.y),
													viewer.DEFAULT_MARKER_ZOOM);
					  }
					  else if (markerData.type == "line") {
                          var line = new OpenLayers.Geometry.LineString([]);
                          
                          for (var i=0, len=markerData.points.length; i<len; i++) {
                        	  var point = markerData.points[i];
                        	  
                        	  line.addPoint(point.lon, point.lat);
                          }
                          
                          var centroid = line.getCentroid();
                          
                          viewer.olViewer.setCenter(new OpenLayers.LonLat(centroid.x, centroid.y),
                        							viewer.DEFAULT_MARKER_ZOOM);
                      }
                      else {
                          throw "unrecognized marker type";
                      }
				  });
    },
    
	zoomToMarker: function(annoID) {
		this.centerOnMarker(annoID);
        olViewer.zoomToMaxExtent();
	},
    
	initialize: function(/*webService,*/ viewerDomId, viewerSize) {
        AnnotationToolbox.Viewer.ResourceViewer.prototype.initialize.apply(
            this,
            [viewerDomId, 
             viewerSize]
        );
        
        this.markerLayer = new OpenLayers.Layer.Markers("User Name: Markers");
        this.vectorLayer = new OpenLayers.Layer.Vector("User Name: Vectors");
        
        this.olViewer.addLayers([this.markerLayer, this.vectorLayer]);
	}

});

