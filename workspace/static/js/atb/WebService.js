goog.provide('atb.WebService');


goog.require('goog.math.Size');
goog.require('goog.net.CrossDomainRpc');
goog.require('goog.net.EventType');
goog.require('atb.Util');
goog.require('jquery.jQuery');
goog.require('goog.ui.IdGenerator');
goog.require('atb.util.Stack');

goog.require("atb.debug.DebugFilter");
/**
 * @constructor
 * @param rootURI {string}
 */
atb.WebService = function(rootURI, mediaURI) {
    this.debugFilter = new atb.debug.DebugFilter();
	
    if (rootURI[rootURI.length-1] != '/') {
        this.rootURI = rootURI + "/"; 
    } else {
		this.rootURI = rootURI; 
    }

    if (mediaURI[mediaURI.length-1] != '/') {
        this.mediaURI = mediaURI + "/"; 
    } else {
		this.mediaURI = mediaURI; 
    }
	
	//setup some stuff for the mode which uses a "fake" server:
	this.debugInit();

	//this will hold extra ids:
	this.idArray = [];
    
    this.clientApp = null;
};


atb.WebService.TEXT_RESOURCE = 'text';
atb.WebService.MARKER_RESOURCE = 'marker';
atb.WebService.ANNO_RESOURCE = 'anno';
atb.WebService.IMG_RESOURCE = 'img';

atb.WebService.prototype.setClientApp = function (clientApp) {
    this.clientApp = clientApp;
};

atb.WebService.prototype.getClientApp = function () {
    return this.clientApp;
};

atb.WebService.prototype.uidURI = function() {
    return this.rootURI + "resource_id/";
};


atb.WebService.prototype.withUid = function(
    handler, 
    opt_handlerScope
){
    var uri = this.uidURI();
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    handler(goog.ui.IdGenerator.instance.getNextUniqueId());
}


atb.WebService.prototype.withUidList = function(
    numIds, 
    handler,
    opt_handlerScope
)
{
    var uids = [];
    for (i=0; i<numIds; i++) {
        uids.push(goog.ui.IdGenerator.instance.getNextUniqueId());
    }
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
	handler(uids);
};


atb.WebService.prototype.resourceMetaDataURI = function(resourceID) {
    var uri = this.rootURI + "resource/" + resourceID + "/meta_data.json"; 
    return uri;
};


atb.WebService.prototype.withResourceMetaData = function(
    resourceID, 
    handler,
    opt_handlerScope,
    opt_minFormatting
){
    var uri = this.resourceMetaDataURI(resourceID);
    if (opt_minFormatting) {
        uri += "&min_formatting=True";
    }
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    /*
    handler_debug = function(data) {
        //console.log("withResourceMetaData got response:");
        //console.log(data);
        handler(data);
        //console.log("after handler");
    };
    */
    jQuery.getJSON(uri, handler);
};


atb.WebService.prototype.withResource = 
    atb.WebService.prototype.withResourceMetaData;


atb.WebService.prototype.multiResourceMetaDataURI = function (params) {
	var uri = this.rootURI + 'resources_meta_data.json?';
	
	for (var p in params) {
		uri += this.escapeURICharacters(p) + '=' + this.escapeURICharacters(params[p]) + '&';
	}

	return uri.substring(0, uri.length-1); //Removes trailing '&'
};


atb.WebService.prototype.parseMultiResourceMetaData = function (params) {
	return jQuery.parseJSON(this.multiResourceMetaDataURI(params));
};

