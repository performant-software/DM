goog.provide("atb.viewer.MarkerData");

goog.require('atb.resource.MarkerResource');

goog.require("atb.util.ReferenceUtil");

///////////////////////////////////////////////

//Helper class:
atb.viewer.RemoteIDObject = function () {
	this._remoteId = -1;
};

atb.viewer.RemoteIDObject.prototype.getRemoteId = function () {
	return this._remoteId;
};

atb.viewer.RemoteIDObject.prototype.setRemoteId = function (set_remoteId) {
	this._remoteId = set_remoteId;
};

atb.viewer.RemoteIDObject.prototype.hasRemoteId = function () {
	return (this.getRemoteId() != -1);//hack
};


///////////////////////////////////////////////////////

/**
 * this represents a "Marker" which can have its geometry modified, etc.
**/
atb.viewer.MarkerData = function(
	localId, 
	featureInfo, 
	
	createFeatureFunc, 
	destroyFeatureFunc, 
	setRemoteIdFunc
){

	featureInfo = atb.util.ReferenceUtil.applyDefaultValue(featureInfo, null);//PARANOIA!!!
	
	this.state = {
		bEnabled: true,
		remoteId: new atb.viewer.RemoteIDObject(),
		localId: localId,
		featureInfo: featureInfo,
		bDeleted: false				//lol new!
	};
	this.callbacks = {
		onCreateFeature: createFeatureFunc,
		onDestroyFeature: destroyFeatureFunc,
		onSetRemoteID: setRemoteIdFunc
	};
	if (featureInfo !== null) {
		featureInfo.userInfo = this;
	}
	
	this.clearModified();
    
    this.markModified();
};

//[some] hacks:

//lolused:
atb.viewer.MarkerData.prototype.forceRecreation = function () {
	this.setEnabled(false);
	this.setEnabled(true);//hack
};

//end hacks


atb.viewer.MarkerData.prototype.getLocalId = function () {
	return this.state.localId;
};

atb.viewer.MarkerData.prototype.getRemoteId = function () {
	return this.state.remoteId.getRemoteId();
};

atb.viewer.MarkerData.prototype.setCanvasId = function (canvasId) {
    this.canvasId = canvasId;
};

atb.viewer.MarkerData.prototype.getCanvasId = function () {
    return this.canvasId;
};

atb.viewer.MarkerData.prototype.isEnabled = function () {
	return this.state.bEnabled;
};

atb.viewer.MarkerData.prototype.getFeature = function () {
	return this.state.featureInfo;
};

atb.viewer.MarkerData.prototype.getFeatureCopy= function () {
	var ret = this.getFeature().clone();
	ret.userInfo = this;
	return ret;
};

atb.viewer.MarkerData.prototype.setEnabled = function (set_bEnabled) {
	set_bEnabled = (set_bEnabled==true);
	if (this.isEnabled() != set_bEnabled) {
		this.state.bEnabled = set_bEnabled;
		
		var featureCopy = this.getFeatureCopy();
		var oldFeature = this.state.featureInfo;
		this.state.featureInfo = featureCopy;
		
		if (set_bEnabled) {
			this.callbacks.onCreateFeature(featureCopy);
		}
		else {
			this.callbacks.onDestroyFeature(oldFeature);
		}
	};
};

atb.viewer.MarkerData.prototype.setRemoteId = function (set_remoteId) {
	this.state.remoteId.setRemoteId(set_remoteId);
	this.callbacks.onSetRemoteID(this, set_remoteId);
};

atb.viewer.MarkerData.prototype.isDeleted = function () {
	return this.state.bDeleted;
};
atb.viewer.MarkerData.prototype.setDeleted = function (set_bDeleted) {
	set_bDeleted = !!set_bDeleted;
	this.state.bDeleted = set_bDeleted;
	if (set_bDeleted) {
		this.setEnabled(false);//hack
	}//^LOL...what of deleted state when setenabled...??
};

atb.viewer.MarkerData.prototype.restoreFromCopyHack = function (copyFrom) {
	this.state.featureInfo = copyFrom.getFeatureCopy();
	this.setDeleted(copyFrom.isDeleted());
	this.setEnabled(copyFrom.isEnabled());
	if (this.state.localId !== copyFrom.state.localId) {
		debugPrint("this.state.localId="+this.state.localId+"; !== copyFrom.state.localId="+copyFrom.state.localId+";");
	}
	var remId = this.getRemoteId();
	var otherRemId = copyFrom.getRemoteId();
};

