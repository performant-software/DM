goog.provide('atb.viewer.MarkerViewer');

/**
 * @fileoverview A plain viewer for markers. Without any of the fancy editing abilities of a MarkerEditor.
 *
**/

goog.require('atb.viewer.ResourceViewer');
goog.require('atb.marker.Point');
goog.require('atb.marker.Line');
goog.require('atb.marker.Polygon');
goog.require('jquery.jQuery');
goog.require('openlayers.OpenLayers');

goog.require("atb.debug.DebugUtil");

/**
 * Creates a MarkerViewer.
 *
 * @public
 * @constructor
 * @extends {atb.viewer.ResourceViewer}
 *
 * @param {atb.WebService} set_webService A webservice to initialize this with.
 * @param {goog.math.Size=} opt_viewerSize An optional size for the viewer. This doesn't really do much *YET*.
 *
**/
atb.viewer.MarkerViewer = function(set_clientApp, opt_domHelper)
{
	//set_webService,
	//set_clientApp
	//,
    //opt_viewerSize
//) { 
	//call superclass's constructor:
    atb.viewer.ResourceViewer.call(this, set_clientApp, opt_domHelper);
	
	this.bShowMarkersLayer = true;
		//,//set_webService, 
		//opt_viewerSize
	//);
	this.overlays = [];
    this.markers = {};
	
	this.title = "";
	
	//create the "default" overlay.
	this.defaultOverlayId_ = "o1";
	this.addOverlay( this.defaultOverlayId_ );
};
goog.inherits(atb.viewer.MarkerViewer, atb.viewer.ResourceViewer);


//Fields:

atb.viewer.MarkerViewer.prototype.DEFAULT_MARKER_ZOOM = 11;


	
//atb.viewer.ResourceViewer.prototype.setShowMarkersLayer = function(set_showLayer)
atb.viewer.MarkerViewer.prototype.setShowMarkersLayer = function(set_showLayer)
{
	this.bShowMarkersLayer = atb.util.LangUtil.forceBoolean(set_showLayer,true);//false);//lohack
	//	//!!!
	var overlay = this.getEditableOverlay();
	
	/*if (this.bShowMarkersLayer)
	{
	}
	*/
	overlay.setVisibility(this.bShowMarkersLayer);
	//debugPrint("!?!");//lol
};



/**
 * returns the overlay used by editable stuff.
 *
 * Mostly used in MarkerEditor and below.
 *
 * @return {OpenLayers.Layer} The primary editable overlay for this viewer.
**/
atb.viewer.MarkerViewer.prototype.getEditableOverlay=function()
{
	return this.overlays[ this.defaultOverlayId_ ];
};

atb.viewer.MarkerViewer.prototype.addOverlay = function(overlayId)
{
	overlayId = "" + overlayId; //force to string
	
	atb.debug.DebugUtil.assertNotValidObject(this.overlays[ overlayId ], "atb.viewer.MarkerViewer::addOverlay - overlayId already exists: '"+overlayId+"'");
	
	var newOverlay = new OpenLayers.Layer.Vector(overlayId);
	this.overlays[ overlayId ] = newOverlay;
    this.olViewer.addLayers( [ newOverlay ] );
};


atb.viewer.MarkerViewer.prototype.addMarker = function(regionId, overlayId) {
    this.ws.withRegionMarker(
        regionId, 
        function(m) {
            this.markers[regionId] = marker;
            this.overlays[overlayId].addFeatures([
                m.marker(this.image.size)
            ]);
        },
        this
    );
};

/** @deprecated */
atb.viewer.MarkerViewer.prototype.addMarkerJSON = function (json) {
    var markerResource = atb.resource.ResourceFactory.createFromJSON(json);

    var createPoints = function (points) {
        var ptObjs = new Array();

        for (var x in points) {
            var point = points[x];

            ptObjs.push(new atb.marker.Point(0, point[0], point[1], 0, 0, 0, 0));
        }

        return ptObjs;
    }

    var marker;
    var type = markerResource.getShapeType();
    var id = markerResource.getId();
    var shapeData = markerResource.getShapeData();
    
    if (type == 'point') {
        marker = new atb.marker.Point(id, shapeData.point.cx, shapeData.cy, shapeData.radius, shapeData.strokeWidth, shapeData.strokeColor, shapeData.fill);
    }

    else if (type == 'line') {
        marker = new atb.marker.Line(id, shapeData.strokeWidth, shapeData.strokeColor, shapeData.fill, shapeData.points);
    }

    else if (type == 'polygon') {
        marker = new atb.marker.Polygon(id, shapeData.strokeWidth, shapeData.strokeColor, shapeData.fill, createPoints(shapeData.points));
    }

    var olMarker = marker.marker();
    olMarker.userInfo = marker;

    this.markers[marker.id] = marker;
    this.overlays[this.defaultOverlayId_].addFeatures([olMarker]); 
};