atb.WebService.prototype.withMultiResourceMetaData = function(
    params, 
    handler,
    opt_handlerScope
){
    var uri = this.multiResourceMetaDataURI(params);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.WebService.prototype.resourceImageURI = function(
    resourceID, imageID, size, bounds
) {
    var uri = 
        this.rootURI + 
        "resource/" + resourceID +
        "/image/" + imageID; 
    if (size) {
        uri += "_w" + size.width + "_h" + size.height; 
    }
    if (bounds) {
        uri += "_x1" + bounds.x1 + "_x2" + bounds.y1 + 
            "_x3" + bounds.x2 + "_x4" + bounds.y2;
    }
    
    return uri;
};

    
atb.WebService.prototype.annotationURI = function(annoID) {
    return this.rootURI + "annotation/" + annoID +".json";
};


atb.WebService.prototype.regionURI = function(id) {
    return this.rootURI + "region/" + id +".json";
};


atb.WebService.prototype.withRegionMarker = function(
    id,
    handler, 
    opt_handlerScope
){
    var uri = this.regionURI(id);
    parseAndHandle = atb.Util.pipeline(
        this.parseRegionMarkerJson, 
        handler, 
        this, 
        opt_handlerScope);
    jQuery.getJSON(uri, parseAndHandle);
};


atb.WebService.prototype.withAnnotation = function(
    annoID, 
    handler, 
    opt_handlerScope
){
    var uri = this.annotationURI(annoID); //console.log(uri)
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.WebService.prototype.annoImageURI = function(annoID, width, height) {
    var uri = 
        this.rootURI + 
        "annotation/" + annoID +
        "/image/"; 
    if (width && height) {
        uri += "w" + width + "_h" + height; 
    } else if (width) {
        uri += "w" + width;
    } else if (height) {
        uri += "h" + height; 
    }
    
    return uri;
};


atb.WebService.prototype.withBatchMarkerRequests = function(canvasId, data, callback)
{
	//TODO: send it directly...
	/*
	//example-ish code:
	var uri = this.createURI("/sendMarkers.php");
	var postContent = {content: encodeURI(data)};
	var handler = atb.Util.scopeAsyncHandler(callback);
	jQuery.post(uri, postContent, handler);
	*/
	//(response));
	
	//HACK:
	//debugPrint(debugConsole.prettyPrint(data));
	//if (debugConsole)
	//{
	//	debugConsole.debugPrintObject(data);//hack
	//}
	//debugViewObject(data);
	//alert("!");
	//debugPrintObject(data);//hack
	
	//TODO: do something more sane...!
	//debugViewObject(data);
	debugViewObject(data, "ws_batch");
	
	var fakeResponse = {
		"status": "OK"
	};
	window.setTimeout(function()
	{
		callback(fakeResponse);
	},10);//hack
};


atb.WebService.prototype.debugInit = function()
{
	//TODO: create a local-test debug version of the webservice...??
	
	this.markerDebug = {
		nextRemoteId: 10000
	};
	
};


atb.WebService.prototype.createURI=function(tail)
{
	return this.rootURI + tail;
};

atb.WebService.prototype.markerSaveExtraIDs=function(extraIDArray)
{
	for(var i=0; i<extraIDArray.length; i++)
	{
		this.idArray.push(extraIDArray[i]);
	}
};

atb.WebService.prototype.escapeURICharacters = function (uri) {
    uri += '';

    uri = uri.replace('%', '%25');

    uri = uri.replace(' ', '%20');
    uri = uri.replace(',', '%2C')
    uri = uri.replace('"', '%22');
    uri = uri.replace('<', '%3C');
    uri = uri.replace('>', '%3E');
    uri = uri.replace('#', '%23');
    uri = uri.replace('$', '%24');
    uri = uri.replace('&', '%26');
    uri = uri.replace('+', '%2B');
    uri = uri.replace('/', '%2F');
    uri = uri.replace(':', '%3A');
    uri = uri.replace(';', '%3B');
    uri = uri.replace('=', '%3D');
    uri = uri.replace('?', '%3F');
    uri = uri.replace('@', '%40');
    
    return uri;

    //TODO: Write more efficient search and replace
};
/*
atb.WebService.prototype.withIdsFromServer = function (numIds, handler, opt_handlerScope) {
    //TODO: Connect this to server

    //Generate fake UIDs
    var generator = new goog.ui.IdGenerator();

    var ids = new Array();

    for (var i=0; i<numIds; i++) {
        ids.push(generator.getNextUniqueId());
    }

    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);

    handler(ids);
};*/

atb.WebService.prototype.withSavedText = function (resourceId, title, content, handler, opt_handlerScope) {
    //TODO: Implement
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    handler(200);
};

atb.WebService.prototype.textURI = function (resourceId) {
    return this.rootURI + "resource/" + resourceId + "/meta_data.json";
};

atb.WebService.prototype.withText = function (resourceId, handler, opt_handlerScope) {
    var uri = this.textURI(resourceId);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};

atb.WebService.prototype.getCssRoot = function () {
    return this.rootURI + '../../css/'
};

atb.WebService.prototype.withSavedAnno = function (uid, annoJSON, handler, opt_handlerScope) {
    //TODO: Implement
    //console.log(annoJSON);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    handler(200);
};

atb.WebService.prototype.getAutoCompleteUri = function () {
    return this.rootURI + 'autocomplete.json';
};

atb.WebService.prototype.targetsUri = function (resourceId) {
	return this.rootURI + 'targets/' + resourceId + '.json';
};

atb.WebService.prototype.bodiesUri = function (resourceId) {
	return this.rootURI + 'bodies/' + resourceId + '.json';
};

atb.WebService.prototype.withTargets = function (resourceId, handler, opt_handlerScope) {
	var uri = this.targetsUri(resourceId);
	handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
	jQuery.getJSON(uri, handler);
};

atb.WebService.prototype.withBodies = function (resourceId, handler, opt_handlerScope) {
	var uri = this.bodiesUri(resourceId);
	handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
	jQuery.getJSON(uri, handler);
};

atb.WebService.prototype.numTargetsBodiesUri = function (resourceId) {
	return this.rootURI + 'num_targets_bodies/' + resourceId + '.json';
};

atb.WebService.prototype.withNumTargetsBodies = function (resourceId, handler, opt_handlerScope) {
	var uri = this.numTargetsBodiesUri(resourceId);
	handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
	jQuery.getJSON(uri, handler);
};


atb.WebService.prototype.getJSONResourceQueryPageURI = function()
{
	//return "dummyQuery.json.php"
	//return this.createURI("DataStoreTest.json.php");
	var ret;
	ret = this.createURI("DataStoreTest.json.php");
	//debugPrint("getJSONResourceQueryPageURI = '"+ret+"'");
	return ret;
};

atb.WebService.prototype.requestResources = function(remoteIds, callback)
{
	var responses =[];
	
	//var uriBase = "dummyQuery.json.php?resourceId=";
	var uriBase = this.getJSONResourceQueryPageURI() + "?resourceId=";
	//dummyQuery.json.php
	
	//var stack = new atb.util.Stack();
	var items = new atb.util.Stack();
	//items.addAll(remoteIds);
	items.pushAll(remoteIds);
	//var func = 
	var lastQuery = null;
	
	var responseFunc;
	var incrementalFunc;
	
	var self = this;
	incrementalFunc = function()//response)
	{
		//this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "incrementalFunc!");
		self.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "incrementalFunc!");
		if (items.isEmpty())
		{
			//this.debugFilter.debugPrint(atb.debug.DebugFilter.CAT_TRACE, 
			//this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, 
			self.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "incremental - done; doing callback!");
			//this.this.debugFilter.debugPrint(atb.debug.DebugFilter.CAT_TRACE, 
			callback(responses);
		}
		else
		{
			lastQuery = items.pop();
			//this.this.debugFilter.debugPrint(atb.debug.DebugFilter.CAT_TRACE, 
			self.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "now requesting: "+lastQuery);
			var uri = uriBase + lastQuery;
			//uri = "http://localhost/Drew/work/anno/anno/html/dummyQuery.json.php?resourceId=5";//hack
			self.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "&nbsp;&nbsp;&nbsp;&nbsp;"+"uri = <a href='"+uri+"'>"+uri+"</a>");
			//debugPrint(""+jquery.getJSON);
			//debugPrint(""+jQuery.getJSON);
			jQuery.getJSON(uri, responseFunc);
		}
	};
	
	responseFunc = function(response)
	{
		//todo: maybe check if its a bad response...?
		//or lolids...?
		/*
		//lolexample:
		{
			'id': '5',
			'content': {'somekey': 'someValue', desu: 3, id: '5'} ,
			'status': 'ok'
		}

		*/
		self.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "responseFunc; response:");
		self.debugFilter.debugDumpObject(atb.debug.DebugFilter.CAT_TRACE, response);
		self.debugFilter.debugNewline(atb.debug.DebugFilter.CAT_TRACE);
		//this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, 
		//, "&nbsp;");//lolhack!
		
		responses.push({
			id: lastQuery,
			response: response
		});
			//query: lresponse);
		incrementalFunc();
	};
	
	incrementalFunc();
	//this.resourceMetaDataURI(resourceID);
    //handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    //jQuery.getJSON(uri, handler);
	//jQuery.getJSON(uri, callback);
};