atb.viewer.MarkerData.prototype.copy = function () {
	var ret = new atb.viewer.MarkerData(
		this.getLocalId(), 
		this.getFeatureCopy(),
		this.callbacks.onCreateFeature, 
		this.callbacks.onDestroyFeature,
		this.callbacks.onSetRemoteID
	);
	ret.state.remoteId = this.state.remoteId;
	ret.state.bEnabled = this.isEnabled();
	ret.state.bDeleted = this.isDeleted();
	
	//ret.setEnabled(this.isEnabled());
	
	return ret;
};

atb.viewer.MarkerData.prototype.clone = atb.viewer.MarkerData.prototype.copy;

atb.viewer.MarkerData.prototype.saveMarkerJSON = function () {
	var json = {"Error": "unhandled marker type!"};//hack
	var markerType = this.getFeature().geometry.CLASS_NAME; //HACK
	
    if (markerType == "OpenLayers.Geometry.Polygon") {
		json = this.savePolygon();
	}
	else if (markerType == "OpenLayers.Geometry.LineString") {
		json = this.savePolyline();
	}
	else if (markerType == "OpenLayers.Geometry.Point") {
		json = this.savePoint();
	}
	else {
		debugPrint("unhandled marker type: "+markerType);
	}
	
	return json;
};

goog.provide('atb.viewer.MarkerData.DEFAULT_STYLE');
atb.viewer.MarkerData.DEFAULT_STYLE = {
    fill: true,
    fillColor: "#312EE7",
    fillOpacity: 0.5,

    stroke: true,
    strokeWidth: 3,
    strokeColor: "#882222",
    strokeOpacity: 1.0,

    pointRadius: 7
};

atb.viewer.MarkerData.prototype.loadMarkerResource = function (resource) {
    this.resource = resource;
    
    var remoteId = resource.getRemoteId();
    var markerType = resource.getShapeType();
    var shapeData = resource.getShapeData();
    var geom = null;
    
    this.markerType = markerType;
    
    if (markerType == 'point') {
        geom = new OpenLayers.Geometry.Point(shapeData.cx, shapeData.cy);
    }
    else if (markerType == 'line' || markerType == 'polygon') {
        var points = shapeData.points;
        var olPoints = [];
        
        for (var i=0, len=points.length; i<len; i++) {
            var point = points[i];
            
            var x = point[0], y = point[1];
            var olPoint = new OpenLayers.Geometry.Point(x,y);
            
            olPoints.push(olPoint);
        }
        
        if (markerType == 'line') {
			geom = new OpenLayers.Geometry.LineString(olPoints);
		}
		else {
			geom = new OpenLayers.Geometry.Polygon([new OpenLayers.Geometry.LinearRing(olPoints)]);
		}
    }
    
    var featureStyle = atb.util.ReferenceUtil.mergeOptions(
        {
            fillColor: shapeData.fill,
            fillOpacity: shapeData.fillOpacity,
            
            strokeWidth: shapeData.stroke,
            strokeOpacity: shapeData.strokeOpacity,
            strokeColor: shapeData.strokeColor,
            
            pointRadius: shapeData.radius
        },
        atb.viewer.MarkerData.DEFAULT_STYLE
    );
    var featureOptions = {};
    
    var feature = new OpenLayers.Feature.Vector(geom, featureOptions, featureStyle);
    
    feature.userInfo = this;
	
	var wasEnabled= this.isEnabled();
	this.setEnabled(false);
	this.state.featureInfo = feature;
	this.setEnabled(wasEnabled);
	
	if (remoteId != -1) {
		this.setRemoteId(remoteId);
	}
    
    this.setCanvasId(resource.getCanvasId());
	
	this.forceRecreation();
};

