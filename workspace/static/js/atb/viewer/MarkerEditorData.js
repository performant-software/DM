goog.provide('atb.viewer.MarkerEditorData');

goog.require('atb.viewer.MarkerData');

goog.require('goog.structs.Set');

goog.require("atb.util.ReferenceUtil");
//TODO: need to distinguish between delete and unshow!

atb.viewer.MarkerEditorData = function(
	set_onCreateFeatureFunc, 
	set_onDestroyFeatureFunc
){
	this.onCreateFeatureFunc = set_onCreateFeatureFunc;
	this.onDestroyFeatureFunc = set_onDestroyFeatureFunc;
	
	this.localPointCounter = 0;
	this.BAD_REMOTE_POINT_ID = -1;
	this.localMarkers = [];
	this.remoteMarkers = [];
	this.allMarkers = [];
    
    this.modifiedMarkers = new goog.structs.Set();
	
	this.hack_maxRemoteIdSeen = 0;//testing hack - for local only testing cases...
};

atb.viewer.MarkerEditorData.prototype.markMarkerModified = function (marker) {
    marker.markModified();
    
    this.modifiedMarkers.add(marker);
};

atb.viewer.MarkerEditorData.prototype.markMarkerUnmodified = function (marker) {
    marker.clearModified();
    
    return this.modifiedMarkers.remove(marker);
};

atb.viewer.MarkerEditorData.prototype.markAllMarkersUnmodified = function () {
    var markers = this.modifiedMarkers.getValues();
    
    for (var i=0, len=markers.length; i<len; i++) {
        var marker = markers[i];
        
        marker.clearModified();
    }
    
    this.modifiedMarkers.clear();
};

atb.viewer.MarkerEditorData.prototype._toLocalIndex = function(localId) {
	var key = 'local_'+localId;
	return key;
};

atb.viewer.MarkerEditorData.prototype._toRemoteIndex = function (remoteId) {
	var key = 'remote_'+remoteId;
	return key;
};

atb.viewer.MarkerEditorData.prototype._getLocalMarker = function (localId) {
	var key = this._toLocalIndex(localId);
	return this.localMarkers[key];//TODO: check bounds...?
};

atb.viewer.MarkerEditorData.prototype._getRemoteMarker = function (remoteId) {
	//begin hack:
	var num = parseInt(remoteId);
	if (this.hack_maxRemoteIdSeen < num)
	{
		this.hack_maxRemoteIdSeen = num;
	}
	//end hack
	
	var key = this._toRemoteIndex(remoteId);
	//debugPrint("key="+key);
	//return this.remoteMarkers[key];
	var ret = this.remoteMarkers[key];
	//var hack =[];
	//var missingValue = hack["missing"];
	//if (missingValue == ret)
	if (atb.util.ReferenceUtil.isBadReferenceValue(ret)) {
		return null;
	}
	return ret;
};

atb.viewer.MarkerEditorData.prototype._setLocalMarker = function (localId, set_marker) {
	var key = this._toLocalIndex(localId);
	this.localMarkers[key] = set_marker;
};

atb.viewer.MarkerEditorData.prototype._setRemoteMarker = function(remoteId, set_marker) {
	var key = this._toRemoteIndex(remoteId);
	this.remoteMarkers[key] = set_marker;
};

atb.viewer.MarkerEditorData.prototype.setRemoteNameForLocalMarker = function (localId, set_remoteId) {//assert point in question lacks a remote point id
	var marker = this._getLocalMarker(localId);
	if (set_remoteId == this.BAD_REMOTE_POINT_ID)//-1)
	{
		alert("bad remote_id set attempt!");
		return;//paranoia!!
	}
	marker.setRemoteId(set_remoteId);
	//TODO: assert pt.remotePointId == BAD_REMOTE_POINT_ID, and that its not inremovetpoints...?lol
	//markerObj.remoteId = set_remoteId;
	//this._setRemoteMarker(set_remoteId, markerObj);
};

atb.viewer.MarkerEditorData.prototype.createLocalMarker = function (featureInfo) {
    var marker = this.createMarker(this.BAD_REMOTE_POINT_ID, featureInfo);
    
    this.markMarkerModified(marker);
    
	return marker;
};

