goog.provide("atb.viewer.StandardSimpleMarkerEditor");

//require superclass:
goog.require("atb.viewer.SimpleMarkerEditor");

//used for style-editing:
goog.require('atb.viewer.ColorOpacityField');

//misc:
goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugUtil");

goog.require("atb.widgets.DialogWidget");
goog.require('atb.viewer.Finder');
goog.require('goog.dom');
goog.require('jquery.jQuery');
goog.require('goog.events');
goog.require("atb.widgets.GlassPane");
goog.require("atb.widgets.ForegroundMenuDisplayer");
goog.require('atb.ui.InfoPane');

goog.require('atb.events.ResourceClicked');

goog.require('atb.marker.Handler.Rectangle');
goog.require('goog.structs.Set');

atb.viewer.StandardSimpleMarkerEditor = function(
	set_clientApp,
    opt_argument_radialMenuConfigs,
    opt_annoBodyId,
	opt_domHelper
){
	atb.viewer.SimpleMarkerEditor.call(this,
		set_clientApp,
		opt_argument_radialMenuConfigs,
		opt_annoBodyId,
		opt_domHelper
	);
    
    this.viewerType = 'canvas editor';
	
	this.styleEditorDivRoot = null;
	this.styleEditorDialog = new atb.widgets.DialogWidget(
	{
	
	});
	this.styleEditorDialog.setCaption("Style Editor");
	
	this.initDefaultShapeStyles();
	
	this.registerKeyUpHandlerFromDef(atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.undoCommand);
	this.registerKeyUpHandlerFromDef(atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.redoCommand);
    
    this.hiddenMarkers = new goog.structs.Set();
    
    this.setupEventListeners();
    
    this.mouseIsOverDocumentIcon = false;
    this.mouseIsOverFloatingMenu = false;
    this.mouseIsOverMarker = false;
    this.mouseIsOverMarkerFloatingMenu = false;
};
goog.inherits(atb.viewer.StandardSimpleMarkerEditor, atb.viewer.SimpleMarkerEditor);

atb.viewer.StandardSimpleMarkerEditor.VIEWER_TYPE = 'canvas editor';

