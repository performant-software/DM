const POINT = 0;
const POLYLINE = 1;
const POLYGON = 2;


function ImageAnnotator(map, username, 
						imageWidth, imageHeight, 
						mapWidth, mapHeight,
						baseURL, annotationID) {
	this.map = map;
	this.imageWidth = imageWidth;
	this.imageHeight = imageHeight;
	this.mapWidth = mapWidth;
	this.mapHeight = mapHeight;
	this.username = username;
	this.baseURL = baseURL;
	this.annotationID = annotationID;
	this.layers = {};
	this.controls = {};
	this.annotationLayer;
	this.annotationLayerID;
	this.addLayer = _addLayer;
	this.toggleAnnotationLayer = _toggleAnnotationLayer;
	this.layerIDs = _layerIDs;
	this.addDMLayers = _addDMLayers;
	this.addControls = _addControls;
	this.createPointFromXML = _createPointFromXML;
	this.createPointFeature = _createPointFeature;
	this.createPolylineFeature = _createPolylineFeature;
	this.createPolygonFeature = _createPolygonFeature;
	this.updateNarrative = _updateNarrative;
	this.switchImageDialog = _switchImageDialog;

	var $dialog = 
		$('<div style="width:500px;"></div>')
		.html('This dialog will show every time!')
		.dialog({
			autoOpen: false,
			title: 'Basic Dialog'
		});


	var $imagesDialog = 
		$('<div style="width:500px;"></div>')
		.html('This dialog will show every time!')
		.dialog({
			autoOpen: false,
			title: 'Select Image'
		});




	function imageCoord(mapCoord, mapDim, imageDim) {
		return Math.floor(projection(mapCoord, mapDim, imageDim));
	}


	function _updateNarrative(baseURL, title, text) {
		var messageXML = 
			"<annotation>" 
			+ "<title>" + title + "</title>"
			+ "<text>" + text + "</text>"
			+ "</annotation>";
		var postURL = 
			baseURL + "/annotation/" + this.annotationID + "/update_narrative/";
		jQuery.post(postURL, 
					{message: messageXML},
					function(data) {
						$(data).find("field").each(function()
	                    {
                        });
					}
				   );
		
	}


	function _createPointFromXML(pointXML) {
	    var point = $(pointXML);
		var x = parseFloat($(point).attr("x"));
		var y = parseFloat($(point).attr("y"));
		var mapX = projection(x, this.imageWidth, this.mapWidth);
		var mapY = projection(y, this.imageHeight, this.mapHeight);
		pointGeometry = new OpenLayers.Geometry.Point(mapX, this.mapHeight - mapY);
		return pointGeometry;
	}


    function _createPointFeature(pointXML) {
		var pointGeometry = this.createPointFromXML(pointXML);
	    var point = $(pointXML);
		var id = parseInt($(point).attr("id"));
		var isAnnotationTarget = "false";
		if(typeof($(point).attr("annotation_target")) != "undefined") {
			isAnnotationTarget = "true";
		}
		return new OpenLayers.Feature.Vector(pointGeometry, 
											 {id: id,
											  shape: POINT,
											  annotationTarget: isAnnotationTarget});
    }


    function _createPolylineFeature(polylineXML) {
		var annotator = this;
	    var polyline = $(polylineXML);
		var id = parseInt($(polyline).attr("id"));
		var isAnnotationTarget = "false";
		if(typeof($(polyline).attr("annotation_target")) != "undefined") {
			isAnnotationTarget = "true";
		}
		var points = [];
		$(polyline).find("point").each(function()
        {
			var point = annotator.createPointFromXML(this);
			points.push(point);
        });
 		polylineGeometry = new OpenLayers.Geometry.LineString(points);
 		return new OpenLayers.Feature.Vector(polylineGeometry, 
 											 {id: id,
											  shape: POLYLINE,
											  annotationTarget: isAnnotationTarget});
    }


    function _createPolygonFeature(polygonXML) {
		var annotator = this;
	    var polygon = $(polygonXML);
		var id = parseInt($(polygon).attr("id"));
		var isAnnotationTarget = "false";
		if(typeof($(polygon).attr("annotation_target")) != "undefined") {
			isAnnotationTarget = "true";
		}
		var ring = new OpenLayers.Geometry.LinearRing();
		$(polygon).find("point").each(function()
        {
			var point = annotator.createPointFromXML(this);
			ring.addComponent(point);
        });

 		polygonGeometry = new OpenLayers.Geometry.Polygon([ring]);
 		return new OpenLayers.Feature.Vector(polygonGeometry, 
 											 {id: id,
											  shape: POLYGON,
											  annotationTarget: isAnnotationTarget});
    }


	function _addDMLayers(url) {
		var annotator = this;
		jQuery.get(url, 
				   {}, 
				   function(xmlObj) {
					   $(xmlObj).find("layer").each(function () 
					   {
			               var id = $(this).attr("id");
					       var name = $(this).attr("name");
						   var newLayer = annotator.addLayer(id, name, true);
						   $(this).find("points").each(function () 
						   {
						       $(this).find("point").each(function()
				               {
							       var newFeature = annotator.createPointFeature(this);
							       newLayer.addFeatures([newFeature]);
						       });
                           });
						   $(this).find("polyline").each(function()
				           {
							   var newFeature = annotator.createPolylineFeature(this);
							   newLayer.addFeatures([newFeature]);
						   });
						   $(this).find("polygon").each(function()
				           {
							   var newFeature = annotator.createPolygonFeature(this);
							   newLayer.addFeatures([newFeature]);
						   });
					   });
				   }
				  );
	}


	function _addLayer(id, name, isAnnoLayer) {
		if (isAnnoLayer == undefined) {
			isAnnoLayer = false;
		}

		var temporaryStyle = new OpenLayers.Style({'fillColor': '#008888',
												   'strokeColor': '#008888', 
												   'fillOpacity': 0.2,
												   'strokeWidth': 3,
												   'pointRadius': 5,
												   'strokeOpacity': 0.6});
		var defaultStyle = new OpenLayers.Style({'fillColor': '#2222bb',
												 'strokeColor': '#2222bb', 
												 'fillOpacity': 0.2,
												 'strokeWidth': 3,
												 'pointRadius': 5,
												 'strokeOpacity': 0.6});
		var selectStyle = new OpenLayers.Style({'fillColor': '#22bb22',
												'strokeColor': '#22bb22', 
												'fillOpacity': 0.2,
												'strokeWidth': 3,
												'pointRadius': 5,
												'strokeOpacity': 0.6});

		var styleMap = new OpenLayers.StyleMap(
			{
				"temporary": temporaryStyle,	
				"default": defaultStyle,
				"select": selectStyle
			}
		)

		var lookup = {
			"false": {'fillColor': '#2222bb',
					  'strokeColor': '#2222bb'},
			"true": {'fillColor': '#22bb22',
					 'strokeColor': '#22bb22'}
		}

		styleMap.addUniqueValueRules("default", "annotationTarget", lookup);		

		var newLayer = 
			new OpenLayers.Layer.Vector(name,
										{styleMap: styleMap});

		this.map.addLayers([newLayer]);

		idStr = id + "";
		this.layers[idStr] = newLayer;
		if (isAnnoLayer) {
			this.toggleAnnotationLayer(idStr);
		}

		return newLayer;
	}


	function createXYAttributes(vertex,
								mapWidth, mapHeight,
								imageWidth, imageHeight) {
		var x = imageCoord(vertex.x, mapWidth, imageWidth);
		var y = imageCoord(mapHeight - vertex.y, mapHeight, imageHeight);
		var xyAttributes = "x='" + x + "' y='" + y + "'";

		return xyAttributes;
	}


	function createVerticesXML(geometry, 
							   mapWidth, mapHeight,
							   imageWidth, imageHeight) {
		var verticesXML = "<vertices>";
		var vertices = geometry.getVertices();
		for (var i=0; i<vertices.length; i++) {
			var xy = createXYAttributes(vertices[i],
										mapWidth, mapHeight,
										imageWidth, imageHeight);
			verticesXML += 
			"<point " + xy + "/>";
		}
		verticesXML += "</vertices>";

		return verticesXML;
	}


	function postSuccess(data, textStatus, ajaxRequest) {
//		console.log("post returned: " + data);
	}


	function addToDM(addToLayerURL, addToAnnotationURL, featureXML, feature, tagName) {
		jQuery.post(addToLayerURL,
					{message: featureXML},
					function(data) {
						$(data).find(tagName).each(function()
	                    {
							var id = $(this).attr("id");
							feature.attributes["id"] = id;
							addToAnnotationURL += id + "/";
							jQuery.post(addToAnnotationURL, {});
						});
                    });
	}


	function drawAndUpload(shape, geometry, 
						   map, theLayer, layerID, 
						   mapWidth, mapHeight,
 						   imageWidth, imageHeight,
						   baseURL, annotator) {

		var featureObj = new OpenLayers.Feature.Vector(geometry,
													   {annotationTarget: "true"});
		annotator.annotationLayer.addFeatures([featureObj]);

		var addFeatureURL = baseURL + "/image/layer/" + annotator.annotationLayerID;
		var addToAnnotationURL = baseURL + "/annotation/" + annotator.annotationID;

		var featureXML = "";
		if (shape == POLYGON) {
			featureObj.attributes['shape'] = POLYGON;
			featureXML += "<polygon>";
			featureXML += createVerticesXML(geometry, 
											mapWidth, mapHeight,
											imageWidth, imageHeight);
			featureXML += "</polygon>";
			addFeatureURL += "/add_polygon/";
			addToAnnotationURL += "/add_polygon/";
			addToDM(addFeatureURL, addToAnnotationURL, 
					featureXML, featureObj, "polygon");
		} else if (shape == POLYLINE) {
			featureObj.attributes['shape'] = POLYLINE;
			featureXML += "<polyline>";
			featureXML += createVerticesXML(geometry, 
											mapWidth, mapHeight,
											imageWidth, imageHeight);
			featureXML += "</polyline>";
			addFeatureURL += "/add_polyline/";
			addToAnnotationURL += "/add_polyline/";
			addToDM(addFeatureURL, addToAnnotationURL, 
					featureXML, featureObj, "polyline");
		} else {
			featureObj.attributes['shape'] = POINT;
			var xy = createXYAttributes(geometry, 
										mapWidth, mapHeight,
										imageWidth, imageHeight);
			featureXML += "<point " + xy + " />"; 
			addFeatureURL += "/add_point/";
			addToAnnotationURL += "/add_point/";
			addToDM(addFeatureURL, addToAnnotationURL, 
					featureXML, featureObj, "point");
		}


	}


	function _switchImageDialog(annotationID) {
		var url = this.baseURL + "/feed/html/edit_image_thumbs/" + annotationID;
		jQuery.get(url,
				   {}, 
				   function(data) {
					   $dialog.dialog({title: 'Select an Image',
									   width: 200,
									   height: 500});
					   $dialog.html(data);
					   $dialog.dialog('open');
				   }
				  );
	}


	function selectFeature(theFeature, baseURL) {
		var featureID = theFeature.attributes['id'];
		var shape = theFeature.attributes['shape'];
		var url = baseURL + "/feed/html";
		if (shape == POINT) {
			url += "/point/" + featureID + "/annotations/";
		} else if (shape == POLYLINE) {
			url += "/polyline/" + featureID + "/annotations/";
		} else {
			url += "/polygon/" + featureID + "/annotations/";
		}
		jQuery.get(url,
				   {}, 
				   function(data) {
					   $dialog.dialog({title: 'Annotation Summary',
									   width: 500,
									   height: 500});
					   $dialog.html(data);
					   $dialog.dialog('open');
				   }
				  );


//		console.log("id: " + theFeature.attributes['id']);
	}


	function deleteFeature(theFeature, theLayer, layerID, baseURL, annotator) {
		var id = theFeature.attributes['id'];
		var shape = theFeature.attributes['shape'];
		var deleteFeatureURL = baseURL + "/image/layer/" + annotator.annotationLayerID
		if (shape == POLYGON) {
			deleteFeatureURL += "/delete_polygon/" + id;
		} else if (shape == POLYLINE) {
			deleteFeatureURL += "/delete_polyline/" + id;
		}
		if (shape == POINT) {
			deleteFeatureURL += "/delete_point/" + id;
		}
		annotator.annotationLayer.removeFeatures([theFeature]);
		jQuery.post(deleteFeatureURL, 
					{}
				   );
	}


	function _addControls(map, theLayer, layerID, allLayers,
						  mapWidth, mapHeight,
						  imageWidth, imageHeight, 
						  controls,
						  baseURL) {

		var annotator = this;
		
		var drawPoint = 
			function(geometry) {
				drawAndUpload(POINT, geometry, 
							  map, theLayer, layerID,
							  mapWidth, mapHeight,
							  imageWidth, imageHeight,
							  baseURL, annotator);
			}
		var drawPolyline = 
			function(geometry) {
				drawAndUpload(POLYLINE, geometry, 
							  map, theLayer, layerID, 
							  mapWidth, mapHeight,
							  imageWidth, imageHeight,
							  baseURL, annotator);
			}
		var drawPolygon = 
			function(geometry) {
				drawAndUpload(POLYGON, geometry, 
							  map, theLayer, layerID, 
							  mapWidth, mapHeight,
							  imageWidth, imageHeight,
							  baseURL, annotator);
			}

		controls['point'] = 
			new OpenLayers.Control.DrawFeature(theLayer,
											   OpenLayers.Handler.Point,
											   {drawFeature: drawPoint});
		controls['line'] = 
			new OpenLayers.Control.DrawFeature(theLayer,
											   OpenLayers.Handler.Path,
											   {drawFeature: drawPolyline});
		controls['polygon'] =
			new OpenLayers.Control.DrawFeature(theLayer,
											   OpenLayers.Handler.Polygon,
											   {drawFeature: drawPolygon}
// 											   {drawFeature: function(geometry) {
// 												   console.log(layerID);
// 												   drawAndUpload(POLYGON, geometry, 
// 																 map, 
// 																 this.annotationLayer,
// 																 this.annotationLayerID, 
// 																 mapWidth, mapHeight,
// 																 imageWidth, imageHeight,
// 																 baseURL,
// 																 annotator);
// 											   }
// 											   }
											  );
		var allLayersArray = [];
		for (var layerID in allLayers) {
			allLayersArray.push(allLayers[layerID]);
		}
		controls['select'] = 
			new OpenLayers.Control.SelectFeature(allLayersArray,
												 {
													 clickout: true,
													 onSelect: function(f) {
														 selectFeature(f, baseURL);
													 },
													 multiple: false,
													 toggle: true
												 }
												);
		controls['edit'] = 
			new OpenLayers.Control.ModifyFeature(theLayer,
												 {
													 clickout: true,
													 onSelect: function(f) {
//														 console.log("edit " + f.id);
													 }
												 }
												);
		controls['delete'] = 
			new OpenLayers.Control.SelectFeature(theLayer,
												 {
													 clickout: true,
													 onSelect: function(f) {
														 deleteFeature(f, theLayer, 
																	   layerID, baseURL,
																	   annotator);
													 }
												 }
												);
		
		controls['drag'] = new OpenLayers.Control.DragFeature(theLayer)
		
// 		theLayer.events.on({
// 		    "featureselected": function(e) {
// 		        console.log("selected feature "+e.feature.id+" on Vector Layer 1");
// 		    },
// 		    "featureunselected": function(e) {
// 		        console.log("unselected feature "+e.feature.id+" on Vector Layer 1");
// 		            }
// 		});

		for(var key in controls) {
			map.addControl(controls[key]);
		}
		
		return controls;
	}


	function _toggleAnnotationLayer(layerID) {
		for(var key in this.controls) {
			this.controls[key].deactivate();
			this.map.removeControl(this.controls[key]);
		}

		this.annotationLayerID = layerID;
		var theLayer = this.layers[layerID];
		this.annotationLayer = theLayer;
 		this.addControls(this.map, theLayer, layerID, this.layers,
 						 this.mapWidth, this.mapHeight,
 						 this.imageWidth, this.imageHeight, 
 						 this.controls,
 						 this.baseURL);
	}


	function _layerIDs() {
		var ids = [];
		for (var key in this.layers) {
			ids.push(key);
		}
		return ids;
	}
}



