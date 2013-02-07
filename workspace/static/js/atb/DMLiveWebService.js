goog.provide('atb.DMLiveWebService');

goog.require('atb.WebService');

/** @deprecated */
atb.DMLiveWebService = function(rootURI, opt_sameOriginRootURI) {
    atb.WebService.call(this, rootURI);
    if (opt_sameOriginRootURI) {
        this.sameOriginRootURI = opt_sameOriginRootURI;
    } else {
        this.sameOriginRootURI = null;
    }
};
goog.inherits(atb.DMLiveWebService, atb.WebService);


atb.DMLiveWebService.prototype.getCssRoot = function () {
    return 'http://ada.drew.edu/anno/css/'
};



atb.DMLiveWebService.prototype.getAutoCompleteUri = function () {
    var uri = this.sameOriginRootURI + "autocomplete.json";
    return uri;
};



atb.DMLiveWebService.prototype.resourceMetaDataURI = function(resourceID) {
    var uri = this.rootURI + "resource/" + resourceID + ".json" + 
        "?callback=?"; 
    return uri;
};


atb.DMLiveWebService.prototype.resourceImageURI = function(
    resourceId, // not necessary, all resources (incl. images) have unique ids
    imageId, 
    size, 
    bounds
) {
    var uri = this.rootURI + "media/user_images/" + imageId + ".jpg";
    return uri;
};


atb.DMLiveWebService.prototype.popoutURI = function () {
    //return this.sameOriginRootURI + 'popout';
	return "popout.html";
};


atb.DMLiveWebService.prototype.uidURI = function() {
    return this.rootURI + "next_uid.json" + "?callback=?";
};


atb.DMLiveWebService.prototype.uidListURI = function(numIds) {
    return this.rootURI + "uid_list.json" 
        + "?num_ids=" + numIds 
        + "&callback=?";
};


atb.DMLiveWebService.prototype.batchMarkerRequestsURI_SameOrigin = function() {
    return "/batch_marker_requests/";
};


atb.DMLiveWebService.prototype.batchMarkerRequestsURI = function() {
     return this.rootURI + "batch_marker_requests/"; 
};

atb.DMLiveWebService.prototype.batchResourcesURI = function() {
     return this.rootURI + "batch_resources/"; 
};


atb.DMLiveWebService.prototype.batchResourcesURI_SameOrigin = function(resourceId) {
    return "/batch_resources/";
};


atb.DMLiveWebService.prototype.savedTextURI_SameOrigin = function(resourceId) {
    return "/resource/" + resourceId + ".json";
};


atb.DMLiveWebService.prototype.savedTextURI = function(resourceId) {
     return this.rootURI + "resource/" + resourceId + ".json"; 
};


atb.DMLiveWebService.prototype.savedAnnoURI_SameOrigin = function(resourceId) {
    return "/resource/" + resourceId + ".json";
};


atb.DMLiveWebService.prototype.savedAnnoURI = function(resourceId) {
     return this.rootURI + "resource/" + resourceId + ".json"; 
};


atb.DMLiveWebService.prototype.textURI = function (resourceId) {
    return this.rootURI + "resource/" + resourceId + ".json" +
        "?callback=?"; 
};

atb.DMLiveWebService.prototype.withTextURI = function (resourceId) {
    var uri = this.rootURI + "resource/" + resourceID + ".json" +
        "?callback=?"; 
};