atb.viewer.StandardSimpleMarkerEditor.prototype.setupEventListeners = function () {
    var eventDispatcher = this.clientApp.getEventDispatcher();
    
    goog.events.listen(eventDispatcher, 'resource deleted', function (e) {
                       if (e && e.target)
                        var id = e.target;
                       
                       try {
                       this.unloadMarkerObject(id);
                       } catch (error) {}
                       }, false, this);
    
    goog.events.listen(eventDispatcher, atb.events.LinkingModeExited.EVENT_TYPE, this.handleLinkingModeExited, false, this);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.render = function () {
    if (this.rootDiv != null)
        return;
    
    atb.viewer.SimpleMarkerEditor.prototype.render.call(this);
    
    this.createStyleTags();//lolhack
    
    this.switchToDefaultTool();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.switchToDefaultTool = function () {
	//set the tool command:
	this.onSelect();
	
	//hack the visual:
	this.menus[atb.viewer.SimpleMarkerEditor.MenuNames.mnuToolbar].selectButtonByName("select");//HACK
};

atb.viewer.StandardSimpleMarkerEditor.prototype.initDefaultShapeStyles = function () {	
	//TODO: refactor the way this is setup...?
	var defaultPointStyle, defaultPolygonStyle, defaulyPolylineStyle;
	defaultPointStyle = {
		stroke: true,
        strokeColor: "#444470",
		strokeOpacity: 0.6,
		strokeWidth: 2,
		
		fill: true,
		fillColor: "#312ee7",
		fillOpacity: 0.4,
		
		pointRadius: 7
	};
	
	
	defaultPolygonStyle = this.copyStyle(defaultPointStyle);
	defaultPolygonStyle.fillOpacity = 0.3;
	
	defaultPolylineStyle = this.copyStyle(defaultPointStyle);
	defaultPolylineStyle.strokeColor = "#312ee7";
	defaultPolylineStyle.strokeWidth = 6;
	defaultPolylineStyle.strokeOpacity = 0.5;
	
	var defaultFallbackStyle = this.copyStyle(defaultPointStyle);//lolhack!
	
	//choose something obvious lol:
	defaultFallbackStyle.fillColor = "#ff0000";
	defaultFallbackStyle.lineColor = "#00ffff";
	
	this.putDefaultStyle(
		"",
		defaultFallbackStyle
	);
	
	this.putDefaultStyle(
		atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePoint,
		defaultPointStyle
	);
	this.putDefaultStyle(
		atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePolyline,
		defaultPolylineStyle
	);
	this.putDefaultStyle(
		atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePolygon,
		defaultPolygonStyle
	);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.copyStyle = function (inputStyle) {
	var ret  ={};
	for (var k in inputStyle)
	{
		if (inputStyle.hasOwnProperty(k))
		{
			var v = inputStyle[k];
			ret[k] = v;
		}
	}
	return ret;
};

/**
 * invokes the begin draw new point tool logic.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.onBeginDrawNewPoint = function()
{
	var editLayer = this.getEditableOverlay();
	
	//create the draw point tool:
	var ctl = new OpenLayers.Control.DrawFeature(editLayer, OpenLayers.Handler.Point);
	var shapeType = atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePoint;
	ctl.events.register(
		"featureadded", 
		this, 
		function(event)
		{
			return this.onFeatureAddedHandler(event, shapeType);
		}
	);
	
	this.activateTemporaryControl(ctl);

        this.setCrosshairCursor();
};

/**
 * invokes the polyline tool.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.onActivatePolyLineTool = function()
{
	var editLayer = this.getEditableOverlay();
	
	//create the draw poly-line tool:
	var ctl = new OpenLayers.Control.DrawFeature(editLayer, OpenLayers.Handler.Path);
	var shapeType = atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePolyline;
	ctl.events.register(
		"featureadded", 
		this, 
		function(event)
		{
			return this.onFeatureAddedHandler(event, shapeType);
		}
	);
	
	this.activateTemporaryControl(ctl);

        this.setCrosshairCursor();
};

/**
 * invokes the polygon tool.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.onActivatePolygonTool = function()
{
	var editLayer = this.getEditableOverlay(); 
	//console.log(editLayer)
	
	var ctl = new OpenLayers.Control.DrawFeature(editLayer, OpenLayers.Handler.Polygon);
	var shapeType = atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePolygon;
	ctl.events.register(
		"featureadded", 
		this, 
		function(event)
		{
			return this.onFeatureAddedHandler(event, shapeType);
		}
	);
	
	this.activateTemporaryControl(ctl);

        this.setCrosshairCursor();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.onActivateRectangleTool = function () {
    var editLayer = this.getEditableOverlay();
    
    var ctl = new OpenLayers.Control.DrawFeature(editLayer, atb.marker.Handler.Rectangle);
    var shapeType = atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes.shapePolygon;
    
    ctl.events.register('featureadded',
                        this,
                        function (event) {
                            return this.onFeatureAddedHandler(event, shapeType);
                        });
    
    this.activateTemporaryControl(ctl);
    
    this.setCrosshairCursor();
};

/**
 * invokes the edit tool.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.onActivateEditTool = function()
{
	var editLayer = this.getEditableOverlay();
	
	var bToolChangedAlready = false;
	
	var modifyOptions = {};//dummy value
	var ctl=new OpenLayers.Control.ModifyFeature(editLayer, modifyOptions);
		//finish reconfiguring our new tool:
		ctl.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
			
		var self = this;
		var onModifyListener = function (event) {
			self.pushUndoStateChanged("modify feature");
		};
		
	//register our event listeners:
		//this way is suggested by the docs, but does not APPEAR to actually be working, sadly. =/
		ctl.events.register("featuremodified", this, onModifyListener);
	
		//doing this since the above seems to accomplish nothing, while this DOES appear to work:
		ctl.onModification = onModifyListener;
	
		var bCancelTool = false;
		var bAbortedToolOnce = false;
		
		var onSelectShapeListener = function (feature) {
			var selectedFeature = feature;
			bCancelTool = false;//since something was selected, abort the deferred cancel operation. Just this boolean flag should suffice since even if these 
			//		events become interleaved, we should still only do stuff correctly
			
			self.updateStyleEditor(selectedFeature);//hack
			//TODO: maybe show the style popup here...?
		};
		
		var onDeselectShapeListener = function (event) {
			//when we deselect a shape...?
			
			var feature =event.feature;
			if (self.finishStylesFunc != null)
			{
				self.finishStylesFunc(true);
				self.finishStylesFunc=null;
			}
			self.updateStyleEditor(null);
			self.postRedisplay();
			
			
			//set the cancel flag to true.
			bCancelTool = true;
			
			//queue up something to try and abort
			window.setTimeout(function() {
				if (bCancelTool)//if nothing was selected since (ie, selection leading to deselect then select has not occured)
				{
					if (!bAbortedToolOnce)//more paranoia to ensure that this can really only occur once
					{
						bAbortedToolOnce = true;
						if (!bToolChangedAlready)//only perform if we're *STILL* the active tool (ie, we didn't get deselected by a tool switch!)
						{
							//make us revert to the default tool:
							self.switchToDefaultTool();
						}
					}
				}
				else
				{
					//otherwise, the user selected something else
				}
			},1);//hack
			
			//throw new Error("HACK");//this is a horribly cludge to break the control flow here... =/
			
		};
		
		ctl.onModificationStart = onSelectShapeListener;
		ctl.events.register("beforefeaturemodified", this, onSelectShapeListener);
		
		ctl.onModificationEnd = onDeselectShapeListener;
		ctl.events.register("afterfeaturemodified", this, onDeselectShapeListener);
		
	//must do this at the start so we can push it later if we actually modify stuff:
	//this.saveUndoState();//lolpushed...?
	//^Q:  do we need to push it after we reload a tool...???
	
	//activate the new control:
	this.activateTemporaryControl(ctl,
	                              function()
	                              {
		                              self.saveUndoState();
	                              },
	                              function()
	                              {
		                              bToolChangedAlready = true; //prevent switching to another tool from switching back to the hand tool
		                              self.updateStyleEditor(null);//hack--lol
	                              });
    
    //var elem = this.getCurrentPanelContainer().getDomElement();//lol
    var domHelper = this.getCurrentPanelContainer().getDomHelper();
    
    domHelper.getElementByClass('atb-markereditor-map-pane').style.cursor = 'pointer';
};


////////////// helpers:
/**
 * callback to handle the featureadded event for tools which add features using openlayers.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.onFeatureAddedHandler = function(event, shapeType) {
	this.recordStateChange("feature added");
	
	var feature = event.feature;
	var style = this.getDefaultStyle(shapeType);
	//Q: or do we need to copy styles somewhere around here or in there(in getdefaultstyle...?)
	feature.style = style;//hack
	
	var marker = this.createLocalMarker(feature);//TODO: move this line into markerdata or something...
    marker.setCanvasId(this.resourceId);
    
    var webService = this.clientApp.getWebService();
    
    var withUid = function (uid) {
        marker.setRemoteId(uid);
        
        var markerResource = marker.saveMarkerResource();
        
        webService.withSavedResource(markerResource, function (response) {}, this, this.flashErrorIcon);
    };
    webService.withUid(withUid, this, this.flashErrorIcon);
	
	feature.userInfo = marker;
    
	this.postRedisplay();
    
	this.switchToDefaultTool();
    
    this.registerThumbnailToPanel();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.afterFeatureModifiedHandler = function (event) {
    var feature = event.feature;
    var marker = feature.userInfo;
    var markerResource = marker.saveMarkerResource();
    
    var webService = this.clientApp.getWebService();
    webService.withSavedResource(markerResource, function (response) {}, this, this.flashErrorIcon);
    
    this.registerThumbnailToPanel();
};


atb.viewer.StandardSimpleMarkerEditor.prototype.doDeleteMarkerCommandHelper = function(feature)
{
	var selectedFeature = feature;
    var marker = feature.userInfo;
	
	this.recordStateChange("delete feature"); 
	var editLayer = this.getEditableOverlay();
	
	var userInfo = selectedFeature.userInfo;
	userInfo.setDeleted(true);//hack--new
	userInfo.setEnabled(false);
	
	//both are problably overkill, but...
	selectedFeature.destroyMarker();
	editLayer.removeFeatures([selectedFeature]);
    
    if (marker.hasRemoteId()) {
        var webService = this.clientApp.getWebService();
        webService.withDeletedResource(marker.getRemoteId(), function (response) {}, this, this.flashErrorIcon);
    }
    
    var event = new goog.events.Event('resource deleted', userInfo.getRemoteId());
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.onActivateViewAnnotations = function (actionEvent) {
	var otherContainer = this.getOtherPanelHelper();
        var thisContainer = this.getCurrentPanelContainer();
	if (otherContainer === null)
	{
		//this.display
		this.displayErrorMessage("StandardSimpleMarkerEditor::onActivateViewAnnotations(): no other container found!");
	}
	else
	{
		var viewer = new atb.viewer.Finder(this.clientApp, this.resourceId);
                
                if (actionEvent.altKey) {
                    thisContainer.setViewer(viewer);
                    thisContainer.setTitle('Resources linked to ' + this.getTitle());
                    thisContainer.setTitleEditable(false);
                }
                else {
                    otherContainer.setViewer(viewer);
                    otherContainer.setTitle('Resources linked to ' + this.getTitle());
                    otherContainer.setTitleEditable(false);
                }
	}
};


atb.viewer.StandardSimpleMarkerEditor.prototype.onActivateStyleEditorTool = function()
{
//todo: maybe handle recentering as needed...????
	/**
	var self= this;
	//jQuery('.atb-radialmenu-container').radmenu('show');
	
	var editLayer = this.getEditableOverlay();
	
	//create our "onselect" tool:
	var selectOptions = {};
	var ctl = new OpenLayers.Control.SelectFeature(editLayer, selectOptions);
	//var menu = this.menus[atb.viewer.SimpleMarkerEditor.MenuNames.mnuTestContextMenu];
	//"testMenu"];
	
	ctl.events.register("featurehighlighted", this, function(event)
	{
		//debugPrint("featurehighlighted!");
		
		var feature = event.feature;
		var context = feature;
		
		self.updateStyleEditor(feature);
		self.styleEditorDialog.show();
		////!!
		//this.showMenuAtFeature(menu, feature, context);
		//^LOL!
	});
	ctl.events.register("featureunhighlighted", this, function(event)
	{
		!!!
		//debugPrint("dismissed!");
		//this.dismissMenu(menu);
	});
	ctl.clickout = true;
	
	this.activateTemporaryControl(ctl,
	function()
	{
		//document.body.appendChild(rootObject);
	},
	function()
	{
		//self.styleEditorDialog.show();
		//TODO: finish saving styles...?
		//self.styleEditorDialog.hide();
		self.clearSelection();//lolhack!
		
		self.styleEditorDialog.hide();
		//menu.hide();
	});
	**/
	
	//from editortool:
	
	var editLayer = this.getEditableOverlay();
	//var modifyOptions = {};//dummy value
	var selectOptions = {};//dummy value
	/*var ctl=new OpenLayers.Control.ModifyFeature(editLayer, modifyOptions);
		ctl.mode = 
			/|*
			OpenLayers.Control.ModifyFeature.ROTATE | 
			OpenLayers.Control.ModifyFeature.DRAG | 
			OpenLayers.Control.ModifyFeature.RESIZE |
			*|/
			OpenLayers.Control.ModifyFeature.RESHAPE;
		*/	
	var ctl = new OpenLayers.Control.SelectFeature(editLayer, selectOptions);
		var self = this;//needed since "this" might be the control, rather than the simplemarkereditor...
		var onModifyListener = function(event)
		{
			//lol..todo:?=callmesomehow..?lol..?
			//self.recordStateChange("modify feature");
			self.pushUndoStateChanged("modify feature");
		};
		
	//register our event listeners:
		//this way is suggested by the docs, but does not APPEAR to actually be working, sadly.
		//ctl.events.register("featuremodified", this, onModifyListener);
	
		//doing this since the above seems to accomplish nothing, while this DOES appear to work:
		//ctl.onModification = onModifyListener;
	
	//register pre/post event listeners:
		var onSelectShapeListener = function(event)//ctl)
		{
			//var layer = ctl.layer;
			//var selectedFeatures = layer.selectedFeatures;
			//var selectedFeature = selectedFeatures[0];//hack
			//var selectedFeature = featur
			var feature = event.feature;
			
			self.updateStyleEditor(feature);//selectedFeature);//hack
			
			self.styleEditorDialog.show();
			//TODO: maybe show the style popup here...?
		};
		
		var onDeselectShapeListener = function(event)
		{
			var feature =event.feature;
			if (self.finishStylesFunc != null)
			{
				self.finishStylesFunc(true);
				self.finishStylesFunc=null;
			}
			self.updateStyleEditor(null);
			
			self.postRedisplay();
			
			self.styleEditorDialog.hide();
			//pushstatemaybelol..?
			
		};
		//ctl.onModificationStart = onSelectShapeListener;//hack
		//ctl.events.register("beforefeaturemodified", this, onSelectShapeListener);
		ctl.events.register("featurehighlighted", this, onSelectShapeListener);
		//featureunhighlighted
		//featurehighlighted
		
		ctl.onModificationEnd = onDeselectShapeListener;//hack
		//ctl.events.register("afterfeaturemodified", this, onDeselectShapeListener);
		ctl.events.register("featureunhighlighted", this, onDeselectShapeListener);
		
	//must do this at the start so we can push it later if we actually modify stuff:
	//this.saveUndoState();//lolpushed...?
	//^Q:  do we need to push it after we reload a tool...???
	
	//activate the new control:
	this.activateTemporaryControl(ctl,
	function()
	{
		self.saveUndoState();
	},
	function()
	{
		self.styleEditorDialog.hide();
		self.updateStyleEditor(null);//hack--lol
	});
    var domHelper = this.getCurrentPanelContainer().getDomHelper();
    
	domHelper.getElementByClass('atb-markereditor-map-pane').style.cursor = 'pointer';
};

atb.viewer.StandardSimpleMarkerEditor.prototype.onSelect = function () {
	var self= this;
	
	var editLayer = this.getEditableOverlay();
	
	//create our "onselect" tool:
	var selectOptions = {'multiple': false, 'hover': true};
	var ctl = new OpenLayers.Control.SelectFeature(editLayer, selectOptions);
	var self = this;
	
	ctl.events.register("featurehighlighted", 
        this, 
        function (event) {
            this.mouseIsOverFloatingMenuParent = true;
            
            var afterTimer = function () {
                if (this.mouseIsOverFloatingMenuParent) {
                    this.showMarkerContextMenu(event);
                }
            };
            afterTimer = atb.Util.scopeAsyncHandler(afterTimer, this)
            window.setTimeout(afterTimer, atb.viewer.Viewer.HOVER_SHOW_DELAY);
        });
    
    // Not ideal, but the only way I've found to handle a click event on a feature while listening for hovers
    ctl.handlers.feature.callbacks.click = function (feature) {
        var eventDispatcher = self.clientApp.getEventDispatcher();
        var event = new atb.events.ResourceClicked(feature.userInfo.getRemoteId(), feature.userInfo.resource, self);
        
        eventDispatcher.dispatchEvent(event);
    };
    
	ctl.events.register("featureunhighlighted", 
                        this, 
                        function (event) {
                            this.mouseIsOverFloatingMenuParent = false;
                            this.maybeHideHoverMenu();
	                    });
	
	this.activateTemporaryControl(ctl,
	                              function () {},
	                              function () {
		                              self.clearSelection();
	                              });
};

atb.viewer.StandardSimpleMarkerEditor.prototype.showMarkerContextMenu = function (event) {
    var self = this;
    
    var feature = event.feature;
    var context = feature;
    
    var menuButtons = this.evaluateMenuItemDefsHelper([
        {
            name: 'getMarkerInfo',
            icon: 'atb-radialmenu-button atb-radialmenu-button-info',
            action: function (actionEvent) {
               this.hideHoverMenu();
               var id = context.userInfo.getRemoteId();
               var pane = new atb.ui.InfoPane(this.clientApp, id, this.domHelper);
               pane.show();
            },
            tooltip: 'Get marker info'
        },
        {
            name: 'deleteThisMarker',
            icon: 'atb-radialmenu-button atb-radialmenu-button-delete',
            action: function (actionEvent) {
                        this.doDeleteMarkerCommandHelper(feature);
                        
                        this.hideHoverMenu();
                        this.clearSelection();
                    },
            tooltip: 'Delete this marker'
        },
        {
            name: 'hideMarker',
            icon: 'atb-radialmenu-button atb-radialmenu-button-hide-marker',
            action: function (actionEvent) {
                this.hideMarker(feature.userInfo.getRemoteId());
                
                this.hideHoverMenu()
                this.clearSelection();
            }, bEnabled: true, tooltip: 'Hide this marker'
        },
        {
            name: 'showLinkedAnnos',
            icon: 'atb-radialmenu-button atb-radialmenu-button-show-linked-annos',
            action: function (actionEvent) {
                    this.showAnnos(context.userInfo.getRemoteId());
                    
                    this.clearSelection();
            }, bEnabled: true, tooltip: 'Show resources linked to this marker'
        },
        {
            name: 'linkAway',
            icon: 'atb-radialmenu-button atb-radialmenu-button-create-link',
            action: function (actionEvent) {
                this.linkMarker(context);
                this.clearSelection();
            },
            tooltip: 'Link another resource to this marker'
        },
        {
            name: 'newTextAnno',
            icon: 'atb-radialmenu-button atb-radialmenu-button-new-text-anno',
            action: function (actionEvent) {
                this.createTextAnno(context.userInfo.getRemoteId());
                this.clearSelection();
            },
            tooltip: 'Annotate this marker'
        }
    ]);
    
    this.showHoverMenu(menuButtons, context.userInfo.getRemoteId());
};


atb.viewer.StandardSimpleMarkerEditor.prototype.shouldShowContextMenuAtMousePosition_ = function (feature) {
    return true;
};

atb.viewer.StandardSimpleMarkerEditor.prototype.highlightFeature = function (feature) {
    this.lastHighlightedFeature = feature;
    
    feature.style.strokeColor = '#C3DDFD';
    feature.style.strokeWidth = 5;
    
    feature.layer.redraw();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.unHighlightFeature = function (feature) {
    var resource = feature.userInfo.resource;
    var markerInfo = resource.getShapeData();
    
    feature.style.strokeColor = markerInfo.strokeColor;
    feature.style.strokeWidth = markerInfo.strokeWidth;
    
    feature.layer.redraw();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.flashFeatureHighlight = function (feature) {
    this.highlightFeature(feature);
    
    var timeoutFns = [function () {
                      this.unHighlightFeature(feature);
                      }, function () {
                      this.highlightFeature(feature);
                      }, function () {
                      this.unHighlightFeature(feature);
                      }];
    atb.Util.timeoutSequence(250, timeoutFns, this);
};

/**
 * generates a style editor sync function. still a work in progress.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.generateSyncStyleFunc=function(node, feature)
{
	var self=this;
	var getFieldValue=function(fieldName)
	{
		return jQuery('input.field_'+fieldName, node).val();
	};
	
	var styleUpdateFunc = function(bFinished)
	{
		//TODO: double check if we *Actually* modified anything and if so, save an undo state before we make real changes...
		var fromPercent = function(str)
		{
			var ret =str;
			ret=parseFloat(""+ret); 
			ret=ret/100.0;
			return ret;
		};
		
		var undef;
		if ((feature.savedStyle == null)||(feature.savedStyle == undef))
		{
			//feature.savedStyle = copyStyleHelper(feature.style);
			feature.savedStyle = self.copyStyle(feature.style);
			
		}
		//debugConsole.debugPrintObject(feature.savedStyle);
		
		
		var strokeColor = getFieldValue("strokeColor");
		var strokeOpacity = fromPercent(getFieldValue("strokeOpacity"));
		var strokeWidth = parseFloat(getFieldValue("strokeWidth"));
		
		var fillColor = getFieldValue("fillColor");
		var fillOpacity = fromPercent(getFieldValue("fillOpacity"));
		
		var pointRadius = parseFloat(getFieldValue("pointRadius"));
		
		var styleOverrides=
		{
			stroke: true,
			strokeColor: strokeColor,
			strokeOpacity: strokeOpacity,
			strokeWidth: strokeWidth,
			
			fill: true,
			fillColor: fillColor,
			fillOpacity: fillOpacity,
			
			pointRadius: pointRadius
		};
		
		
		var bChanged = false;
		for(k in styleOverrides)
		{
			var valNew =styleOverrides[k];
			//var valOld = feature.style[k];
			var valOld = feature.savedStyle[k];
			if (valNew!=valOld)
			{
				bChanged = true;
				break;
			}
		};
		
		
		if (bChanged)
		{
			if (bFinished)
			{
				//self.recordStateChange(
				//debugPrint("modified style!");
				
				//debugPrint("modified style!");
				self.pushUndoStateChanged("modify style");
			}
		}
		
		feature.style = styleOverrides;
		
		if (bFinished)
		{
			//feature.savedStyle = copyStyleHelper(feature.style);//{};//feature.style;
			feature.savedStyle = self.copyStyle(feature.style);//{};//feature.style;
			//for(
		}
		//debugConsole.debugPrintObject(feature.savedStyle);
		
		if (bChanged)
		{
			if (bFinished)
			{
				//self.pushUndoStateChanged
				
				self.saveUndoState();
			}
		}
		
		//update visual:
		//this.redisplayNow();
		self.redisplayNow();//lolhack!
		//self.getEditableOverlay().redraw();
	};
	
	return styleUpdateFunc;
};

atb.viewer.StandardSimpleMarkerEditor.prototype.putDefaultStyle=function(forType, styleValue)
{
	this.defaultStyles[forType] = this.copyStyle(styleValue);
};

/**
 * gets the current default style settings for new shapes
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.getDefaultStyle=function(forType)
{
	var ret;
	ret=this.defaultStyles[forType];
	if (atb.util.ReferenceUtil.isBadReferenceValue(ret))
	{
		ret=this.defaultStyles[""];
		if (atb.util.ReferenceUtil.isBadReferenceValue(ret))
		{
			//fallback to hardcoded defaults:
			ret = 
			{
				"stroke": true,
				"strokeColor": "#882222",
				"strokeOpacity": 1,
				"strokeWidth": 3,
				
				"fill": true,
				"fillColor": "#ff00ff",
				"fillOpacity": 1,
				
				"pointRadius": 7
			};
		}
	}
	ret = this.copyStyle(ret);//hack
	return ret;
};

/**
 * updates the style editor widget. still a work in progress.
**/
atb.viewer.StandardSimpleMarkerEditor.prototype.updateStyleEditor = function(feature)
{
	var self = this;
	
	var node = this.styleEditorDiv;
	var str = "";
	if (feature != null)
	{
		str += "<form>\n";
		str += "strokeWidth: <input name='strokeWidth' class='editNumber field_strokeWidth autoApplyChanges' type='text' value='1'><br/>\n";
		str += "strokeColor: <input name='strokeColor' class='editColor field_strokeColor' type='text' value='#ffFFff'><br/>\n";
		str += "strokeOpacity: <input name='strokeOpacity' class='editOpacity field_strokeOpacity' type='text' value='100'>%<br/>\n";
		str += "fillColor: <input name='fillColor' class='editColor field_fillColor' type='text' value='#ff00ff'><br/>\n";
		str += "fillOpacity <input name='fillOpacity' class='editOpacity field_fillOpacity' type='text' value='100'>%<br/>\n";
		str += "pointRadius: <input name='pointRadius' class='editNumber field_pointRadius autoApplyChanges' type='text' value='1'><br/>\n";
		str += "</form>\n";
	}
	else
	{
		str += "<i>No feature selected.</i><br/>\n";
	}
	
	node.innerHTML = str;
	
	//HACK:
		this.styleEditorDialog.setContent(str);//HACK
		////var node =
		node = this.styleEditorDialog.dialog.getContentElement();//HACK!!!
	//END HACK
	
	if (feature != null)
	{
		var updateStylesFunc = this.generateSyncStyleFunc(node, feature);
		this.finishStylesFunc = updateStylesFunc;//lolhack
		
		{
			var style = feature.style;
			var undef;
			
			if ((style==undef)||(style==null))
			{
				style= this.getDefaultStyle();
				feature.style=style;
			}
			
			var setField=function(fieldName, toValue)
			{
				jQuery('input.field_'+fieldName, node).val( "" + toValue );
			};
			
			var copyFieldFrom=function(fromObject, fieldName)
			{
				jQuery('input.field_'+fieldName, node).val( "" + fromObject[fieldName] );
			};
			
			copyFieldFrom(style, "strokeColor");
			copyFieldFrom(style,"strokeWidth");
			setField("strokeOpacity", parseFloat(style.strokeOpacity)*100.0);
			copyFieldFrom(style, "fillColor");
			setField("fillOpacity", parseFloat(style.fillOpacity)*100.0);//));
			copyFieldFrom(style, "pointRadius");
			
			var ocf = new atb.viewer.ColorOpacityField();
			var findTagByName=function(findName)
			{
				var ret = null;
				jQuery('input[name="'+findName+'"]', node).each( function(index)
				{
					ret = this;
				});
				return ret;
			};
			var names = [
				["strokeColor", "strokeOpacity"],
				["fillColor", "fillOpacity"]
			];
			for(var i=0; i<names.length; i++)
			{
				var colorField = findTagByName(names[i][0]);
				var opacityField = findTagByName(names[i][1]);
				//createColorOpacityEditorFieldResponses(ocf, colorField, opacityField, function(bFinished)//FAIL!!
				atb.viewer.ColorOpacityField.createColorOpacityEditorFieldResponses(ocf, colorField, opacityField, function(bFinished)
				{
					bFinished = (bFinished == true);
					updateStylesFunc(bFinished);
				});
			}	
		}
		
		jQuery('input.autoApplyChanges',node).change(function()
		{
			updateStylesFunc(true);
		});
	}
};

atb.viewer.StandardSimpleMarkerEditor.prototype.toggleAllMarkers = function () {
    if (! this.isShowingAllMarkers || this.hiddenMarkers.getCount() > 0) {
        this.hiddenMarkers.clear();
        this.isShowingAllMarkers = true;
        
        this.showLoadingSpinner();
        
        var withMarkers = function (markers) {
            for (var i=0, len=markers.length; i<len; i++) {
                var marker = markers[i];
                
                this.loadMarkerResource(marker);
            }
            
            this.hideLoadingSpinner();
            
            this.registerThumbnailToPanel();
        };
        this.crawler.crawlForCanvas(this.resourceId, withMarkers, this, this.flashErrorIcon);
        
        return true;
    }
    else {
        this.isShowingAllMarkers = false;
        
        var allMarkers = this.dataModel.getAllMarkers();
        
        for (var i=0, len=allMarkers.length; i<len; i++) {
            marker = allMarkers[i];
            var markerId = marker.resource.getId();
            
            this.hideMarker(markerId);
        }
        
        return false;
    }
};

atb.viewer.StandardSimpleMarkerEditor.prototype.hideMarker = function (id) {
    this.unloadMarkerObject(id);
    this.hiddenMarkers.add(id);
    
    var event = new goog.events.Event('marker hidden', id);
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    eventDispatcher.dispatchEvent(event);
    
    this.registerThumbnailToPanel();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.defaultPrimaryToolbarDefs = 
	[
		{
			//- Toggle all marker visibility button:
			name: 'toggleAllMarkerVisibility', 
			tooltip: 'Show/hide marker layer', 
			icon: 'atb-markereditor-button atb-markereditor-button-hide',
			group: null,//"standalone buttons",//atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			bToggleButtonHack: false,
			action: function( actionEvent )
			{
				//HACK: assume a toolbar menu!:
				var menu = actionEvent.getMenu();
				var menuItem = actionEvent.getMenuItem();
				var markerEditor = actionEvent.getContext();
                this.toggleAllMarkers();
			}
		},
		
		atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.redoCommand,
		
		atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.undoCommand,

		{
			//- Edit marker 
			name: 'editMarker', 
			tooltip: 'Edit marker', 
			icon: 'atb-markereditor-button atb-markereditor-button-modify',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function (actionEvent)
			{
				this.onActivateEditTool();
			}
		},
		
		//was edit style here
		
		{
			//- Draw point	// Create draw point button:
			name: "drawPoint",
			tooltip: "Draw point",
			icon: "atb-markereditor-button atb-markereditor-button-addpoint",
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function(actionEvent)
			{
				this.onBeginDrawNewPoint();
			}
		},
		
		{
			//- Draw PolyLINE	// Create draw polyLINE
			name: 'drawPolyline', 
			tooltip: 'Draw line', 
			icon: 'atb-markereditor-button atb-markereditor-button-line',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function (actionEvent)
			{
				this.onActivatePolyLineTool();
			}
		},
		
		{
			//- Draw polygon
			name: 'drawPolygon', 
			tooltip: 'Draw shape', 
			icon: 'atb-markereditor-button atb-markereditor-button-polygon',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function (actionEvent)
			{
				this.onActivatePolygonTool();
			}
		},
     
     {
         //- Draw Rectangle
         name: 'drawRectangle',
         tooltip: 'Draw box',
         icon: 'atb-markereditor-button atb-markereditor-button-rectangle',
         group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
         action: function (actionEvent) {
             this.onActivateRectangleTool();
         }
     },

		{
			// Testing tool:
			name: 'select', 
			tooltip: 'Select marker', 
			icon: 'atb-markereditor-button atb-markereditor-button-select',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function(actionEvent)
			{
				this.onSelect();
			}
		}//,
//
//		{
//			//- Save
//			name: 'save', 
//			tooltip: 'Save', 
//			icon: 'atb-markereditor-button atb-markereditor-button-save',
//			group: null, 
//			action: function(actionEvent)
//			{
//				this.onSaveDocument();
//			}
//		}

		
	///////////////////////////////////
	];
	
atb.viewer.StandardSimpleMarkerEditor.prototype.defaultPrimaryToolbarDefs_unused_commands = [
		{
			//- Edit marker style
			name: 'editMarkerStyle',
			tooltip: 'Edit marker Style',
			icon: 'atb-editor-editvertexbutton',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function (actionEvent)
			{
				this.onActivateStyleEditorTool();
			}
		},
		
		{
			name: 'viewAnnotations',
			tooltip: 'View all annotations which reference this canvas',
			icon: 'atb-markereditor-button atb-markereditor-button-annotations',
			group: null,
			action: function (actionEvent) {
				this.onActivateViewAnnotations(actionEvent);
			}
		}

];

atb.viewer.StandardSimpleMarkerEditor.DrawingShapeTypes = {
	shapePoint: "Point",
	shapePolyline: "Polyline",
	shapePolygon: "Polygon"
};

atb.viewer.StandardSimpleMarkerEditor.prototype.handleLinkingModeExited = function (event) {
    var anno = event.getResource();
    
    if (! anno) {
        if (this.lastHighlightedFeature) {
            this.unHighlightFeature(this.lastHighlightedFeature);
        }
        
        return;
    }
    
    var targetsAndBodies = anno.getChildIds();
    
    goog.array.forEach(targetsAndBodies, function (id) {
                           var feature = this.getFeatureByResourceId(id);
                           if (feature) {
                               this.flashFeatureHighlight(feature);
                           }
                           else if (this.resourceId == id) {
                               this.flashDocumentIconHighlight();
                           }
                       }, this);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.linkMarker = function (marker) {
	var myResourceId = marker.userInfo.getRemoteId();
	var myAnnoId = marker.userInfo.annoId;
    
    this.highlightFeature(marker);
	
	if (!myAnnoId) {
		this.ws.withUid(
                        function (uid) {
                        marker.userInfo.annoId = uid;
                        this.linkMarker(marker);
                        },
                        this
                        );
		
		return; //This method will be called again when the server responds
	}
	
	this.clientApp.createAnnoLink(myResourceId, myAnnoId);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.defaultDocIconMenuDefs = [
       {
           name: 'showLinkedAnnos',
           icon: 'atb-radialmenu-button atb-radialmenu-button-show-linked-annos',
           action: function (actionEvent) {
                   this.showAnnos(this.resourceId);
           }, bEnabled: true,
           tooltip: 'Show resources which reference this canvas'
       },
       {
       		name: 'newTextAnno',
       		icon: 'atb-radialmenu-button atb-radialmenu-button-new-text-anno',
       		action: function (actionEvent) {
       			this.createTextAnno(this.resourceId);
       		},
            tooltip: 'Annotate this canvas'
       	}
];

atb.viewer.StandardSimpleMarkerEditor.prototype.createTextAnno = function (myResourceId) {
	//debugPrint("TODO: reimplement this! - 'atb.viewer.StandardSimpleMarkerEditor.prototype.enterAnnoMode'");
		
		var otherContainer = this.getOtherPanelHelper();
		if (otherContainer === null)
		{
			//var str = "atb.viewer.StandardSimpleMarkerEditor.prototype.createTextAnno: otherContainer does not exist!";//hack
			str = "only one panel container found!";
			this.displayErrorMessage(str);
			return;
		}
		else
		{
			var fillerText = 'Create a text annotation';
			var annoBodyEditor = new atb.viewer.Editor(this.clientApp, fillerText);
                        annoBodyEditor.setPurpose('anno');

			var self = this;

			var targetTextTitle = 'New Annotation on ' + this.getTitle();

			this.dataModel.performSave(this.resourceId, this.ws, function(saveResponse) {
				self.ws.withUidList(
		        		2,
		        		function (uids) {
		        			var newTextId = uids[0];
		        			var annoId = uids[1];
		        			
		        			annoBodyEditor.resourceId = newTextId;
		        			annoBodyEditor.annotationUid = annoId;
		        			self.annotationUid = annoId;
		        			
		        			annoBodyEditor.setTitle(targetTextTitle);
		        			annoBodyEditor.toggleIsAnnoText(true);
		        			
		        			self.setAnnotationBody(newTextId);
		        			
		        			annoBodyEditor.saveContents(function () {
		        				self.ws.withSavedAnno(
			        					annoId,
			        					{
			        						'id': annoId,
			        						'type': 'anno',
			        						'anno': {
			        							'targets': [myResourceId],
			        							'bodies': [newTextId]
			        						}
			        					},
			        					function (response) {
			        						
			        					},
			        					this
			        				);
		        			}, this);
		        		},
		        		self,
                        atb.Util.scopeAsyncHandler(this.flashErrorIcon, this)
		        	);
			});
			
			//Q: why isn't this inside of the anonymous function above...?
			otherContainer.setViewer( annoBodyEditor );
			otherContainer.setTitle(targetTextTitle);
		}
};

atb.viewer.StandardSimpleMarkerEditor.prototype.getOtherPanelHelper = function()
{
	var otherPanel = null;
	
	var thisPanel = this.getCurrentPanelContainer();
	if (thisPanel !== null)
	{
		var panelManager = thisPanel.getPanelManager();
		if (panelManager !== null)
		{
			otherPanel = panelManager.getAnotherPanel(this.getCurrentPanelContainer());
		}
	}
	
	return otherPanel;
};

atb.viewer.StandardSimpleMarkerEditor.prototype.displayErrorMessage = function(msg)
{
	debugPrint(msg);
	var dialog = new atb.widgets.DialogWidget(
		{
			bModal: true,
			caption: "Error",
			content: ""+msg,
			show_buttons: [
				atb.widgets.DialogWidget.prototype.StandardButtonDefs.OkButton//,
				//this.StandardButtonDefs.CancelButton
			]
		}
	);
	dialog.show();
};

atb.viewer.StandardSimpleMarkerEditor.prototype.addMarkerToAnno = function (context) {
    var self = this;
	var otherPanel = this.getOtherPanelHelper();
	if (otherPanel === null)
	{
		var str = "atb.viewer.StandardSimpleMarkerEditor.prototype.addMarkerToAnno: otherPanel does not exist!";//hack
		this.displayErrorMessage(str);
	}
	else
	{
		this.dataModel.performSave(this.resourceId, this.ws, function(saveResponse) {
			//var other = self.getCurrentPanelContainer().getPanelManager().getAnotherPanel(self.getCurrentPanelContainer());
			//var other = 
			//var other = otherPanel;
			//var viewer = new atb.viewer.ResourceListViewer(self.ws, context.userInfo.getRemoteId());
			var viewer = new atb.viewer.ResourceListViewer(self.clientApp, context.userInfo.getRemoteId());
			otherPanel.setViewer(viewer);

			//Hack
			viewer.addSummariesFromUserId(10);
		}, atb.Util.scopeAsyncHandler(this.flashErrorIcon, this));
	}
    //var viewer = new atb.viewer.ResourceListViewer(this.ws, this.markerId);
    //other.setViewer(viewer);

    //Hack
    //viewer.addSummariesFromUserId(10);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.addAsTarget = function (context) {
    var self = this;

    //var panelManager = this.getCurrentPanelContainer().getPanelManager();
    //var otherContainer = panelManager.getAnotherPanel(this.getCurrentPanelContainer());
	var otherContainer = this.getOtherPanelHelper();
	if (otherContainer === null)
	{
		this.displayErrorMessage("StandardSimpleMarkerEditor::addAsTarget(): null other container!");
	}
	else
	{
		//var annoBodyEditor = null;
		var annoBodyEditor = otherContainer.getViewer();
		//otherContainer.viewer;
		if (atb.util.ReferenceUtil.isBadReferenceValue(annoBodyEditor.addAnnotationTarget))
		{
			//var str = "(StandardSimpleMarkerEditor): the other viewer does not have a method called 'addAnnotationTarget'!";
			this.displayErrorMessage("(StandardSimpleMarkerEditor): the other viewer does not have a method called 'addAnnotationTarget'!");
			//debugPrint(str);
			//throw new Error(str);
			//debugPrint();
			//throw new Error("the other viewer does not have a method called 'addAnnotationTarget'!");
			
		}
		else
		{
			this.dataModel.performSave(this.resourceId, this.ws, function(saveResponse) {
				annoBodyEditor.addAnnotationTarget(context.userInfo.getRemoteId(), 
                                                   self.getAnnotationStoreHack_(true).bodyItems[0]);
			}, atb.Util.scopeAsyncHandler(this.flashErrorIcon, this));
		}
	}
};

atb.viewer.StandardSimpleMarkerEditor.prototype.showAnnos = function (opt_myResourceId) {
	var id = opt_myResourceId || this.resourceId;

    var otherContainer = this.getOtherPanelHelper();

	var finder = new atb.viewer.Finder(this.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);

	otherContainer.setViewer(finder);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.renderHelper = function(parentDiv)
{
	atb.viewer.SimpleMarkerEditor.prototype.renderHelper.call(this, parentDiv);
//  SGB: Style editor needs to be a popup.    
//	parentDiv.appendChild(this.styleEditorDivRoot);//styleEditorDiv);

    var domHelper = this.getCurrentPanelContainer().getDomHelper();
	
	this.documentIcon = domHelper.createElement('div', null, null);
	jQuery(this.documentIcon).addClass('atb-viewer-documentIcon atb-viewer-documentIcon-noScrollbars');
	
	goog.events.listen(this.documentIcon, goog.events.EventType.CLICK, this.handleDocumentIconClick_, false, this);
    
    var menuItems = this.evaluateMenuItemDefsHelper(this.defaultDocIconMenuDefs);
    this.addHoverMenuListenersToElement(this.documentIcon, menuItems,
                                        atb.Util.scopeAsyncHandler(function() {return this.resourceId;}, this));
	
	parentDiv.appendChild(this.documentIcon);
    
    var editLayer = this.getEditableOverlay();
    editLayer.events.on({'afterfeaturemodified': atb.Util.scopeAsyncHandler(this.afterFeatureModifiedHandler, this)});
    
    goog.events.listen(this.rootDiv, goog.events.EventType.MOUSEOUT, function (e) {
                       // A necessary kludge, as OL does not always fire the mouse out event if the mouse
                       // moves off the map too quickly
                       this.mouseIsOverFloatingMenuParent = false;
                       
                       this.maybeHideHoverMenu();
                       }, false, this);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.handleDocumentIconClick_ = function (e) {
    e.stopPropagation();
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClicked(this.resourceId, null, this);
    
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.createStyleTags=function()
{
    var domHelper = this.getCurrentPanelContainer().getDomHelper();
    
	this.styleEditorDivRoot = domHelper.createElement("div");
	var alignHackNode = domHelper.createElement("div");
	this.styleEditorDiv = domHelper.createElement("div");
	jQuery(alignHackNode).addClass("atb-markereditor-style-pane");//HACK
	this.styleEditorDivRoot.appendChild(alignHackNode);
	alignHackNode.innerHTML = "<b>Style Editor:</b><br/>";
	alignHackNode.appendChild(this.styleEditorDiv);
	
	//this.styleEditorDialog.setDiv(this.styleEditorDivRoot);
	//this.styleEditorDialog.setDiv(this.alignHackNode);
	this.styleEditorDialog.setContentNode(this.alignHackNode);
};


atb.viewer.StandardSimpleMarkerEditor.prototype.setCrosshairCursor = function () {
        var domHelper = this.getCurrentPanelContainer().getDomHelper();
        domHelper.getElementByClass('atb-markereditor-map-pane').style.cursor = 'crosshair';
};

atb.viewer.StandardSimpleMarkerEditor.prototype.onPaneUnloaded = function () {
	atb.viewer.SimpleMarkerEditor.prototype.onPaneUnloaded.call(this);
	
	if (this.documentMenu) {
		this.documentMenu.hide();
	}
};

atb.viewer.StandardSimpleMarkerEditor.prototype.undo = function() {
    atb.viewer.SimpleMarkerEditor.prototype.undo.call(this);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.redo = function() {
	atb.viewer.SimpleMarkerEditor.prototype.redo.call(this);
};

atb.viewer.StandardSimpleMarkerEditor.prototype.viewerHasEnteredBackground = function () {
    if (this.documentMenuDisplayer) {
        this.documentMenuDisplayer.hide();
    }
    if (this.contextMenuDisplayer) {
        this.contextMenuDisplayer.hide();
    }
};

atb.viewer.StandardSimpleMarkerEditor.prototype.getFeatureByResourceId = function (id) {
    var markerData =this.dataModel.getMarkerByRemoteId(id);
    
    if (markerData) {
        return markerData.state.featureInfo;
    }
    else {
        return null;
    }
};
/*
atb.viewer.StandardSimpleMarkerEditor.prototype.getUid = function () {
    var baseId = atb.viewer.Viewer.prototype.getUid.call(this);
    
    var round = function (number) {
        return Math.round(number / 25) * 25;
    };
    
    var bounds = this.olViewer.getExtent();

    var roundedBounds = {
    bottom: round(bounds.bottom),
    left: round(bounds.left),
    top: round(bounds.top),
    right: round(bounds.right)
    };
    
    return baseId + goog.json.serialize(roundedBounds);
};
*/