atb.viewer.MarkerEditorData.prototype.createMarker = function(remoteId, featureInfo) {
	var localId = this.localPointCounter++;
	return this._createMarker(remoteId, localId, featureInfo)
};

atb.viewer.MarkerEditorData.prototype._createMarker = function(remoteId, localId, featureInfo) {
	var self = this;
	
	var marker = new atb.viewer.MarkerData(
		localId,
		featureInfo,
		
		function(featureInfo)
		{
			self.onCreateFeatureFunc(featureInfo);
		},
		function(featureInfo)
		{
			self.onDestroyFeatureFunc(featureInfo);
		},
		function(set_marker, set_remoteId)
		{
			self._setRemoteMarker(set_remoteId, set_marker);
		}
	);
	
	this.allMarkers.push(marker);
	this._setLocalMarker(localId, marker);
	if (remoteId != this.BAD_REMOTE_POINT_ID) {
		marker.setRemoteId(remoteId);
	}
	
	return marker;
};

atb.viewer.MarkerEditorData.prototype.getAllMarkers = function () {
	return this.allMarkers;
};

atb.viewer.MarkerEditorData.prototype.saveState = function() {
	var ret = {};
	
	var markers = this.getAllMarkers();
	var markersCopy = [];
	for (var i=0; i<markers.length; i++) {
		var sourceMarker = markers[i];
		var sourceMarkerCopy = sourceMarker.copy();
		markersCopy.push(sourceMarkerCopy);
	}
	ret.markers = markersCopy;
	return ret;
};

atb.viewer.MarkerEditorData.prototype.loadState = function (dataCopy) {
	//TODO: not blow away remote point ids...?
	var markers = this.getAllMarkers();
	
	for (var i=0; i<markers.length; i++) {
		var marker = markers[i];
		
		//default to invisible, mainly for the case when no "undo" data is available (ie, stuff that wasn't created "yet"...!)
		marker.setEnabled(true);//HACK - ensure we hide...? --Q: do we really need to setvisible to true first...?
		marker.setEnabled(false);
	}
	
	markers = dataCopy.markers;//points;
	for (var i=0; i<markers.length; i++) {
		var sourcePoint = markers[i].copy();//clone();
		
		var localId = sourcePoint.getLocalId();
		var bEnabled=sourcePoint.isEnabled();
		
		var currentMarker = this._getLocalMarker(localId);
		
		//currentMarker.copyStateFrom(sourcePoint);
		currentMarker.restoreFromCopyHack(sourcePoint);//lolwhatofids...?
		
		currentMarker.setEnabled(false);
		
		//currentMarker.state.featureInfo = sourcePoint.getFeatureCopy();
		//currentMarker.state.
		//^or lolcopyback...!?
		if (bEnabled) {
			currentMarker.forceRecreation();//hack
		};
		
		//Q: what of remote points...?
	}
};

atb.viewer.MarkerEditorData.prototype.createRemoteMarker = function () {
	//create dummy feature:
	var style={};
	var feature = new OpenLayers.Feature.Vector(
		new OpenLayers.Geometry.Point(0,0),
		{},
		style
	);
	
	//create marker
	var marker = this.createLocalMarker(feature);
	
	//return marker
	return marker;
};

atb.viewer.MarkerEditorData.prototype.isModified = function () {
    var markers = this.getAllMarkers();
    
	for(var i=0; i<markers.length; i++) {
		var marker = markers[i];
        
		if (marker.wasModified()) {
            return true;
		}
	}
    
    return false;
};

atb.viewer.MarkerEditorData.prototype.performSaveIfModified = function (canvasId, webService, invokeAfter, opt_errorHandler) {
    if (this.isModified()) {
        this.performSave(canvasId, webService, invokeAfter, opt_errorHandler);
    }
    else {
        invokeAfter();
    }
};