atb.DMLiveWebService.prototype.withUid = function (
    handler, 
    opt_handlerScope
){
    var uri = this.uidURI();
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.DMLiveWebService.prototype.withUidList = function(
    numIds, 
    handler,
    opt_handlerScope
) {
    var uri = this.uidListURI(numIds);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.DMLiveWebService.prototype.withBatchMarkerRequests = function(
    canvasId,
    batchRequests,
    handler,
    opt_handlerScope
) {
    var sameOriginURI = this.batchMarkerRequestsURI_SameOrigin();
    var wsURI = this.batchMarkerRequestsURI();   
    var data = {
        'wsURI': wsURI,
        'canvasId': canvasId,
        'batchRequests': JSON.stringify(batchRequests)
    };
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.post(sameOriginURI, data, handler);
};

atb.DMLiveWebService.prototype.withBatchResources = function(
    ids,
    handler,
    opt_handlerScope,
    opt_params
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
    //console.log("withBatchResources: " + data.batchRequests);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.post(sameOriginURI, data, handler)
};

atb.DMLiveWebService.prototype.withBatchDelete = function (ids, handler, opt_handlerScope, opt_params) {
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


atb.DMLiveWebService.prototype.withSavedAnno = function(
    resourceId,
    annoJSON, 
    handler, 
    opt_handlerScope
) {
    //console.log("called withSavedAnno");
    var sameOriginURI = this.savedAnnoURI_SameOrigin(resourceId);
    var wsURI = this.savedAnnoURI(resourceId);
    //console.log("got past uris");
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    //console.log("got past handler");
    var putData = {
        'wsURI': wsURI,
        'resource': annoJSON
    };
    //console.log("stringify(annoJSON): " + JSON.stringify(annoJSON));
    jQuery.ajax({
        url: sameOriginURI,
        type: 'PUT',
        data: JSON.stringify(putData),
        success: handler
    });
};    


atb.DMLiveWebService.prototype.resourceUri = function(
    resourceId, 
    opt_addCallback
) {
    var uri = this.rootURI + "resource/" + resourceId + ".json";
    if (opt_addCallback) {
        uri += "?callback=?"; 
    }
    return uri;
};


atb.DMLiveWebService.prototype.resourceUri_SameOrigin = function(
    resourceId,
    opt_addCallback
) {
    var uri = "/resource/" + resourceId + ".json";
    if (opt_addCallback) {
        uri += "?callback=?"; 
    }
    return uri;
};


atb.DMLiveWebService.prototype.withResource = function(
    resourceId,
    handler,
    opt_handlerScope
){
    var uri = this.resourceUri(resourceId, true);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.DMLiveWebService.prototype.withDeletedResource = function(
    resourceId,
    handler,
    opt_handlerScope
) {
    var sameOriginUri = this.resourceUri_SameOrigin(resourceId);
    var wsUri = this.resourceUri(resourceId);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    var requestData = {
        'wsURI': wsUri
    };
    jQuery.ajax({
        url: sameOriginUri,
        type: 'DELETE',
        data: JSON.stringify(requestData),
        success: handler
    });
};    



atb.DMLiveWebService.prototype.withSavedText = function
(
    resourceId, 
    title, 
    content,
    purpose,	//Fixed parameter order, using order used in passthruloginwebservice.js.
    handler, 
    opt_handlerScope
) {
    var sameOriginURI = this.savedTextURI_SameOrigin(resourceId);
    var wsURI = this.savedTextURI(resourceId);   
    var resource = {
        'id': resourceId,
        'type': atb.WebService.TEXT_RESOURCE,
        'text' : {  
            'id': resourceId,
            'title': title,
            'content': content,
            'purpose': purpose
        }
    };
    var putData = {
        'wsURI': wsURI,
        'resource': resource
    };
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.ajax({
        url: sameOriginURI,
        type: 'PUT',
        data: JSON.stringify(putData),
        success: handler
    });
//    jQuery.post(sameOriginURI, data, handler);
};


atb.DMLiveWebService.prototype.withSearchResults = function(
    query,
    handler,
    opt_handlerScope
) {
    var uri = this.searchUri(query);
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    jQuery.getJSON(uri, handler);
};


atb.DMLiveWebService.prototype.numTargetsBodiesUri = function (resourceId) {
	return this.rootURI + 'num_targets_bodies/' + resourceId + '.json' +
        "?callback=?"; 
};


atb.DMLiveWebService.prototype.targetsUri = function (resourceId) {
	return this.rootURI + 'targets/' + resourceId + '.json' +
        "?callback=?"; 
};


atb.DMLiveWebService.prototype.bodiesUri = function (resourceId) {
	return this.rootURI + 'bodies/' + resourceId + '.json' +
        "?callback=?"; 
};


atb.DMLiveWebService.prototype.searchUri = function (query) {
	return this.rootURI + 'search.json?' +
        "q=" + query +
        "&callback=?"; 
};


atb.DMLiveWebService.prototype.autoCompleteUri = function (query) {
    return this.rootURI + 'autocomplete.json?' +
        "token=" + query +
        "&callback=?"; 
};







