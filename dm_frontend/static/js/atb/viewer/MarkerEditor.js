goog.provide('atb.viewer.MarkerEditor');
goog.require('atb.viewer.MarkerViewer');

goog.require('openlayers.OpenLayers');
goog.require('jquery.jQuery');

//data model:
goog.require('atb.viewer.MarkerEditorData');
goog.require('atb.viewer.UndoStack');
goog.require('atb.Util');
goog.require('atb.ui.Bezel');

goog.require('atb.util.ReferenceUtil');
goog.require('atb.debug.DebugUtil');

goog.require("atb.viewer.MarkerEditorAnnotationHack");


/**
 * atb.viewer.MarkerEditor
 * Creates an empty MarkerEditor, without any controls.
 *  (subclasses can and should change that by implementing the 
     createToolbar() method!)
 * 
 * @param viewerDomId - the div id to use as the maps div
 * @param viewerSize
 * @param opt_defaultOverlayId
**/
atb.viewer.MarkerEditor = function(set_clientApp, opt_domHelper)
{
	atb.viewer.MarkerViewer.call(this, set_clientApp, opt_domHelper);
	
	this.lastMenu = null;

	this.bRegisteredKeyEvents = false;
	this.bKeyboardFocusEnabled = false;
	
	this.annotationStoreHack = null;
	
	//set this to null, initially:
	this.deactivateToolFunc = null;
	
	this.reloadToolParams = null;
	
	//hack:
	this.logTextFunction = function(text){};//do nothing
	
	//Setup data model:
	var self = this;
	
	this.dataModel = new atb.viewer.MarkerEditorData(
		function(featureInfo)
		{
			self.onCreateFeature(featureInfo);
		},
		function(featureInfo)
		{
			self.onDestroyFeature(featureInfo);
		}
	);
	
	// Prep undo/redo subsystem:
	var saveFunc = function(markerEditor)
	{
		return markerEditor.dataModel.saveState();
	};
	
	var loadFunc = function(markerEditor, savedState)
	{
		return markerEditor.dataModel.loadState(savedState);
	};
	
	this.undoStack = new atb.viewer.UndoStack(this, saveFunc, loadFunc);
	
	this.saveUndoState();
	
	//this.onUndoStackChanged();//lol!
	var thisEditor = this;//self
	
	window.setTimeout(function()
	{
		thisEditor.onUndoStackChanged();
	},10);
	//this.onUndoStackChanged();//lol!
	
};
goog.inherits(atb.viewer.MarkerEditor, atb.viewer.MarkerViewer);

/**
 * returns the OpenLayers map object that we are manipulating.
**/
atb.viewer.MarkerEditor.prototype.getMapObject = function()
{
	return this.olViewer;
};

/**
 * sets a callback for when the current tool changes or is deactivated.
 * these are mainly used to clean up the changes a tool makes when being setup.
**/
atb.viewer.MarkerEditor.prototype.setDeactivateToolHandler = function(newDeactivateToolFunc)
{
	this.deactivateToolFunc = newDeactivateToolFunc;
};

/**
 * invokes some simple logic to deactivate a tool
**/
atb.viewer.MarkerEditor.prototype.deactivateCurrentTool = function()
{
	if (this.deactivateToolFunc != null)
	{
		this.deactivateToolFunc();
		this.deactivateToolFunc = null;
	}
	this.reloadToolParams = null;

	
	//var panel = this.getCurrentPanelContainer();
	//if (panel !== null)
	{
       // var elem = panel.getDomElement();
		//if (elem !== null)
		{
			//this is also broken!
			//goog.dom.getElementByClass('atb-markereditor-map-pane').style.cursor = 'auto';
			
			//This is probably a bad place for this though:
			if (this.mapDiv !== null)
			{
				//is this really what we wanted...?
				goog.dom.getElement(this.mapDiv).style.cursor = 'auto';
			}
		}
	}
};

/**
 * creates a "Local" marker, without any "remoteId". 
**/
atb.viewer.MarkerEditor.prototype.createLocalMarker = function (featureInfo) {
	return this.dataModel.createLocalMarker(featureInfo);
};


/////////////////////UNDO-REDO LOGIC://////////////////////////////////
/**
 * saves an undo "SaveGame"/"SavePoint"/snapshot, for use when we get notified about a modification after-the-fact,
 *  thus, in combination with pushUndoStateChanged, we can use this to push the proper undo state, 
 *  even if it was modified before we were notified. (That assumes we use those correctly and have a 
 *   reasonable save with saveUndoState beforehand, so mixing these two undo types can be tricky.
**/
atb.viewer.MarkerEditor.prototype.saveUndoState = function()
{
	this.lastUndoState = this.dataModel.saveState();
};