function saveLayer(layer) {
    var annoStr = "<layer>";
	annoStr += "\n\t";
    var features = layer.features;
    for (i = 0; i < markers.length; i++) {
        annoStr += "\n<lines>";
        var vertices = markers[i].geometry.getVertices();
        if (vertices.length == 1) {
            var x = imageCoord(vertices[0].x, mapMaxX, imageWidth); 
            var y = imageCoord(vertices[0].y, mapMaxY, imageHeight); 
            annoStr += "\n<marker x1_coord=\"" + x + "\" y1_coord=\"" + y + "\"";
            annoStr += " x2_coord=\"-1\" y2_coord=\"-1\"/>";
        }
        for (j = 0; j < vertices.length; j++) {
            var endIndex = j + 1;            
            if (j == (vertices.length - 1)) {
                endIndex = 0;
            }
            var x1 = imageCoord(vertices[j].x, mapMaxX, imageWidth); 
            var y1 = imageCoord(vertices[j].y, mapMaxY, imageHeight); 
            var x2 = imageCoord(vertices[endIndex].x, mapMaxX, imageWidth); 
            var y2 = imageCoord(vertices[endIndex].y, mapMaxY, imageHeight); 
            annoStr += "\n<marker x1_coord=\"" + x1 + "\" y1_coord=\"" + y1 + "\"";
            annoStr += " x2_coord=\"" + x2 + "\" y2_coord=\"" + y2 + "\"";
        }
        
//        console.log(vectors.features[i].geometry);
        annoStr += "\n</lines>";
    }                      
    annoStr += "\n</markers>\n</anno>";
    var annoTextArea = document.getElementById("annoText");
    annoTextArea.value = annoStr;
}