atb.WebService.prototype.computeTimestamp = function()
{
	//TODO: take into account local dt since last known server time, and add the local dt to the last known server time
	//	(probably NOT worrying about the case where the user happens to change the time locally...? or do we just use the modify time on the server side only...????)
	//gah...oi!
	
	//lol...we *REALLY* need to use a monotonic time system here... time jumping backwards or too far forwards could really be bad for modifcation comparisons...???
	//lolwaslastmodified in the future check maybe...???
	return new Date();//HACK
};

atb.WebService.prototype.old_withBatchMarkerRequests = function(data, callback)
{	//hack until i can merge stuff properly later...!
	debugViewObject(data, "ws_batch");
	
	var fakeResponse = {
		"status": "OK"
	};
	window.setTimeout(function()
	{
		callback(fakeResponse);
	},10);//hack
};

atb.WebService.prototype.resourceJpgURI = function (resourceId, opt_width_height, opt_crop_only) {
	var uri = this.mediaURI + 'resource/' + resourceId + '.jpg?';
	if (opt_width_height) {
		uri += 'wh=' + opt_width_height[0] + ',' + opt_width_height[1] + '&';
	}
	if (opt_crop_only) {
		uri += 'crop_only=' + opt_crop_only + '&';
	}
	return uri.substring(0, uri.length-1);
};

