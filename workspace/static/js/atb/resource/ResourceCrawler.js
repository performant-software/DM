goog.provide('atb.resource.ResourceCrawler');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');

goog.require('atb.Util');

atb.resource.ResourceCrawler = function (clientApp) {
    this.clientApp = clientApp;
    this.webService = clientApp.getWebService();
    
    this.cache = new goog.structs.Map();
    this.idsRequested = new goog.structs.Set();
    this.lastUpdatedTimesById = new goog.structs.Map();
    
    this.numCompletedRequests = 0;
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    goog.events.listen(eventDispatcher, atb.events.ResourceModified.EVENT_TYPE, this.resourceModifiedHandler, false, this);
};

/**
 * Arbitrary crawling limit to prevent runaway crawling
 */
atb.resource.ResourceCrawler.MAX_CRAWLS = 4;

atb.resource.ResourceCrawler.prototype.canCrawlAgain = function () {
    return this.numCompletedRequests <= atb.resource.ResourceCrawler.MAX_CRAWLS;
};

atb.resource.ResourceCrawler.prototype.resourceModifiedHandler = function (event) {
    var resource = event.getResource();
    var id = event.uri;
    
    if (resource) {
        this.addToCache(resource);
    }
    
    this.crawl([id]);
};

atb.resource.ResourceCrawler.prototype.addToCache = function (resource, opt_downloadTime) {
    var time = opt_downloadTime || goog.now();
    
    if (! (resource && resource.id)) {
        return;
    }
    
    this.cache.set(this.getId(resource), resource);
    this.lastUpdatedTimesById.set(this.getId(resource), time);
    
};

atb.resource.ResourceCrawler.prototype.addIdsToRequested = function (ids) {
    this.idsRequested.addAll(ids);
};

atb.resource.ResourceCrawler.prototype.getResource = function (id) {
    return this.cache.get(id);
};

atb.resource.ResourceCrawler.prototype.getResources = function (ids) {
    var resources = [];
    
    for (var i=0, len=ids.length; i<len; i++) {
        var id = ids[i];
        
        var resource = this.getResource(id);
        
        if (resource) {
            resources.push(resource);
        }
    }
    
    return resources;
};

atb.resource.ResourceCrawler.prototype.withResource =
function (id, handler, opt_handlerScope, opt_errorHandler, opt_alwaysAsync,
          opt_forceRefresh) {
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    var params = {};
    params.min_formatting = true;
    params.summary_only = 200;
    
    var onResourcesLoaded = function (resources, primary) {
        this.numCompletedRequests++;
        this.addWSResponseHashToCache(resources);
        
        handler(this.getResource(id));
    };
    
    if (!opt_forceRefresh && this.isInCache(id)) {
        if (opt_alwaysAsync) {
            window.setTimeout(atb.Util.scopeAsyncHandler(function () {
                                                         handler(this.getResource(id));
                                                         }, this), 1);
        }
        else {
            handler(this.getResource(id));
        }
    }
    else {
        this.addIdsToRequested([id]);
        
        this.webService.withBatchResources([id], 
                              onResourcesLoaded, 
                              this, 
                              params, 
                              opt_errorHandler
                              );
    }
};

atb.resource.ResourceCrawler.prototype.isInCache = function (id) {
    return this.cache.containsKey(id);
};

atb.resource.ResourceCrawler.prototype.hasBeenRequested = function (id) {
    return this.idsRequested.contains(id);
};

atb.resource.ResourceCrawler.prototype.getAllResources = function () {
    return this.cache.getValues();
};

atb.resource.ResourceCrawler.prototype.getAllIds = function () {
    return this.cache.getKeys();
};

atb.resource.ResourceCrawler.prototype.addWSResponseHashToCache = function (data) {
    var time = goog.now();
    
    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            var resource = data[id];
            
            this.addToCache(resource, time);
        }
    }
};

atb.resource.ResourceCrawler.prototype.clearCache = function () {
    this.cache.clear();
};

atb.resource.ResourceCrawler.prototype.getId = function (resource) {
    return resource.getId();
};

atb.resource.ResourceCrawler.prototype.getIds = function (resources) {
    var ids = [];
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        ids.push(this.getId(resource));
    }
    
    return ids;
};

