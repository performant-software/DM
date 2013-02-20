goog.provide('atb.viewer.ResourceViewer');

goog.require('goog.math.Size');
goog.require('atb.resource.Image');
goog.require('atb.DMWebService');
goog.require('jquery.jQuery');
goog.require("atb.util.ReferenceUtil");
goog.require("atb.ClientApp");
goog.require('atb.viewer.CanvasThumbnail');

/**
 * atb.viewer.ResourceViewer
 *
 * @extends {atb.viewer.Viewer};
 */
atb.viewer.ResourceViewer = function(set_clientApp)
{
	atb.viewer.Viewer.call(this, set_clientApp);
    
	this.domHelper_ = new goog.dom.DomHelper(window.document);//TODO: move to Render

	this.mapDiv = null;
	this.ws = this.clientApp.getWebService();
	
	this.crawler = this.clientApp.getResourceCrawler();
	
	this.setLastKnownMousePosition(0,0);//hack
//opt_set_webService,
	
// opt_viewerSize)
//{
	//opt_viewerSize = atb.util.ReferenceUtil.applyDefaultValue(opt_viewerSize, null);
	//opt_set_webService= atb.util.ReferenceUtil.applyDefaultValue(opt_set_webService, null);
	
	//if (opt_viewerSize === null)
	
	//^hack removed that parameter. TODO: maybe get me from the panel container.../explicitly resize us...?
	{
		var defaultWidth = 476, defaultHeight = 534;//lolhack!
		//opt_viewerSize = new goog.math.Size(
		var viewerSize = new goog.math.Size(
			defaultWidth,
			defaultHeight
		);
	}
	//var domHelper = this.getCurrentPanelContainer().getDomHelper();
	//this.mapDiv = domHelper.createElement('div');
	////////////
	
	//this.mapdiv = this.createElement("div");
	this.mapDiv = this.createElement("div");
	jQuery(this.mapDiv).addClass("atb-viewer-resourceviewer-unselectable-map-div");
	
	//this.mapDiv.style.userSelect = "none";//HACK - fixes the open layers "selection" blueness bug things...
	//???//this.mapDiv.style.WebkitUserSelect = "none";
	
	//this.mapDiv = domHelper.createElement('div');
	//this.mapDiv = document.createElement("div");//HACK
	var jqMapDiv = jQuery(this.mapDiv);
	jqMapDiv.addClass("viewer");
	jqMapDiv.addClass("atb-markereditor-map-pane");//hack! - should the mapviewer maybe be adding this...?[but is that safe... iirc, it was needed here for some reason...]
	
	//this.mapDiv.style.top = "50px";//HACK!!
	
	
	////////////
    this.olViewerSize = viewerSize;//opt_viewerSize;
	this.rootDiv = null;
	
	//this.olViewer = new OpenLayers.Map({});
	this.olViewer = new OpenLayers.Map(this.mapDiv);
	//this.olViewer.addControl(new OpenLayers.Control.LayerSwitcher());
    
    var panZoomControls = this.olViewer.getControlsByClass('OpenLayers.Control.PanZoom');
    for (var i=0; i<panZoomControls.length; i++) {
        this.olViewer.removeControl(panZoomControls[i]);
    }
    this.olViewer.addControl(new OpenLayers.Control.PanZoomBar());
    this.olViewer.addControl(new OpenLayers.Control.MousePosition());
//    this.olViewer.addControl(new OpenLayers.Control.OverviewMap());
	
	var self = this;
	//this.olViewer.events.register("mousemove", map, function(e)
	this.olViewer.events.register("mousemove", this.olViewer, function(e)
	{ 
		var position = this.events.getMousePosition(e);
		//debugPrint('break here = 1');
		//self.setLastKnownMousePosition(position.getX()
		self.setLastKnownMousePosition(position.x, position.y);
		//OpenLayers.Util.getElement("coords").innerHTML = position;
	});
	jQuery(this.mapDiv).mouseenter(function(mouseEvent)
	{
		//debugPrint("mouseenter!");
		var mx = mouseEvent.layerX;
		var my = mouseEvent.layerY;
		self.setLastKnownMousePosition(mx,my);
	});
	
	/*
	map.addControl(new OpenLayers.Control.MousePosition());

            var ol_wms = new OpenLayers.Layer.WMS( "OpenLayers WMS", 
                "http://vmap0.tiles.osgeo.org/wms/vmap0",
                {layers: 'basic'} );

            map.addLayers([ol_wms]);
            if (!map.getCenter()) map.zoomToMaxExtent();
            
            map.events.register("mousemove", map, function(e) { 
                var position = this.events.getMousePosition(e);
                OpenLayers.Util.getElement("coords").innerHTML = position;
            });

	*/
	
    //this.ws = opt_set_webService;
    this.resourceId = null;
    this.imageId = null;
    this.image = null;
    this.olBaseLayer = null;
    this.olNumZoomLevels = 16;
    this.olMinResolution = 22.5;
    this.olMaxResolution = 0.3515625;
	
	//a fake layer to allow us to not have errors from "centerPx is null" when trying to pan the map/etc, if we've failed to load a resource.
	//		this is a bit of a hack to fix those cases, until we can properly set a baseLayer.
	this.fakeLayer = new OpenLayers.Layer.Vector("dummyLayer", {});
	this.lastFakeLayer = null;
	this.loadFakeLayer();
};
goog.inherits(atb.viewer.ResourceViewer, atb.viewer.Viewer);