atb.viewer.MarkerViewer.prototype.hasMarker = function (regionId) {
    if (this.markers[regionId]) {
        return true;
    }
    return false;
};


atb.viewer.MarkerViewer.prototype.removeMarker = function (regionId) {
    if (!this.hasMarker) {
        throw "The marker to be removed does not exist";
    }

    var marker = this.markers[regionId];

    this.overlays[this.defaultOverlayId_].removeFeatures([marker]);
    marker = null;
};

atb.viewer.MarkerViewer.prototype.centerOnMarker = function(id) {
    var marker = this.markers[id];
    if (marker) {
        var geom = marker.geometry();
        geom.calculateBounds();
        var bounds = geom.getBounds();
        var c = bounds.getCenterLonLat();
        this.olViewer.setCenter(new OpenLayers.LonLat(c.lon, c.lat), atb.viewer.MarkerViewer.prototype.DEFAULT_MARKER_ZOOM);
    } else {
        throw "Unknown marker: " + id;
    }
};


atb.viewer.MarkerViewer.prototype.centerOnOverlay = function(overlayId) {
    var overlay = this.overlays[overlayId];
    var markers = overlay.features;
    var nMarkers = markers.length;
    var points = [];
    for (i=0; i<nMarkers; i++) {
        points = points.concat(markers[i].geometry.getVertices());
    }
    if (points.length > 0) {
        var multiPoint = new OpenLayers.Geometry.MultiPoint(points);
        multiPoint.calculateBounds();
        var bounds = multiPoint.getBounds();
        var c = bounds.getCenterLonLat();
        this.olViewer.setCenter(new OpenLayers.LonLat(c.lon, c.lat), 2);
    }
};

atb.viewer.MarkerViewer.prototype.loadBackgroundImage = function(resourceId)
{
	var useAsDefaultHack = 1; //HACK
	this.setResource(resourceId, useAsDefaultHack);

};


atb.viewer.MarkerViewer.prototype.onTitleChanged = function (newTitle)
{
	this.setTitle(newTitle);
};

//set an alias:
atb.viewer.MarkerViewer.prototype.onTitleChange = atb.viewer.MarkerViewer.prototype.onTitleChanged;

atb.viewer.MarkerViewer.prototype.isTitleEditable = function()
{
	return false;//viewer only
};

atb.viewer.MarkerViewer.prototype.setTitle = function(set_title)
{
    //this.title = newTitle;
	//orlolvalidatinpue..??
    //console.log("setTitle: title being set to: " + set_title);
    //console.trace();
	this.title = set_title;
	this.syncTitle();
}

atb.viewer.MarkerViewer.prototype.syncTitle = function()
{
	var myPanel = this.getCurrentPanelContainer();
	if (myPanel !== null)
	{
		//this.myPanel.setTitle(this.getTitle());
		//this.myPanel.setTitleEditable(this.isTitleEditable());
		//^LOL!
		myPanel.setTitle(this.getTitle());
		myPanel.setTitleEditable(this.isTitleEditable());
	};
};

//atb.viewer.MarkerViewer.prototype.autoSetTitle = function ()
//{
    //this.getCurrentPanelContainer().setTitle(this.name);
//};

atb.viewer.MarkerViewer.prototype.getTitle = function()
{
	return this.title;
};



atb.viewer.MarkerViewer.prototype.onPaneLoaded = function()
{
	this.syncTitle();//lol!
};//lolforogtonelol!


atb.viewer.MarkerViewer.prototype.render = function()
{//added to handle the settitleeditable case removed from resourceviewer (probably overkill tho!):
	atb.viewer.ResourceViewer.prototype.render.call(this);
	this.syncTitle();//HACK
};

atb.viewer.MarkerViewer.prototype.isShowingMarker = function(id)
{
	//lol...todo: ?= handle refreshes and stuff better lol...?
	
	var marker = this.dataModel.getMarkerByRemoteId(id);
	if (marker !== null)
	{
		return marker.isEnabled();
	}
	
	return false;//marker not found
};