atb.resource.ResourceCrawler.prototype.crawl = function (
    ids, 
    opt_queryText, 
    opt_doAfter, 
    opt_scope, 
    opt_originalContext, 
    opt_errorHandler
) {
    //Note(tandres): This should eventually be made so that if a resource has not been modified on the server side, it is not re-downloaded
    
    if (opt_originalContext) {
        this.contextId = opt_originalContext;
    }
    
    if (!goog.isArrayLike(ids)) {
        ids = [ids];
    }
    
    var ws = this.webService;
    
    var params = {};
    params.min_formatting = true;
    params.summary_only = 200;
    if (opt_queryText) {
        params.q = opt_queryText;
    }
    
    this.addIdsToRequested(ids);
    
    ws.withBatchResources(
        ids, 
        function (resources, primary) {
            this.numCompletedRequests++;
            this.addWSResponseHashToCache(resources);
            if (opt_doAfter) {
                opt_doAfter.call(opt_scope || window, primary);
            }
        }, 
        this, 
        params, 
        opt_errorHandler
    );

/*            
            var moreIds = this.calculateMoreIdsToRequest();
            if (moreIds.length > 0 && this.canCrawlAgain()) {
                this.crawl(moreIds, opt_queryText, opt_doAfter, opt_scope, opt_originalContext);
            } else {
                if (opt_doAfter) {
                    //                opt_doAfter.call(opt_scope || window, this.getTopLevelResourceIds(opt_originalContext));
                    opt_doAfter.call(opt_scope || window, primary);
                }
            }
*/
};

atb.resource.ResourceCrawler.prototype.crawlForCanvas = function (canvasId, opt_doAfter, opt_scope, opt_errorHandler) {
    this.clearCache();
    
    var ws = this.webService;
    
    var requestMarkers = function (markerIds) {
        markerIds = this.removeDuplicateIds(markerIds);
        
        if (markerIds.length > 0 ) {
            ws.withBatchResources(markerIds, function (resources) {
                this.addWSResponseHashToCache(resources);

                if (opt_doAfter) {
                    var markersOnCanvas = this.getMarkersByCanvasId(this.getAllMarkers())[canvasId];
                    if (markersOnCanvas == null) {
                        markersOnCanvas = [];
                    }
                                  
                    opt_doAfter.call(opt_scope || window, markersOnCanvas);
                }
                
                this.crawl(markerIds);
            }, this);
        }
        else {
            if (opt_doAfter) {
                var markersOnCanvas = this.getMarkersByCanvasId(this.getAllMarkers())[canvasId];
                if (markersOnCanvas == null) {
                    markersOnCanvas = [];
                }
                
                opt_doAfter.call(opt_scope || window, markersOnCanvas);
            }
        }
    }
    
    ws.withBatchResources(
        [canvasId], 
        function (response) {
            this.addWSResponseHashToCache(response);

            var markerIds = this.getResource(canvasId).getMarkerIds();
            
            requestMarkers.call(this, markerIds);
        }, 
        this, opt_errorHandler
    );
};

atb.resource.ResourceCrawler.prototype.getAllMarkers = function () {
    var markers = [];
    
    var allResources = this.getAllResources();
    
    for (var i=0, len=allResources.length; i<len; i++) {
        var resource = allResources[i];
        
        if (resource.getType() == 'marker') {
            markers.push(resource);
        }
    }
    
    return markers;
};

atb.resource.ResourceCrawler.prototype.calculateMoreIdsToRequest = function () {
    var ids = [];
    var values = this.getAllResources();
    
    for (var i=0, len=values.length; i<len; i++) {
        var resource = values[i];
        
        var idsForResource = this.getAllIdsForResource(resource);
        ids = ids.concat(idsForResource);
    }
    
    ids = this.removeDuplicateIds(ids);
    
    return ids;
};

atb.resource.ResourceCrawler.prototype.isContextIdIfSpecified = function (id) {
    if (this.contextId != null) {
        return id == this.contextId;
    }
    else {
        return true;
    }
};

atb.resource.ResourceCrawler.prototype.isContextId = function (id) {
    return id == this.contextId;
};