atb.viewer.MarkerData.prototype.saveMarkerResource = function () {
    var resource = new atb.resource.MarkerResource(this.getRemoteId(), this.getRemoteId());
    var shapeData = resource.getShapeData();
    var feature = this.getFeature();
    var style = feature.style;
    
    var olMarkerType = feature.geometry.CLASS_NAME;
    if (olMarkerType == "OpenLayers.Geometry.Polygon") {
		this.markerType = 'polygon';
	}
	else if (olMarkerType == "OpenLayers.Geometry.LineString") {
		this.markerType = 'line';
	}
	else if (olMarkerType == "OpenLayers.Geometry.Point") {
		this.markerType = 'point';
	}
    
    resource.shapeData.shapeType = this.markerType;
    resource.shapeType = this.markerType;
    
    resource.canvasId = this.getCanvasId();
    
    if (this.markerType == 'point') {
        var pt = feature.geometry;
        shapeData.cx = pt.x;
        shapeData.cy = pt.y;
        
        shapeData.radius = style.pointRadius;
    }
    else if (this.markerType == 'line' || this.markerType == 'polygon') {
        var olPointsList;
        if (this.markerType == 'line') {
            olPointsList = feature.geometry.components;
        }
        else if (this.markerType == 'polygon') {
            olPointsList = feature.geometry.components[0].components;
        }
        
        var vertexList = [];
        for (var i=0, len=olPointsList.length; i<len; i++) {
            var raw = olPointsList[i];
            vertexList.push([raw.x,raw.y]);
        }
        
        shapeData.points = vertexList;
    }
    
    shapeData.fill = style.fillColor;
    shapeData.fillOpacity = style.fillOpacity;
    shapeData.stroke = style.strokeWidth;
    shapeData.strokeColor = style.strokeColor;
    shapeData.strokeOpacity = style.strokeOpacity;
    
    this.resource = resource;
    
    return resource;
};

atb.viewer.MarkerData.prototype.savePoint = function () {
	var remoteId = this.getRemoteId();
	var localId = this.getLocalId();
	var feature = this.getFeature();
	
	var pt = feature.geometry;
	var x=pt.x;
	var y=pt.y;
	
	var style = this.getFeature().style;
	var ret = {
		"id": remoteId,
		"shape": "point",
		"circle": {
			"cx": x,
			"cy": y,
			
			//style:
			"radius": style.pointRadius,
			
			"fill": style.fillColor,
			"fillOpacity": style.fillOpacity,
			
			"stroke": style.strokeWidth,
			"strokeColor": style.strokeColor,
			"strokeOpacity": style.strokeOpacity
		}
	};
	return ret;
};

atb.viewer.MarkerData.prototype.savePolyline = function () {
	var remoteId = this.getRemoteId();
	var localId = this.getLocalId();
	var feature = this.getFeature();
	
	//Hack - this only works on single linear-ring polygons for now:
	var linestring = feature.geometry;//.components[0]; //hack
	var myVertexList = [];
	for (var i=0; i<linestring.components.length; i++) {
		var raw = linestring.components[i];
		myVertexList.push([raw.x,raw.y]);
	}
	
	var style = this.getFeature().style;
	var ret = {
		"id": remoteId,
		"shape": "line",
		"polyline": {
			"points": myVertexList,
			
			//style:
			"fill": style.fillColor,
			"fillOpacity": style.fillOpacity,
			
			"stroke": style.strokeWidth,
			"strokeColor": style.strokeColor,
			"strokeOpacity": style.strokeOpacity
		}
	};
	return ret;
};

atb.viewer.MarkerData.prototype.savePolygon = function () {
	var remoteId = this.getRemoteId();
	var localId = this.getLocalId();
	var feature = this.getFeature();
	
	//Hack - this only works on single linear-ring polygons for now:
	var ring = feature.geometry.components[0]; //hack
	var myVertexList = [];
	for(var i=0; i<ring.components.length; i++) {
		var raw = ring.components[i];
		myVertexList.push([raw.x,raw.y]);
	}
	
	var style = this.getFeature().style;
	
	var ret = {
		"id": remoteId,
		"shape": "polygon",
		"polygon": {
			"points": myVertexList,
			
			//style:
			"fill": style.fillColor,
			"fillOpacity": style.fillOpacity,
			"stroke": style.strokeWidth,
			"strokeColor": style.strokeColor,
			"strokeOpacity": style.strokeOpacity
		}
	};
	return ret;
};

atb.viewer.MarkerData.prototype.wasModified = function () {
	return this.modified;
};

atb.viewer.MarkerData.prototype.clearModified = function () {
	this.modified = false;
};

atb.viewer.MarkerData.prototype.hasRemoteId = function () {
	return this.state.remoteId.hasRemoteId();
};

atb.viewer.MarkerData.prototype.markModified = function () {
    this.modified = true;
};