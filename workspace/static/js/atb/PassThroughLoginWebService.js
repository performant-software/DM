goog.provide('atb.PassThroughLoginWebService');

goog.require('atb.WebService');
goog.require('atb.resource.ResourceFactory');
goog.require('goog.Uri');
goog.require('goog.string');


atb.PassThroughLoginWebService = function(
    rootUri, 
    mediaUri,
    sameOriginRootUri,
    username
) {
    atb.WebService.call(this, rootUri, mediaUri);
    this.sameOriginRootUri = sameOriginRootUri;
    this.username = username;
};
goog.inherits(atb.PassThroughLoginWebService, atb.WebService);

atb.PassThroughLoginWebService.prototype.setClientApp = function (clientApp) {
    this.clientApp = clientApp;
}

atb.PassThroughLoginWebService.prototype.addUsername = function(uri) {
    uri.setParameterValue('username', this.username);
    return uri;
};


atb.PassThroughLoginWebService.prototype.addCallback = function(uri) {
    uri.setParameterValue('callback', "?");
    return uri;
};


atb.PassThroughLoginWebService.prototype.decodedUri = function(uri) {
    return goog.string.urlDecode(uri.toString());
}


atb.PassThroughLoginWebService.prototype.getAutoCompleteUri = function () {
    var uri = new goog.Uri(this.sameOriginRootUri + "autocomplete.json");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.resourceMetaDataURI = function(
    resourceID
) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceID + ".json");
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};

atb.PassThroughLoginWebService.prototype.resourceIdToUri = function(id) {
    if (goog.isNumber(id) || /^\d+$/.test(id)) {
        return this.rootURI + 'resource/' + id;
    }
    else {
        return id;
    }
};

atb.PassThroughLoginWebService.prototype.resourceUriToId = function(uri) {
    var databroker = this.clientApp.databroker;
    var equivalentUris = databroker.getEquivalentUris(uri);
    
    var idPrefix = this.rootURI + 'resource/';
    
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];
        
        var startIndex = equivalentUri.indexOf(idPrefix);
        
        if (startIndex != -1) {
            var endIndex = startIndex + idPrefix.length;
            
            return uri.substring(endIndex);
        }
    }
    
    return null;
};