atb.viewer.ResourceViewer.prototype.getLastKnownMousePosition = function()
{
	return {
		x: this.lastMousePosition.x,
		y: this.lastMousePosition.y
	};
};
atb.viewer.ResourceViewer.prototype.setLastKnownMousePosition = function(mx, my)
{
	this.lastMousePosition = {
		x: mx,
		y: my
	};
};

atb.viewer.ResourceViewer.prototype.loadFakeLayer = function()
{
	//hack to prevent null pixel pos stuff from happening
	if (this.lastFakeLayer === null)
	{
		this.lastFakeLayer = this.fakeLayer;
		this.olViewer.addLayers([this.fakeLayer]);
		this.olViewer.setBaseLayer(this.fakeLayer);//HACK
		
		//fix center px/etc:
		this.centerOnCenter();
		//this.setMinZoom(); //not needed for center px fix...?
	}
};

atb.viewer.ResourceViewer.prototype.unloadFakeLayer=function()
{
	if (this.lastFakeLayer !== null)
	{
		this.olViewer.removeLayer(this.lastFakeLayer);
		this.lastFakeLayer = null;
	}
};

atb.viewer.ResourceViewer.prototype.generateViewerThumbnail = function () {
    return new atb.viewer.CanvasThumbnail(this);
};

atb.viewer.ResourceViewer.prototype.setResource = function(
    resourceId, 
    opt_imageId, 
    opt_doAfter
) {
    this.isLoading = true;
    
    this.crawler.crawlForCanvas(resourceId,
                                function (markers) {
                                var canvas = this.crawler.getResource(resourceId);
                                
                                this.resource = canvas;
                                
                                this.setBaseLayer(canvas, resourceId, opt_imageId, opt_doAfter);
                                this.setTitle(canvas.getTitle());
                                
                                this.registerThumbnailToPanel();
                                
                                this.olViewer.events.register('moveend', this.olViewer, atb.Util.scopeAsyncHandler(this.registerThumbnailToPanel, this));
                                this.olViewer.events.register('zoomend', this.olViewer, atb.Util.scopeAsyncHandler(this.registerThumbnailToPanel, this));
                                }, this, this.flashErrorIcon);
};