/**
 * called to store the old undo state "after the fact" in the undo buffer. this is needed to handle the case where
 *  we are notified of a modification after it has occured, at which point, we can't hope to save the prior state, so we
 *  need to use an already existing known "prior" state to save.
 *
 * Note that calling this clears the redo buffer, (as a change would normally do in a doc)
**/
atb.viewer.MarkerEditor.prototype.pushUndoStateChanged=function(caption)
{
	//hack for post-modify notification cases
	//debugPrint("recording[pushundohack]: "+caption);
	this.logMessage("recording[pushundohack]: "+caption);
	this.undoStack.recordUndoActionWithState(caption, this.lastUndoState);
	this.saveUndoState();
	this.onUndoStackChanged();
};

/**
 * the normal undo "storage" method. invoked before performing the mutations, and undo/redo should work just fine.
 *
 * Note that calling this clears the redo buffer, (as a change would normally do in a doc)
**/
atb.viewer.MarkerEditor.prototype.recordStateChange=function(caption)
{
	//debugPrint("recording: "+caption);
	this.logMessage("recording: "+caption);
	this.undoStack.recordUndoAction(caption);
	
	this.saveUndoState();//This is actually not correct - we really want to do this push AFTER the relevant changes...
	this.onUndoStackChanged();
};

/**
 * Invokes a simple undo command.
**/
atb.viewer.MarkerEditor.prototype.undo=function()
{
	if (!this.undoStack.canUndo())
	{	
		this.logMessage("can't undo!");
		return false;
	}
	
	this.logMessage("undoing: "+ this.undoStack.getUndoCaption());
	var ret = this.undoStack.undo();
	this.onUndoStackChanged();
	return ret;
	
};

/**
 * Invokes a simple redo command.
**/
atb.viewer.MarkerEditor.prototype.redo=function()
{
	if (!this.undoStack.canRedo())
	{	
		this.logMessage("can't redo!");
		return false;
	}
	this.logMessage("redoing: "+ this.undoStack.getRedoCaption());
	
	//return this.undoStack.redo();
	var ret = this.undoStack.redo();
	this.onUndoStackChanged();
	return ret;
};

atb.viewer.MarkerEditor.prototype.canUndo = function()
{
	return this.undoStack.canUndo();
};
atb.viewer.MarkerEditor.prototype.canRedo = function()
{
	return this.undoStack.canRedo();
};

/**
 * callback to handle creating of features. (this can happen on undo/redo when restoring a saved state)
 * or otherwise when some markerdata has setEnabled change its enabled state from FALSE to TRUE. - lol edge-triggered...
**/
atb.viewer.MarkerEditor.prototype.onCreateFeature = function(featureInfo)
{
	var editLayer = this.getEditableOverlay();
	editLayer.addFeatures([featureInfo]);
};

/**
 * callback to handle creating of features. (this can happen on undo/redo when restoring a saved state)
 * or otherwise when some markerdata has setEnabled change its enabled state from true to false.
**/
atb.viewer.MarkerEditor.prototype.onDestroyFeature = function(featureInfo)
{
	var editLayer = this.getEditableOverlay();
	editLayer.removeFeatures([featureInfo]);
};

///////////////
/**
 * this implements most of the "activate tool" logic, for most tools.
**/
atb.viewer.MarkerEditor.prototype.activateTemporaryControl = function(ctl, startFunc, finishFunc)
{
	//this.reloadToolParams = {ctl: ctl, finishFunc: finishFunc};//hack
	
	//clear the "tool" handler, and nuke any existing controls/etc:
	
	var undef;
	if ((startFunc  == undef)||(startFunc == null))
	{
		startFunc = function()
		{
		};
	}
	/*if ((finishFunc  == undef)||(finishFunc == null))
	{
		finishFunc = function()
		{
		};
	}
	*/
	this.deactivateCurrentTool();
	this.reloadToolParams = 
	{
		ctl: ctl, 
		startFunc: startFunc,
		finishFunc: finishFunc
	};//hack
	
	startFunc();
	
	//get our openlayers map object:
	var mapObject = this.getMapObject();
	
	//add the control to the map:
	mapObject.addControl(ctl);
	
	//activate the control:
	ctl.activate();
	
	//set a handler for when another tool is activate, so that we can be sure to clean up this tool:
	this.setDeactivateToolHandler(this.createDestroyControlFunc(mapObject, ctl, finishFunc));
};