atb.resource.ResourceCrawler.prototype.getAllIdsForResource = function (resource, opt_queryText) {
    var ids = [];
    
    var resourceId = this.getId(resource);
    var resourceType = resource.getType();
    
    var addAllToGetList = function (idsToAdd) {
        ids = ids.concat(idsToAdd);
    };
    
    if (resourceType == 'anno') {
        addAllToGetList(resource.getChildIds());
    } else if (resourceType == 'marker') {
        ids.push(resource.getCanvasId());
        if (this.isContextIdIfSpecified(resourceId)) {
            addAllToGetList(resource.getAnnoIds());
        }
    } else if (resourceType == 'textHighlight') {
        ids.push(resource.getTextId());
        if (! opt_queryText && (this.isContextIdIfSpecified(resource.getTextId()) || this.isContextIdIfSpecified(resourceId))) {
            addAllToGetList(resource.getAnnoIds());
        }
    } else if (resourceType == 'text') {
        ids.push(resourceId);
        if (this.isContextIdIfSpecified(resourceId)) {
            addAllToGetList(resource.getAnnoIds());
//            if (! opt_queryText)
//                addAllToGetList(resource.getHighlightIds());
        }
    } else if (resourceType == 'canvas') {
        ids.push(resourceId);
        if (this.isContextIdIfSpecified(resourceId)) {
            if (! opt_queryText) {
                addAllToGetList(resource.getAnnoIds());
                addAllToGetList(resource.getMarkerIds());
            }
        }
    } else if (resourceType == 'user') {
        addAllToGetList(resource.getCanvasIds());
        addAllToGetList(resource.getTextIds());
    }
    
    return ids;
};

atb.resource.ResourceCrawler.prototype.removeDuplicateIds = function (ids) {
    var cleanedIds = [];
    
    for (var i=0, len=ids.length; i<len; i++) {
        var id = ids[i];
        
        if (! this.hasBeenRequested(id) && ! this.isInCache(id)) {
            cleanedIds.push(id);
        }
    }
    
    return cleanedIds;
};

atb.resource.ResourceCrawler.prototype.getResourceParentId = function (resource) {
    var resourceType = resource.getType();
    
    if (resourceType == 'marker') {
        return resource.getCanvasId();
    }
    else if (resourceType == 'textHighlight') {
        return resource.getTextId();
    }
    else {
        return this.getId(resource);
    }
};

atb.resource.ResourceCrawler.prototype.getAllResourceParentIds = function () {
    var resources = this.getAllResources();
    var parentIds = new goog.structs.Set();
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        parentIds.add(this.getResourceParentId(resource));
    }
    
    return parentIds.getValues();
};

atb.resource.ResourceCrawler.prototype.getAllAnnos = function () {
    var resources = this.getAllResources();
    
    var annos = [];
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        if (resource.getType() == 'anno') {
            annos.push(resource);
        }
    }
    
    return annos;
};

atb.resource.ResourceCrawler.prototype.getAllIdsInAnnos = function (annos) {
    var idsInAnnos = [];
    
    for (var i=0, len=annos.length; i<len; i++) {
        var anno = annos[i];
        
        idsInAnnos = idsInAnnos.concat(anno.getChildIds());
    }
    
    return idsInAnnos;
};

atb.resource.ResourceCrawler.prototype.getAllIdsNotInAnnos = function (annos, opt_allIds) {
    var allIds = opt_allIds || this.getAllIds();
    var idsNotInAnnos = [];
    
    var idsInAnnos = new goog.structs.Set(this.getAllIdsInAnnos(annos));
    
    for (var i=0, len=allIds.length; i<len; i++) {
        var id = allIds[i];
        
        if (! idsInAnnos.contains(id)) {
            idsNotInAnnos.push(id);
        }
    }
    
    return idsNotInAnnos;
};

atb.resource.ResourceCrawler.prototype.getAllIdsNotInAnnoBodies = function (annos, opt_allIds) {
    var allIds = opt_allIds || this.getallIds();
    var idsNotInAnnos = [];
    
    var idsNotInAnnoBodies = new goog.structs.Set(allIds);
    
    var allAnnos = this.getAllAnnos();
    
    for (var i=0, len=allAnnos.length; i<len; i++) {
        var anno = allAnnos[i];
        var bodies = anno.getBodyIds();
        
        for (var j=0, lenj=bodies.length; j<lenj; j++) {
            var bodyId = bodies[j];
            
            var found = idsNotInAnnoBodies.remove(bodyId);
        }
    }
    
    return idsNotInAnnoBodies.getValues();
};

atb.resource.ResourceCrawler.prototype.removeAllIdsNotRelatedTo = function (contextId, ids) {
    var cleanedIds = [];
    
    for (var i=0, len=ids.length; i<len; i++) {
        var id = ids[i];
        var resource = this.getResource(id);
        
        if (resource.getType() == 'anno') {
            cleanedIds.push(id);
        }
        else if (this.getResourceParentId(resource) == contextId) {
            cleanedIds.push(id);
        }
    }
    
    return cleanedIds;
};