atb.viewer.MarkerEditorData.prototype.performSave = function(
    canvasId,
    webService, 
    invokeAfter,
    opt_errorHandler)
{
    invokeAfter();
    // Disabled save as it as done immediately as needed now
    
//	invokeAfter = atb.util.ReferenceUtil.applyDefaultValue(invokeAfter, null);
//	//1. generate entries, queue up count of missingIDs
//	//2. request ID batch
//	//3. applyIds to entries.
//	//4. transmit batch of data...?
//	//TODO: do save flag first...?
//	var entryList = [];
//	var missingMarkerList = [];
//	//var numIdsNeeded = 0;
//	
//	var markers = this.getAllMarkers();
//	for (var i=0; i<markers.length; i++) {
//		var marker = markers[i];
//		if (marker.wasModified()) {
//			marker.clearModified();
//			
//			entryList.push(marker);
//            
//			if (!marker.hasRemoteId()) {
//				missingMarkerList.push(marker);
//			}
//		}
//	}
//	
//	var self = this;
//	
//	var finishedSave = function (results) {
//		if (invokeAfter !== null) {
//			invokeAfter(results);
//		}
//	};
//	
//	var finishSave = function () {
//		var json = [];
//		for (var i=0; i<entryList.length; i++) {
//			var marker=entryList[i];
//			//q: should we save markers that were deleted while only a local copy...???
//			
//			var updateRequest = {
//				"request": "update",
//				"body": marker.saveMarkerJSON()
//			};
//			json.push(updateRequest);
//			
//			if (marker.isDeleted()) {
//				var deleteRequest = {
//					"request": "delete",
//					"id": marker.getRemoteId()
//				};
//				json.push(deleteRequest);
//			}
//		}
//		webService.withBatchMarkerRequests(canvasId, json, finishedSave, this, opt_errorHandler);
//	};
//	
//	var funcApplyIDs;
//	funcApplyIDs = function (idsArray) {
//		//TODO: check for failure response...?
//		//var idsArray = results["ids"];
//		for (var i=0; i<missingMarkerList.length; i++) {
//			var marker = missingMarkerList[i];
//			if (marker.hasRemoteId()) {
//				if (i +1 >= missingMarkerList.length) {
//					missingMarkers.pop();//remove last
//				}
//				else {
//					//remove from middle
//					missingMarkerList[i] = missingMarkerList.pop();
//					
//					//retry i:
//					i--;
//				}
//			}
//		}
//		
//		var len = missingMarkerList.length;
//		for(var i=0; i<len; i++) {
//			if (!(idsArray.length>0)) {
//				//apply more ids:
//				webService.withUidList(missingMarkerList.length, funcApplyIDs);
//				return;
//			}
//			
//			var marker = missingMarkerList.pop();
//			if (!marker.hasRemoteId()) {
//				marker.setRemoteId(idsArray.pop());
//			}
//		}
//        
//		webService.markerSaveExtraIDs(idsArray);
//		
//		finishSave();
//	};
//	
//	this.bModified = false;
//	webService.withUidList(missingMarkerList.length, funcApplyIDs);
};

atb.viewer.MarkerEditorData.prototype.onModified = function () {
	this.bModified = true;
};

atb.viewer.MarkerEditorData.prototype.saveJSON = function () {
	var markers = this.getAllMarkers();
	var saveItems = [];
	for (var i=0; i<markers.length; i++) {
		var marker = markers[i];
		var json = marker.saveMarkerJSON();
		saveItems.push(json);
		//webService.sendMarkerData(json);
		//lolhack...ormodifiedcheck...?
	}
	var saveRequest = {
		markers: saveItems
	};
	return saveRequest;
};

atb.viewer.MarkerEditorData.prototype.loadMarkerResource = function (resource) {
    var marker = this._getRemoteMarker(resource.getRemoteId());
    
    if (! marker) {
        marker = this.createRemoteMarker();
    }
    
    marker.loadMarkerResource(resource);
    
    return marker;
};

atb.viewer.MarkerEditorData.prototype.loadMarkerResources = function (resources) {
    var markers = [];
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        var marker = this.loadMarkerResource(resource);
        
        markers.push(marker);
    }
    
    return markers;
};

atb.viewer.MarkerEditorData.prototype.getMarkerByRemoteId = function (remoteId) {
	return this._getRemoteMarker(remoteId);
};