atb.viewer.MarkerEditor.prototype.clearSelection = function()
{
	var editLayer = this.getEditableOverlay();
	editLayer.selectedFeatures = [];//hack
	this.postRedisplay();
};

atb.viewer.MarkerEditor.prototype.resetCurrentTool = function()
{
	if (this.reloadToolParams != null)
	{
		var toolParams = this.reloadToolParams;// = {ctl: ctl, finishFunc: finishFunc};//hack
		this.activateTemporaryControl(toolParams.ctl, toolParams.startFunc, toolParams.finishFunc);//activateTemporaryControl.finishFunc);
	}
	//var editLayer = this.getEditableOverlay();
	//editOverlay.
};

/**
 * returns a callback function which destroys a tool. This implementation has worked for most tool-controls so far.
**/
atb.viewer.MarkerEditor.prototype.createDestroyControlFunc=function(mapObject, ctl, finishFunc)
{
	var undef;
	if ((finishFunc == undef)||(finishFunc==null))
	{
		finishFunc = function(){};//hack
	}
	
	//Note: the returned function's captures the formal parameters to this function in its "scope".
	return function()
	{
		//finishFunc();
		
		if (ctl != null)
		{
			ctl.deactivate();
			mapObject.removeControl(ctl);
			
			ctl = null;
		}
		finishFunc();
	};
};


atb.viewer.MarkerEditor.prototype.loadSingleMarkerById = function(markerID) {
    var withResponse = function (resource) {
        this.onLoadResource(resource);
    };
    
    this.ws.withResource(markerId, withResponse, this);
};

atb.viewer.MarkerEditor.prototype.loadMarkersFromMapDocument = function(mapId)
{//TODO: override/wrap addmarker in markerviewer more properly...?
	var uri = this.ws.rootURI + "mapData/" + mapId;
	var handler = atb.Util.scopeAsyncHandler(this.onLoadJSONCallback, this);
    jQuery.getJSON(uri, handler);
};

atb.viewer.MarkerEditor.prototype.onLoadResource = function (resource) {
    this.dataModel.loadMarkerResource(resource);
    
    var event = new goog.events.Event('marker shown', resource.getId());
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.MarkerEditor.prototype.onLoadResources = function (resources) {
    this.dataModel.loadMarkerResources(resources);
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resoures[i];
        
        var event = new goog.events.Event('marker shown', resource.getId());
        
        var eventDispatcher = this.clientApp.getEventDispatcher();
        eventDispatcher.dispatchEvent(event);
    }
};

/**
 * forces a re-rendering of the editable layer after a few moments.
**/
atb.viewer.MarkerEditor.prototype.postRedisplay = function()
{
	var self = this;
	
	window.setTimeout(function()
	{
		self.redisplayNow();
		//self.getEditableOverlay().redraw();
	}, 10);
};
atb.viewer.MarkerEditor.prototype.redisplayNow = function()
{
	//self.getEditableOverlay().redraw();
	//if (!this.is
	if (!this.isOnPage())
	{
		debugPrint("MarkerEditor::redisplayNow(): not visible on page. aborting!");
		return;
	}
	var editLayer = this.getEditableOverlay();
	editLayer.redraw();
	//this.getEditableOverlay().redraw();
}

atb.viewer.MarkerEditor.prototype.isOnPage=function()
{
	var myTag =this.getElement();
	if (myTag === null)
	{
		return false;
	}
	if (myTag.parentNode === null)
	{
		return false;
	}
	return true;//lolhack!
}

/** 
 * a "Debug" message function.
**/
atb.viewer.MarkerEditor.prototype.logMessage = function(text)
{
	this.logTextFunction(text);
};


//////////////////////////moved from SimpleMarkerEditor:


/**
 * helper method to calculate the center of a feaute in its window.
 * this is currently used to position radial menus around the center of a feature.
**/
atb.viewer.MarkerEditor.prototype.calculateFeatureCenterInWindowCoords=function(feature)
{
	var geom = feature.geometry;
	geom.calculateBounds();
	return this.calculateLatLonWindowCoords( geom.getBounds().getCenterLonLat() );
	
	//var bounds = geom.getBounds();
	//var c = bounds.getCenterLonLat();
	//return this.calculateLatLonWindowCoords(c);
};