atb.resource.ResourceCrawler.prototype.getAllMarkerIds = function () {
    var markerIds = [];
    
    var allResources = this.getAllResources();
    for (var i=0, len=allResources.length; i<len; i++) {
        var resource = allResources[i];
        
        if (resource.getType() == 'marker') {
            markerIds.push(this.getId(resource));
        }
    }
    
    return markerIds;
};

atb.resource.ResourceCrawler.prototype.getTopLevelResourceIds = function (opt_contextId) {
    var topLevelIds = [];
    
    var allAnnos = this.getAllAnnos();
    var idsNotInAnnos = this.getAllIdsNotInAnnos(allAnnos);
    
    if (opt_contextId) {
        idsNotInAnnos = this.removeAllIdsNotRelatedTo(opt_contextId, idsNotInAnnos);
    }
    
    topLevelIds = topLevelIds.concat(idsNotInAnnos);
    
    var topLevelIdsSet = new goog.structs.Set(topLevelIds);
    topLevelIdsSet.addAll(this.getAllMarkerIds());
    
    return topLevelIdsSet.getValues();
};

atb.resource.ResourceCrawler.prototype.getTopLevelResourceIdsByType = function () {
    var topLevelIds = this.getTopLevelResourceIds();
    var result = {
        'markers': [],
        'annos': [],
        'others': []
    };
    
    for (var i=0, len=topLevelIds.length; i<len; i++) {
        var resource = this.getResource(topLevelIds[i]);
        
        if (resource.getType() == 'marker' || resource.getType() == 'textHighlight') {
            result.markers.push(this.getId(resource));
        }
        else if (resource.getType() == 'anno') {
            result.annos.push(this.getId(resource));
        }
        else {
            result.annos.push(this.getId(resource));
        }
    }
    
    return result;
};

atb.resource.ResourceCrawler.prototype.crawlForSearch = function (ids, queryText, opt_handler, opt_scope, opt_errorHandler) {
    var ws = this.webService;
    
    var params = {};
    params.min_formatting = true;
    params.summary_only = 200;
    params.q = queryText;
    
    var callHandler = atb.Util.scopeAsyncHandler(
        function (resources, primary) {
            if (opt_handler) {
                //            opt_handler.call(opt_scope || window, this.getTopLevelSearchIds(ids));
                console.log("crawlForSearch: primary: ", primary); 
                opt_handler.call(opt_scope || window, primary);
            }
        }, 
        this
    );
    
    this.addIdsToRequested(ids);
    
    ws.withBatchResources(
        ids, 
        function (resources, primary) { // Get the resources returned by the search
            this.numCompletedRequests ++;
            this.addWSResponseHashToCache(resources);
            
            var moreIds = this.calculateMoreIdsToRequest();
            
            if (moreIds.length > 0 && this.canCrawlAgain()) {
                this.addIdsToRequested(moreIds);
                ws.withBatchResources(
                    moreIds, 
                    function (resources, primary) { // Get the annos on those resources
                        this.numCompletedRequests ++;
                        this.addWSResponseHashToCache(resources);
                        
                        var annoIds = this.getAnnosReferencingMultipleIds(ids);
                        var idsInAnnos = this.getAllIdsInAnnos(this.getResources(annoIds));
                        
                        if (idsInAnnos.length > 0 && this.canCrawlAgain()) {
                            this.addIdsToRequested(idsInAnnos);
                            ws.withBatchResources(
                                idsInAnnos, 
                                function (resources, primary) { 
                                    // Get other resources in annos related to this search
                                    this.numCompletedRequests ++;
                                    this.addWSResponseHashToCache(resources);
                                    
                                    var parentIds = this.removeDuplicateIds(this.getAllResourceParentIds());
                                    
                                    if (parentIds.length > 0 && this.canCrawlAgain()) {
                                        this.addIdsToRequested(parentIds);
                                        ws.withBatchResources(
                                            parentIds, 
                                            function (resources, primary) { 
                                                // Get the parent ids of all resources found
                                                this.numCompletedRequests ++;
                                                this.addWSResponseHashToCache(resources);
                                                
                                                callHandler(resources, primary);
                                            }, 
                                            this, 
                                            params, 
                                            opt_errorHandler);
                                    }
                                    else {
                                        callHandler(resources, primary);
                                    }
                                }, 
                                this, 
                                params, 
                                opt_errorHandler
                            );
                        } else {
                            callHandler(resources, primary);
                        }
                    }, 
                    this, 
                    params, 
                    opt_errorHandler
                );
            } else {
                callHandler(resources, primary);
            }
        }, 
        this, 
        params, 
        opt_errorHandler
    );
};