atb.viewer.ResourceViewer.prototype.setBaseLayer = function(
    canvas,
    resourceId,
    opt_imageId,
    doAfter
) {
	this.resourceId = resourceId;
    if (opt_imageId) {
        this.imageId = opt_imageId;
    } else if (canvas.getDefaultImageId()) {
        this.imageId = canvas.getDefaultImageId();
    } else {
        throw new Error("Resource does not define a default image and no imageId passed.");
    }
    var imageData = canvas.getImages().get(this.imageId); 
    if (imageData == null) {
        throw new Error("No data for image with id: " + opt_imageId);
    }
	
	this.image = 
        new atb.resource.Image(
            this.imageId, 
            new goog.math.Size(imageData.width, 
                               imageData.height)
        );
    var resourceImageURI = 
		this.ws.resourceImageURI(
            this.resourceId,
            this.imageId,
            this.image.size
        );
    
	if (this.olBaseLayer != null) {
        this.olViewer.removeLayer(this.olBaseLayer);
    }
	else
	{
		this.unloadFakeLayer();
	}

	this.olBaseLayer = 
		new OpenLayers.Layer.Image(
			canvas.getTitle(),
            resourceImageURI,
			new OpenLayers.Bounds(0.0, 
                                  0.0, 
                                  this.image.size.width,
                                  this.image.size.height),
			new OpenLayers.Size(this.olViewerSize.width, this.olViewerSize.height),
                                   { //numZoomLevels: this.olNumZoomLevels, 
                                       minResolution: this.olMinResolution,
                                       maxResolution: this.olMaxResolution,
                                       transitionEffect: 'resize'}
		);
	
    this.olBaseLayer.events.register("loadend", this, function (e) {
                                     this.isLoading = false;
                                     this.hideLoadingSpinner();
                              });
    
    this.olViewer.addLayers([this.olBaseLayer]);
    this.centerOnCenter();
    this.setMinZoom();
	if (doAfter) {
        doAfter();
    }
};


atb.viewer.ResourceViewer.prototype.centerOnCenter = function()
{
	this.olViewer.setCenter(new OpenLayers.LonLat(0, 0), 3);
};

atb.viewer.ResourceViewer.prototype.setMinZoom = function()
{
	this.olViewer.zoomToMaxExtent();
};

atb.viewer.ResourceViewer.prototype.enterAnnoMode = function (annoId) {
    this.annoId = annoId;
}

atb.viewer.ResourceViewer.prototype.exitAnnoMode = function () {
    this.annoId = null;
}

atb.viewer.ResourceViewer.prototype.resize = function () {
    //TODO
    throw new Error("resourceViewer::resize(): not yet implemented");
}

atb.viewer.ResourceViewer.prototype.render = function()
{
	if (this.rootDiv !== null)
	{
		return;//already rendered!
	}
	
	atb.viewer.Viewer.prototype.render.call(this);
    
    if (this.isLoading) {
        this.showLoadingSpinner();
    }
    else {
        this.hideLoadingSpinner();
    }
    
	this.renderHelper(this.rootDiv);
};

atb.viewer.ResourceViewer.prototype.renderHelper = function(parentDiv)
{
	if ((parentDiv !== null) && (this.mapDiv !== null))
	{
		parentDiv.appendChild(this.mapDiv);
	}
	else
	{
		//something was null...!
	}
};

atb.viewer.ResourceViewer.prototype.createElement = function(nodeTagName)
{
	//for nodeTagName, pass something like "div", "a", etc...!
	/*
	var domHelper = this.getCurrentPanelContainer().getDomHelper();
	*/
	var domHelper = this.domHelper_;//HACK
	//return domHelper.createElement(nodeName);
	return domHelper.createElement(nodeTagName);
	//if (
};

atb.viewer.ResourceViewer.prototype.finishRender=function()
{
	//this.mapdiv = this.createElement_(nodeName);
	//this.renderHelper(this.rootDiv);//new hack
	
	this.olViewer.render(this.mapDiv);
	
};

atb.viewer.ResourceViewer.prototype.setTitle = function(set_title)
{
	debugPrint("TODO: implement atb.viewer.ResourceViewer.prototype::setTitle()!");
};

atb.viewer.ResourceViewer.prototype.nudge = function(dx,dy)
{
	this.olViewer.pan(dx,dy);//HACK
}

atb.viewer.ResourceViewer.prototype.onNudge = function()
{
	this.nudge(0,0);
};