atb.viewer.MarkerEditor.prototype.calculateMapOffsetInWindow = function()
{
	var mapOffset = jQuery(this.mapDiv).offset();
	var ret = {
		x: mapOffset.left,
		y: mapOffset.top
	};
	return ret;
};
/**
 * helper method to calculate the window coordinates of a given lat,lon coord in the map.
 * currently used in conjunction with calculateFeatureCenterInWindowCoords.
**/
atb.viewer.MarkerEditor.prototype.calculateLatLonWindowCoords=function(atLatLon)
{
	var mapObject = this.getMapObject();
	var centerXY = mapObject.getViewPortPxFromLonLat(atLatLon);
	//var mapOffset = jQuery(this.mapDiv).offset();
	var off = this.calculateMapOffsetInWindow();
	
	return {
		x: (centerXY.x + off.x),
		y: (centerXY.y + off.y)
		
		//x: (centerXY.x + mapOffset.left),
		//y: (centerXY.y + mapOffset.top)
		
		
		//y: (centerXY.y + mapOffset.top),
		//^lol about right
	};
};


atb.viewer.MarkerEditor.prototype.showMenuAtFeature = function(menu, feature, contextValue)
{
	var menuPos = this.calculateFeatureCenterInWindowCoords( feature );
	return this.showMenuAt(menu,menuPos.x,menuPos.y,contextValue);
};

atb.viewer.MarkerEditor.prototype.showMenuAt = function(menu, atX, atY, contextValue)
{
	var menuPos = {
		x: atX,
		y: atY
	};
	
	//Complain loudly if its missing:
	if (atb.util.ReferenceUtil.isBadReferenceValue(menu))
	{
		atb.debug.DebugUtil.debugAssertion(false, "showMenuAtFeature called with a null menu.");
		return;
	}

	var self = this;
	
	var activeAnno = this.clientApp.getActiveAnnotation();
	
	if (activeAnno /*&& activeAnno != this.annotationUid*/) {
            var bezel = new atb.ui.Bezel('atb-bezel-linked', this.clientApp.getStyleRoot());
            bezel.show();
            
		this.dataModel.performSave(this.resourceId, this.ws, function(saveResponse) {
				self.ws.withSavedAnno(
					activeAnno,
					{
						'id': activeAnno,
						'type': 'anno',
						'anno': {
							'targets': [contextValue.userInfo.getRemoteId()]
						}
					},
					function (response) {
						
					},
					this
				);
		});
		
		this.clearSelection();
		this.clientApp.clearActiveAnnotation();
        if (this.displayer) {
            console.log("dismissing displayer");
            this.displayer.dismiss();
            this.displayer = null;
        }
	}
	else {
		menu.setActivePane(this);//hack//lolok..?!
		
		//var menuPos = this.calculateFeatureCenterInWindowCoords( feature );
		/*
		this.lastMenu = menu;//HACK
		*/
		this.lastMenu = menu;//HACK//FAIL!//lolpostredisplaywas the problem!
		
		menu.invokeMenu( contextValue, menuPos.x, menuPos.y );//lolbugishere
		
		return menu;
	}
};

atb.viewer.MarkerEditor.prototype.dismissMenu=function(menu)
{
	menu.hide();
};

atb.viewer.MarkerEditor.prototype.onUndoStackChanged = function()
{
	debugPrint("undo state changed!");
};

atb.viewer.MarkerEditor.prototype.handleKeyUp = function(keyEvent)
{
	//TODO: implement me!
	return true;
};

atb.viewer.MarkerEditor.prototype._onKeyUpInternal=function(keyEvent)
{
	if (!this.bKeyboardFocusEnabled)
	{
		return true;
	}
	else
	{
		return !(this.handleKeyUp(keyEvent)===false);
	}
};
atb.viewer.MarkerEditor.prototype.setHasKeyboardFocus =function(bHasFocus)
{
	bHasFocus = (bHasFocus === true);
	this.bKeyboardFocusEnabled = bHasFocus;
	
	if (bHasFocus)
	{
		this.registerKeyHandlers();
	}
};

atb.viewer.MarkerEditor.prototype.registerKeyHandlers =function()
{
	if (!this.bRegisteredKeyEvents)
	{
		this.bRegisteredKeyEvents = true;
		
		var self = this;
		jQuery(document).keyup(
			function(keyEvent)
			{
				//return self._onKeyUp(keyEvent);
				return self._onKeyUpInternal(keyEvent);
				//self.handleKey
			}
		);
	}
	//handleKeyUp);//LOL!
};