atb.resource.ResourceCrawler.prototype.getAnnosReferencingMultipleIds = function (ids, opt_annos) {
    var annos = opt_annos || this.getAllAnnos();
    var idsSet = new goog.structs.Set(ids);
    var selectedIds = new goog.structs.Set();
    
    for (var i=0, leni=annos.length; i<leni; i++) {
        var anno = annos[i];
        
        var bodiesAndTargets = this.getAllIdsInAnnos([anno]);
        
        var numRefs = 0;
        
        for (var j=0, lenj=bodiesAndTargets.length; j<lenj; j++) {
            var id = bodiesAndTargets[j];
            
            if (idsSet.contains(id)) {
                numRefs ++;
            }
        }
        
        if (numRefs > 1) {
            selectedIds.add(this.getId(anno));
        }
    }
    
    return selectedIds.getValues();
};

atb.resource.ResourceCrawler.prototype.getTopLevelSearchIds = function (originalSearchIds) {
    var topLevelIds = new goog.structs.Set(originalSearchIds);
    
    var originalResourceIdsSet = new goog.structs.Set(originalSearchIds);
    
    var annosReferencingIds = this.getAnnosReferencingMultipleIds(originalSearchIds);
    
    topLevelIds.addAll(annosReferencingIds);
    var otherResourceIds = this.getAllIdsNotInAnnoBodies(this.getResources(annosReferencingIds), originalSearchIds);
    
    topLevelIds.addAll(otherResourceIds);
    
    return topLevelIds.getValues();
};

atb.resource.ResourceCrawler.prototype.getMarkersByCanvasId = function (markers) {
    var markersByCanvasId = {};
    
    for (var i=0, len=markers.length; i<len; i++) {
        var marker = markers[i];
        
        var canvasId = marker.getCanvasId();
        
        if (markersByCanvasId[canvasId]) {
            markersByCanvasId[canvasId].push(marker);
        }
        else {
            markersByCanvasId[canvasId] = [marker];
        }
    }
    
    return markersByCanvasId;
};

atb.resource.ResourceCrawler.prototype.getTopLevelAnnoTitleIds = function (resourceId) {
    var resource = this.getResource(resourceId);
    
    var bodyIdsSet = new goog.structs.Set();
    var targetIdsSet = new goog.structs.Set();
    
    var annoIds = resource.getAnnoIds();
    
    //Temporary - to make anno titles list like finder results
    var childIds = resource.getChildIds();
    for (var i=0; i<childIds.length; i++) {
        var childResource = this.getResource(childIds[i]);
        
        if (childResource) {
            annoIds = annoIds.concat(childResource.getAnnoIds());
        }
    }
    
    for (var i=0, len=annoIds.length; i<len; i++) {
        var anno = this.getResource(annoIds[i]);
        
        var resourceIsBodyOfAnno = goog.array.contains(anno.getBodyIds(), resourceId);
        
        if (anno.getType() == atb.resource.AnnotationResource.type) {
            var targets = this.getResources(anno.getTargetIds());
            var bodies = this.getResources(anno.getBodyIds());
            
            // If this resource is the body of the annotation
            if (goog.array.contains(anno.getBodyIds(), resourceId)) {
                for (var j=0; j<targets.length; j++) {
                    var target = targets[j];
                    
                    if (target.getType() == 'marker') {
                        if (resourceIsBodyOfAnno) {
                            targetIdsSet.add(target.getId());
                        }
                    }
                    else {
                        targetIdsSet.add(target.getId());
                    }
                }
            }
            
            // If this resource is the target of the annotation
            if (goog.array.contains(anno.getTargetIds(), resourceId)) {
                for (var j=0; j<bodies.length; j++) {
                    var body = bodies[j];
                    
                    bodyIdsSet.add(body.getId());
                }
            }
        }
    }
    
    return {
        bodies: bodyIdsSet.getValues(),
        targets: targetIdsSet.getValues()
    };
};