atb.PassThroughLoginWebService.prototype.resourceImageURI = function(
    resourceId, // not necessary, all resources (incl. images) have unique ids
    imageId, 
    size, 
    bounds
) {
    var uri = new goog.Uri(this.mediaURI + "media/user_images/" + imageId + 
                           ".jpg");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.popoutURI = function () {
    var uri = new goog.Uri(this.sameOriginRootUri + 'popout');
	//var uri = new goog.Uri("popout.html");//HACK
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.uidURI = function() {
    var uri = new goog.Uri(this.rootURI + "next_uid.json");
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.uidListURI = function(numIds) {
    var uri = new goog.Uri(this.rootURI + "uid_list.json");
    uri.setParameterValue('num_ids', numIds);
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.batchMarkerRequestsURI_SameOrigin = function() {
    var uri = new goog.Uri(this.sameOriginRootUri + "batch_marker_requests/");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.batchMarkerRequestsURI = function() {
    var uri = new goog.Uri(this.rootURI + "batch_marker_requests/");
    this.addUsername(uri);
    return this.decodedUri(uri); 
};

atb.PassThroughLoginWebService.prototype.batchResourcesURI = function() {
    var uri = new goog.Uri(this.rootURI + "batch_resources/");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.batchResourcesURI_SameOrigin = function(resourceId) {
    var uri = new goog.Uri(this.sameOriginRootUri + "batch_resources/");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.savedResourceURI_SameOrigin = function(
    resourceId
) {
    var uri = new goog.Uri(this.sameOriginRootUri + "resource/" + resourceId + ".json");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.savedResourceURI = function(resourceId) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceId + ".json");
    this.addUsername(uri);
    return this.decodedUri(uri); 
};


atb.PassThroughLoginWebService.prototype.savedAnnoURI_SameOrigin = function(
    resourceId
) {
    var uri = new goog.Uri(this.sameOriginRootUri + "resource/" + resourceId + ".json");
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.savedAnnoURI = function(resourceId) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceId + ".json");
    this.addUsername(uri);
    return this.decodedUri(uri); 
};


atb.PassThroughLoginWebService.prototype.textURI = function (resourceId) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceId + ".json");
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.withTextURI = function (resourceId) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceID + ".json");
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.resourceUri = function(
    resourceId, 
    opt_addCallback
) {
    var uri = new goog.Uri(this.rootURI + "resource/" + resourceId + ".json");
    if (opt_addCallback) {
        this.addCallback(uri);
    }
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.resourceUri_SameOrigin = function(
    resourceId,
    opt_addCallback
) {
    var uri = new goog.Uri(this.sameOriginRootUri + "resource/" + resourceId + ".json");
    if (opt_addCallback) {
        this.addCallback(uri)
    }
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.targetsUri = function (resourceId) {
	var uri = new goog.Uri(this.rootURI + 'targets/' + resourceId + '.json');
    this.addCallback(uri);
    this.addUsername(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.bodiesUri = function (resourceId) {
	var uri = new goog.Uri(this.rootURI + 'bodies/' + resourceId + '.json');
    this.addCallback(uri);
    this.addUsername(uri);
};


atb.PassThroughLoginWebService.prototype.searchUri = function (query) {
    var uri = new goog.Uri(this.rootURI + 'search.json/');
    this.addUsername(uri);
    this.addCallback(uri);
    uri.setParameterValue('q', query);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.autoCompleteUri = function (query) {
    var uri = new goog.Uri(this.rootURI + 'autocomplete.json');
    this.addCallback(uri);
    this.addUsername(uri);
    uri.setParameterValue('token', query);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.numTargetsBodiesUri = function (
    resourceId
) {
    var uri = new goog.Uri(this.rootURI + 'num_targets_bodies/' + resourceId + 
                           '.json');
    this.addCallback(uri);
    return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.resourceJpgURI = function (
    resourceId, 
    opt_width_height, 
    opt_crop_only
) {

	var uri = new goog.Uri(this.mediaURI + "resource/" + resourceId + ".jpg");
    this.addUsername(uri);
	if (opt_width_height) {
        uri.setParameterValue('wh', opt_width_height[0] + ',' + 
                              opt_width_height[1]);
	}
	if (opt_crop_only) {
        uri.setParameterValue('crop_only', opt_crop_only);
	}

	return this.decodedUri(uri);
};


atb.PassThroughLoginWebService.prototype.getCssRoot = function () {
    return 'http://ada.drew.edu/anno/css/'
};


atb.PassThroughLoginWebService.prototype.withUid = function (
    handler, 
    opt_handlerScope,
    opt_errorHandler
){
    var uri = this.uidURI();
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    jQuery.ajax({
        type: 'GET',
        url: uri,
        success: handler,
        dataType: 'json',
        error: opt_errorHandler
    });
};


atb.PassThroughLoginWebService.prototype.withUidList = function(
    numIds, 
    handler,
    opt_handlerScope,
    opt_errorHandler
) {
    var uri = this.uidListURI(numIds);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    jQuery.ajax({
        type: 'GET',
        url: uri,
        success: handler,
        dataType: 'json',
        error: opt_errorHandler
    });
};


atb.PassThroughLoginWebService.prototype.withBatchMarkerRequests = function(
    canvasId,
    batchRequests,
    handler,
    opt_handlerScope,
    opt_errorHandler
) {
    var sameOriginURI = this.batchMarkerRequestsURI_SameOrigin();
    var wsURI = this.batchMarkerRequestsURI();   
    var data = {
        'wsURI': wsURI,
        'canvasId': canvasId,
        'batchRequests': JSON.stringify(batchRequests)
    };
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    if (opt_errorHandler) {
        opt_errorHandler = atb.Util.scopeAsyncHandler(opt_errorHandler, opt_handlerScope);
    }
    
    jQuery.ajax({
        type: 'POST',
        url: sameOriginURI,
        data: data,
        success: handler,
        dataType: 'json',
        error: opt_errorHandler
    });
};

atb.PassThroughLoginWebService.prototype.withBatchResources = function(
    ids,
    handler,
    opt_handlerScope,
    opt_params,
    opt_errorHandler
) {
    var sameOriginURI = this.batchResourcesURI_SameOrigin();
    var wsURI = this.batchResourcesURI();
    var data = {
        'wsURI': wsURI,
        'batchRequests': []
    };
    
    for (var x in ids) {
        var request = {
            'request': 'GET',
            'id': ids[x]
        };
        
        if (opt_params) {
            request.params = opt_params;
        }
        
        data.batchRequests.push(request);
    }
    
    data.batchRequests = JSON.stringify(data.batchRequests);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    if (opt_errorHandler) {
        opt_errorHandler = atb.Util.scopeAsyncHandler(opt_errorHandler, opt_handlerScope);
    }
    
    var jsonHandler = function (response) {
        jsonMap = response.data;
        for (var id in jsonMap) {
            if (jsonMap.hasOwnProperty(id)) {
                var resource = atb.resource.ResourceFactory.createFromJSON(jsonMap[id]);
                
                jsonMap[id] = resource;
            }
        }
        
        handler(jsonMap, response.primary);
    };
    
    jQuery.ajax({
        type: 'POST',
        url: sameOriginURI,
        data: data,
        success: jsonHandler,
        dataType: 'json',
        error: opt_errorHandler
    });
};

atb.PassThroughLoginWebService.prototype.withBatchDelete = function (ids, handler, opt_handlerScope, opt_params) {
    var sameOriginURI = this.batchResourcesURI_SameOrigin();
    var wsURI = this.batchResourcesURI();
    var data = {
        'wsURI': wsURI,
        'batchRequests': []
    };
    
    for (var i in ids) {
        var request = {
            'request': 'DELETE',
            'id': ids[i]
        };
        
        if (opt_params) {
            request.params = opt_params;
        }
        
        data.batchRequests.push(request);
    }
    
    data.batchRequests = JSON.stringify(data.batchRequests);
    
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.post(sameOriginURI, data, handler);
};


atb.PassThroughLoginWebService.prototype.withSavedAnno = function(
    resourceId,
    annoJSON, 
    handler, 
    opt_handlerScope
) {
    var sameOriginURI = this.savedAnnoURI_SameOrigin(resourceId);
    var wsURI = this.savedAnnoURI(resourceId);
    
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    var putData = {
        'wsURI': wsURI,
        'resource': annoJSON
    };
    
    jQuery.ajax({
        url: sameOriginURI,
        type: 'PUT',
        data: JSON.stringify(putData),
        success: handler
    });
};    

/**
 * @param resourceId {string}
 * @param handler {Function(atb.resource.Resource)}
 * @param opt_handlerScope {Object}
 * @param opt_errorHandler {Function(jqXHR, string, Error)}
 */
atb.PassThroughLoginWebService.prototype.withResource = function(
    resourceId,
    handler,
    opt_handlerScope,
    opt_errorHandler
){
    var uri = this.resourceUri(resourceId, true);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    if (opt_errorHandler) {
        opt_errorHandler = atb.Util.scopeAsyncHandler(opt_errorHandler, opt_handlerScope);
    }
    
    var jsonHandler = function (json) {
        var resource = atb.resource.ResourceFactory.createFromJSON(json);
        
        handler(resource);
    };
    
    jQuery.ajax({
        url: uri,
        dataType: 'json',
        success: jsonHandler,
        error: opt_errorHandler
    });
};

atb.PassThroughLoginWebService.prototype.withSavedResource = function (resource, handler, opt_handlerScope, opt_errorHandler, opt_synchronous) {
    var sameOriginURI = this.savedResourceURI_SameOrigin(resource.getRemoteId());
    var wsURI = this.savedResourceURI(resource.getRemoteId());
    
    if (this.clientApp) {
        var eventDispatcher = this.clientApp.getEventDispatcher();
        var event = new atb.events.ResourceModified(resource.getRemoteId(), eventDispatcher, opt_handlerScope);
        eventDispatcher.dispatchEvent(event);
    }
    
    var json = atb.resource.ResourceFactory.serializeToJSON(resource);
    
    var putData = {
        'wsURI': wsURI,
        'resource': json
    };
    
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    var self = this;
    var internalHandler = function () {
        if (self.clientApp) {
            var eventDispatcher = self.clientApp.getEventDispatcher();
            var event = new atb.events.ResourceModified(resource.getRemoteId(), eventDispatcher, opt_handlerScope);
            eventDispatcher.dispatchEvent(event);
        }
        
        handler.apply(self, arguments);
    };
    
    if (opt_errorHandler) {
        opt_errorHandler = atb.Util.scopeAsyncHandler(opt_errorHandler, opt_handlerScope);
    }
    
    var async = true;
    if (opt_synchronous == true) {
        async = false;
    }
    
    jQuery.ajax({
        url: sameOriginURI,
        type: 'PUT',
        data: JSON.stringify(putData),
        success: internalHandler,
        error: opt_errorHandler,
        async: async
    });
};


atb.PassThroughLoginWebService.prototype.withDeletedResource = function(
    resourceId,
    handler,
    opt_handlerScope,
    opt_errorHandler
) {
    var sameOriginUri = this.resourceUri_SameOrigin(resourceId);
    var wsUri = this.resourceUri(resourceId);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    if (opt_errorHandler) {
        opt_errorHandler = atb.Util.scopeAsyncHandler(opt_errorHandler, opt_handlerScope);
    }
    var requestData = {
        'wsURI': wsUri
    };
    jQuery.ajax({
        url: sameOriginUri,
        type: 'DELETE',
        data: JSON.stringify(requestData),
        success: handler,
        error: opt_errorHandler
    });
};


atb.PassThroughLoginWebService.prototype.withSearchResults = function(
    query,
    handler,
    opt_handlerScope
) {
    var uri = this.searchUri(query);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.PassThroughLoginWebService.prototype.proxiedUri = function(
    uri
) {
    return uri;
};


atb.PassThroughLoginWebService.prototype.withProxiedData = function(
    uri,
    handler,
    opt_handlerScope,
    opt_errorHandler
) {
    uri = this.proxiedUri(uri);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    return jQuery.ajax({
                       type: 'GET',
                       url: uri,
                       success: handler,
                       error: opt_errorHandler
                       });
};