atb.viewer.MarkerEditor.prototype.dismissContextMenu = function(menu)
{
	this.clearSelection();
	menu.hide();
};

atb.viewer.MarkerEditor.prototype.loadMarkerResource = function (resource) {
    this.onLoadResource(resource);
};

atb.viewer.MarkerEditor.prototype.loadMarkerResources = function (resources) {
    this.onLoadResources(resource);
};

atb.viewer.MarkerEditor.prototype.unloadMarkerResource = function (resource) {
    this.recordStateChange('before unload');
    
    var marker = this.dataModel.getMarkerByRemoteId(resource.getRemoteId());
    
    if (marker) {
        marker.setEnabled(false);
        return true;
    }
    else {
        return false;
    }
};

atb.viewer.MarkerEditor.prototype.unloadMarkerResources = function (resources) {
    this.recordStateChange('before multi-unload');
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        var marker = this.dataModel.getMarkerByRemoteId(resource.getRemoteId());
        
        if (marker) {
            marker.setEnabled(false);
        }
    }
};

atb.viewer.MarkerEditor.prototype.unloadMarkerObject = function(remoteMarkerObjectID)
{
	//is this an undo point...???what of undo and recent modifications to that marker???
	
	//this.recordStateChange.recordStateChange("before unload");
	//^LOL
	this.recordStateChange("before unload");
	var marker = this.dataModel.getMarkerByRemoteId(remoteMarkerObjectID);
	if (marker === null)
	{
		debugPrint("marker not found with remoteid: '"+remoteMarkerObjectID+"'");//paranoia!
		return false;
	}
	else
	{
		marker.setEnabled(false);
		return true;
	}
};

//atb.viewer.MarkerEditor.prototype.clearAllObjects//TODO

atb.viewer.MarkerEditor.prototype.onRefresh = function()
{
	//lol hack for updated locations, etc...!?:
	var map = this.getMapObject();
	//map.pan(0,0);//hack
	
	//Hack to fix mouse position relative to moved view:
	var centerHack = map.getCenter();
	//debugPrint(""+centerHack);
	//debugViewObject(centerHack);
	if (centerHack !== null)
	{
		
		var pan_opts = {
			animate:false
		};
		map.pan(1,1,pan_opts);//hack
		map.pan(-1,-1,pan_opts);//hack
		//map.pan(0,1);//hack
		//map.pan(0,-1);//hack
	}
	else
	{
		//debugPrint("null center. can't panhack!");
	}
};

atb.viewer.MarkerEditor.prototype.onPaneUnloaded = function()
{
	//this.resetCurrentTool();//HACK
	
	if (this.lastMenu !== null)
	{
		this.dismissContextMenu(this.lastMenu);
		//this.postRedisplay();//hack
		this.lastMenu = null;//hack
	}
};

atb.viewer.MarkerEditor.prototype.getAnnotationStoreHack_ = function(bAutoCreateIt)
{
	var ret = this.annotationStoreHack;
	if (ret===null)
	{
		if (bAutoCreateIt)
		{
			ret = new atb.viewer.MarkerEditorAnnotationHack();
			this.annotationStoreHack = ret;
		}
	}
	return ret;
}
	
atb.viewer.MarkerEditor.prototype.setAnnotationBody = function(bodyResourceId)
{
	var store = this.getAnnotationStoreHack_(true);
	store.createBody(bodyResourceId);
};

atb.viewer.MarkerEditor.prototype.addAnnotationTarget = function(targetResourceId, opt_bodyResourceId)
{
	var store = this.getAnnotationStoreHack_(true);
	//what if opt_bodyResourceId is omitted??//maybe use the last body...?
	store.putTarget(opt_bodyResourceId, targetResourceId);
};

atb.viewer.MarkerEditor.prototype.isTitleEditable = function()
{
	return true;//editor!
};


atb.viewer.MarkerEditor.prototype.centerOnMarker = function(remoteId) {
    var marker = this.dataModel.getMarkerByRemoteId(remoteId);
    if (marker) {
	    marker = marker.getFeature();
        var geom = marker.geometry;
        geom.calculateBounds();
        var bounds = geom.getBounds();
        var c = bounds.getCenterLonLat();
        this.olViewer.setCenter(new OpenLayers.LonLat(c.lon, c.lat), atb.viewer.MarkerViewer.prototype.DEFAULT_MARKER_ZOOM);
    } else {
        throw "Unknown marker: " + id;
    }
};
