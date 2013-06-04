goog.provide('atb.viewer.Finder');

goog.require('atb.viewer.ResourceListViewer');
goog.require('atb.util.StyleUtil');
goog.require('atb.util.ReferenceUtil');
goog.require('atb.widgets.DialogWidget');
goog.require('atb.resource.ResourceCollection');
goog.require('atb.resource.ResourceSummaryFactory');
goog.require('atb.resource.AnnotationSummary');
goog.require('atb.resource.MarkerAnnotationSummary');
goog.require('atb.resource.MarkerCollection');
goog.require('atb.ui.PopupWindow');
goog.require('atb.widgets.DialogWidget');
goog.require('atb.events.ResourceClick');

goog.require('goog.array');
goog.require('goog.events.KeyCodes');
goog.require('goog.ui.ToolbarToggleButton');
goog.require('goog.events.Event');

/**
 * @extends {atb.viewer.ResourceListViewer}
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * 
 * A viewer for opening and viewing resources as ResourceSummary objects
 * 
 * @param clientApp {atb.ClientApp}
 * @param opt_contextId {string=}
 */
atb.viewer.Finder = function (clientApp, opt_contextId, opt_contextType) {
    atb.viewer.ResourceListViewer.call(this, clientApp);
    
    this.viewerType = 'finder';
    
    this.contextId = opt_contextId;
    this.queryText = "";
    
    this.crawler = this.clientApp.getResourceCrawler();
    
    if (opt_contextType) {
        this.setContextType(opt_contextType);
    }
    
    this.setupEventHandlers();
};
goog.inherits(atb.viewer.Finder, atb.viewer.ResourceListViewer);

atb.viewer.Finder.VIEWER_TYPE = 'finder';

atb.viewer.Finder.prototype.setContextType = function (contextType) {
    this.contextType = contextType;
};

atb.viewer.Finder.prototype.getContextType = function () {
    return this.contextType;
};

/**
 * Loads summaries for the specified ids
 *
 * @param ids {string}
 * @param opt_queryText {string}
 */
atb.viewer.Finder.prototype.loadSummaries = function (ids, opt_queryText) {
    this.setLoading(true);
    
    this.lastIdsLoaded = ids;
    
    var withIds = function (ids) {
        var markers = [];
        var annosWithHighlightBodies = [];
        var otherResources = [];
        
        for (var i=0, len=ids.length; i<len; i++) {
            var resourceId = ids[i];
            
            if (! this.contextId || resourceId != this.contextId) {
                var resource = this.crawler.getResource(resourceId);
                
                if (resource != null) {
                    if (resource.getType() == 'marker') {
                        markers.push(resource);
                    }
                    else if (resource.getType() == 'anno') {
                        var body = this.crawler.getResource(resource.getBodyId());
                        
                        if (body && body.getType() == 'textHighlight') {
                            annosWithHighlightBodies.push(resource);
                        }
                        else {
                            otherResources.push(resource);
                        }
                    }
                    else {
                        otherResources.push(resource);
                    }
                }
            }
        }
        
        var contextResource = this.crawler.getResource(this.contextId);

        if (this.getContextType() == atb.viewer.Finder.ContextTypes.RESOURCE && 
            contextResource && contextResource.type == 'canvas' &&
            markers.length > 0) {
            var markersOnContext = this.crawler.getMarkersByCanvasId(markers)[this.contextId];
            
            if (markersOnContext) {
                var markerCollections = this.createMarkerCollections(markersOnContext);
                this.addResourceSummaries(markerCollections);
            }
        }
        
        var highlightAnnoSummaries = this.createHighlightAnnoSummaries(annosWithHighlightBodies);
        this.addResourceSummaries(highlightAnnoSummaries);
        
        var otherSummaries = this.createSummariesFromResources(otherResources);
        this.addResourceSummaries(otherSummaries);
        
        this.syncSelectedMarkersWithAppropriateViewer();
        
        this.setLoading(false);
        
        if (markers.length + otherSummaries.length + highlightAnnoSummaries.length < 1) {
            this.showEmptyMessage();
        }
        else if (otherSummaries.length == 1) {
            this.autoLoadResourceFromAnno();
        }
        
        
        //Begin dummy manuscript summary
//        var dummyData = {
//        id: 3,
//        type: 'manuscript',
//        manuscript: {
//        title: 'Manuscript Title',
//        pages: [
//                {id:4, number: 'i'}, {id:5, number: 'ii'}, {id:6, number:'iii'}, {id:7, number:'iv'}, {id:8, number:'v'},{id:4, number: '1'}, {id:5, number: '2'}, {id:6, number:'3'}, {id:7, number:'4'}, {id:8, number:'5'}, {id:4, number: '6'}, {id:5, number: '7'}, {id:6, number:'8'}, {id:7, number:'9'}, {id:8, number:'10'}, {id:4, number: '11'}, {id:5, number: '12'}, {id:6, number:'13'}, {id:7, number:'14'}, {id:8, number:'15'},{id:4, number: '16'}, {id:5, number: '17'}, {id:6, number:'18'}, {id:7, number:'19'}, {id:4, number: '20'}, {id:5, number: '21'}, {id:6, number:'22'}, {id:7, number:'23'}, {id:8, number:'24'}, {id:4, number: '25'}, {id:6, number:'26'}, {id:7, number:'27'}, {id:8, number:'28'}, {id:4, number: '29'}, {id:5, number: '30'}, {id:6, number:'31'}, {id:7, number:'32'}, {id:8, number:'33'}, {id:4, number: '34'}, {id:5, number: '35'}, {id:6, number:'36'}, {id:7, number:'37'}, {id:8, number:'38'}, {id:5, number: '39'}, {id:6, number:'40'}, {id:7, number:'41'}, {id:8, number:'42'},{id:7, number:'43'}, {id:8, number:'44'}, {id:5, number: '45'}, {id:6, number:'46'}, {id:7, number:'47'}, {id:8, number:'48'},{id:7, number:'49'}, {id:8, number:'50'}, {id:4, number: '51'}, {id:5, number: '52'}, {id:6, number:'53'}, {id:7, number:'54'}, {id:8, number:'55'}, {id:4, number: '56'}, {id:5, number: '57'}, {id:6, number:'58'}, {id:7, number:'59'}, {id:8, number:'60'}, {id:9, number:'61'}, {id:9, number:'62'}, {id:9, number:'63'}, {id:9, number:'64'}
//                ]
//        }
//        }
//        
//        var dummyResource = atb.resource.ResourceFactory.createFromJSON(dummyData);
//        
//        var summaries = this.createSummariesFromResource(dummyResource);
//        this.addResourceSummaries(summaries);
        //End dummy manuscript summary
    };
    

    if (this.getContextType() == atb.viewer.Finder.ContextTypes.SEARCH) {
        this.crawler.crawlForSearch(ids, this.queryText, withIds, this, atb.Util.scopeAsyncHandler(this.flashErrorIcon, this));
//        console.log("about to crawl search results");
//        var printIds = function(ids) { console.log("printIds: ", ids); };
//        this.crawler.crawl(ids, this.queryText, withIds, this, undefined, this.flashErrorIcon);
    } else {
        this.crawler.crawl(ids, this.queryText, withIds, this, this.contextId, atb.Util.scopeAsyncHandler(this.flashErrorIcon, this));
    }

};

atb.viewer.Finder.prototype.autoLoadResourceFromAnno = function () {
    var annos = this.crawler.getTopLevelResourceIdsByType()['annos'];
    annos = this.crawler.getAnnosReferencingMultipleIds([this.contextId]);
    
    if (annos.length == 1 && this.getContextType() == atb.viewer.Finder.ContextTypes.RESOURCE) {
        var anno = this.crawler.getResource(annos[0]);
        var targets = anno.getTargetIds();
        var body = anno.getBodyId();
        
        if (targets.length == 1 && targets[0] != this.contextId) {
            var summary = this.summariesById[targets[0]][0];
            
            try {
                this.handleResourceSummaryClick(summary);
            } catch (e) {}
        }
        else {
            var summary = this.summariesById[body][0];
            
            try {
                this.handleResourceSummaryClick(summary);
            } catch (e) {}
        }
    }
};

atb.viewer.Finder.prototype.showEmptyMessage = function () {
    var message;
    if (this.getContextType() == atb.viewer.Finder.ContextTypes.SEARCH) {
        message = 'no search results';
    }
    else {
        message = 'resource has no annotations';
    }
    this.showMessage(message);
};

/**
 * Sets whether this finder is loading summaries, also shows and hides loading spinner appropriately
 *
 * @param isLoading {boolean}
 */
atb.viewer.Finder.prototype.setLoading = function (isLoading) {
    if (isLoading) {
        this.loading = true;
        this.showLoadingSpinner();
    }
    else {
        this.loading = false;
        this.hideLoadingSpinner();
    }
};

/**
 * @return {boolean}
 */
atb.viewer.Finder.prototype.isLoading = function () {
    return this.loading;
};

/**
 * Creates summaries for a given resource object (in the case of an annotation, sometimes a list of multiple summaries)
 *
 * @param resource {Object}
 * @return {Array.<atb.resource.ResourceSummary>}
 */
atb.viewer.Finder.prototype.createSummariesFromResource = function (resource) {
    var summaries = [];
    
    if (resource.getType() == 'anno') {
        summaries = this.createAnnoSummariesFromResource_(resource);
    }
    else {
        var summary = atb.resource.ResourceSummaryFactory.createFromResource(
            resource,
            atb.Util.scopeAsyncHandler(this.handleResourceSummaryClick),
            this,
            this.clientApp,
            this.domHelper
        );
        summary.setDeletableResources([resource.id]);
        summary.setView(atb.resource.RESOURCE_VIEW);
        this.addToSummariesById_(summary);
        
        summaries.push(summary);
    }
    
    return summaries;
};

atb.viewer.Finder.prototype.createSummariesFromResources = function (resources) {
    var summaries = [];
    
    for (var i=0, len=resources.length; i<len; i++) {
        var resource = resources[i];
        
        summaries = summaries.concat(this.createSummariesFromResource(resource));
    }
    
    return summaries;
};

/**
 * Creates summaries for a given annotation object (hiding the body if it is this finder's context)
 *
 * @param resource {Object}
 * @return {Array.<atb.resource.ResourceSummary>}
 */
atb.viewer.Finder.prototype.createAnnoSummariesFromResource_ = function (resource) {
    return this.createAnnoSummariesFromResourceIds_(resource.getBodyId(), resource.getTargetIds(), [resource.getId()], resource.getTriplesByTarget());
};

atb.viewer.Finder.prototype.createAnnoSummariesFromResourceIds_ = function (bodyId, targetIds, annoIds, triplesByTarget) {
    var summaries = [];
    
    var createTargetSummaries = function (targetsIds, opt_createMarkerCollections) {
        var targetSummaries = [];
        
        var markers = [];
        var otherResources = [];
        
        if (opt_createMarkerCollections) {
            for (var i=0, len=targetsIds.length; i<len; i++) {
                var targetId = targetsIds[i];
                var target = this.crawler.getResource(targetId);
                
                if (target != null) {
                    var type = target.getType();
                    
                    if (type == 'marker') {
                        markers.push(target);
                    }
                    else {
                        otherResources.push(target);
                    }
                }
            }
        }
        else {
            for (var i=0, len=targetsIds.length; i<len; i++) {
                var target = this.crawler.getResource(targetsIds[i]);
                
                if (target != null) {
                    otherResources.push(target);
                }
            }
        }
        
        var setTargetSummaryProperties = function (summary) {
            summary.addAnnoId(annoIds[0]);
            summary.setView(atb.resource.TARGET_VIEW);
            
            var tripleId = triplesByTarget.get(summary.resourceId);
            summary.setDeletableResources(tripleId);
        };
        
        var setTargetSummariesProperties = function (summaries) {
            for (var i=0, len=summaries.length; i<len; i++) {
                setTargetSummaryProperties(summaries[i]);
            }
        };
        
        if (markers.length > 0) {
            var canvasId = markers[0].canvas;
            targetSummaries = targetSummaries.concat(this.createMarkerCollections(markers, false, setTargetSummaryProperties, this));
        }
        
        for (var i=0, len=otherResources.length; i<len; i++) {
            var otherResource = otherResources[i];
            
            var targetSummary = this.createSummariesFromResource(otherResource);
            setTargetSummariesProperties(targetSummary);
            
            targetSummaries = targetSummaries.concat(targetSummary);
        }
        
        return targetSummaries;
    };
    
    var bodyResource = this.crawler.getResource(bodyId);
    
    if (this.getContextType() == atb.viewer.Finder.ContextTypes.SEARCH || bodyId != this.contextId) {
        var numChildren = 0;
        
        if (bodyResource) {
            if (bodyResource.getType() == 'marker') {
                summary = new atb.resource.MarkerAnnotationSummary(null, null, this, annoIds[0]);
            }
            else {
                summary = new atb.resource.AnnotationSummary(null, null, this, annoIds[0]);
                
                summary.setExpanded(false);
            }
            numChildren ++;
            
            var bodySummary = this.createSummariesFromResource(bodyResource)[0];
            bodySummary.addAnnoId(annoIds[0]);
            bodySummary.setView(atb.resource.BODY_VIEW);
            bodySummary.setDeletableResources(annoIds);
            
            summary.setParentSummary(bodySummary);
            
            var targetSummaries = createTargetSummaries.call(this, targetIds, bodyResource.getType() != 'marker');
            summary.addChildSummaries(targetSummaries);
            
            numChildren += targetSummaries.length;
            if (numChildren > 1)
                summaries.push(summary);
        }
    }
    else {
        summaries = createTargetSummaries.call(this, targetIds, true);
    }
    
    return summaries;
};

atb.viewer.Finder.prototype.createHighlightAnnoSummaries = function (annos) {
    var summaries = [];
    var targetIdsByBodyId = {};
    var annoIdsByBodyId = {};
    var triplesByTarget = new goog.structs.Map();
    
    for (var i=0, len=annos.length; i<len; i++) {
        var anno = annos[i];
        var bodyId = anno.getBodyId();
        var targetIds = anno.getTargetIds();
        
        if (targetIdsByBodyId[bodyId]) {
            targetIdsByBodyId[bodyId] = targetIdsByBodyId[bodyId].concat(targetIds);
        }
        else {
            targetIdsByBodyId[bodyId] = targetIds;
        }
        
        if (annoIdsByBodyId[bodyId]) {
            annoIdsByBodyId[bodyId].push(anno.getId());
        }
        else {
            annoIdsByBodyId[bodyId] = [anno.getId()];
        }
        
        triplesByTarget.addAll(anno.getTriplesByTarget());
    }
    
    for (var bodyId in targetIdsByBodyId) {
        if (targetIdsByBodyId.hasOwnProperty(bodyId)) {
            var targetIds = targetIdsByBodyId[bodyId];
            var annoIds = annoIdsByBodyId[bodyId];
            
            summaries = summaries.concat(this.createAnnoSummariesFromResourceIds_(bodyId, targetIds, annoIds, triplesByTarget));
        }
    }
    
    return summaries;
};

/**
 * @param markers {Array.<Object>}
 * @param opt_hideCanvasNames {boolean} Hide the names of the canvases for each marker summary, defaults to false
 * @param opt_withMarkerSummaries {Function(atb.resource.ResourceSummary)}
 * @param opt_scope {Object}
 * @return {atb.resource.MarkerCollection}
 */
atb.viewer.Finder.prototype.createMarkerCollections = function (markers, opt_hideCanvasNames, opt_withMarkerSummaries, opt_scope) {
    var markerCollections = [];
    
    var markersByCanvasId = this.crawler.getMarkersByCanvasId(markers);
    
    for (var canvasId in markersByCanvasId) {
        var markers = markersByCanvasId[canvasId];
        var canvas = this.crawler.getResource(canvasId);
        
        var title = '';
        if (! opt_hideCanvasNames && canvas) {
            title = 'Markers on ' + canvas.getTitle();
        }
        
        var markerCollection = new atb.resource.MarkerCollection(canvasId, title, atb.Util.scopeAsyncHandler(this.handleMarkerCollectionClick, this), this, this.domHelper);
        
        for (var i=0, len=markers.length; i<len; i++) {
            var marker = markers[i];
            
            var markerSummary = this.createSummariesFromResource(marker)[0];
            
            if (opt_withMarkerSummaries) {
                opt_withMarkerSummaries.call(opt_scope || window, markerSummary);
            }
            
            markerCollection.addChildSummary(markerSummary);
        }
        
        markerCollections.push(markerCollection);
    }
    
    return markerCollections;
};

atb.viewer.Finder.prototype.setupEventHandlers = function () {
    var eventDispatcher = this.clientApp.getEventDispatcher();
    
    var markerHiddenHandler = function (e) {
        if (!(e && e.target)) {
            return;
        }
        var id = e.target;
        
        this.withAllSummariesMatchingId(id, function (summary) {
                                        summary.setSelected(false);
                                        }, this);
    };
    
    var markerShownHandler = function (e) {
        if (!(e && e.target)) {
            return;
        }
        var id = e.target;
        
        this.withAllSummariesMatchingId(id, function (summary) {
                                        summary.setSelected(true);
                                        }, this);
    };
    
    var resourceDeletedHandler = function (e) {
        if ((!e && e.target)) {
            return;
        }
        
        var id = e.target;
        
        this.withAllSummariesMatchingId(id, function (summary) {
                                        this.visualDeleteSummaryInternal_(summary);
                                        }, this);
    }
    
    goog.events.listen(eventDispatcher, 'marker hidden', markerHiddenHandler, false, this);
    goog.events.listen(eventDispatcher, 'marker shown', markerShownHandler, false, this);
    goog.events.listen(eventDispatcher, 'resource deleted', resourceDeletedHandler, false, this);
};

atb.viewer.Finder.prototype.render = function () {
    if (this.rootDiv != null) {
        return;
    }
    
    atb.viewer.ResourceListViewer.prototype.render.call(this);

    this.searchDiv = this.domHelper.createDom('div', {
        'class': 'atb-finder-search',
        'title': 'Click to show more filtering options'
    });
    this.searchField = this.domHelper.createDom('input', {
        'type': 'text',
        'class':'atb-finder-searchfield',
        'placeholder': 'Search...'
    }, null);
    goog.events.listen(this.searchField, goog.events.EventType.KEYUP, this.handleSearchKeyUp_, false, this);

    var menuIcon = this.domHelper.createDom('span', {'class':'atb-finder-menu-icon'}, '');    
    this.searchDiv.appendChild(menuIcon);

    var searchIcon = this.domHelper.createDom('span', {'class':'atb-finder-search-icon'}, '');
    this.searchDiv.appendChild(searchIcon);
    
    this.deleteButton = new goog.ui.ToolbarToggleButton(
        this.domHelper.createDom(
            'div',
            {
                'class': 'atb-finder-enable-delete-button'
            }
        )
    );
    this.deleteButton.setTooltip('Enable resource deletion');
    this.deleteButton.addClassName('atb-finder-enable-delete-button-outer');
    goog.events.listen(this.deleteButton, goog.ui.Component.EventType.ACTION, this.handleDeleteEnableClick_, false, this);
    
    this.searchDiv.appendChild(this.searchField);
    this.controlsDiv.appendChild(this.searchDiv);
    this.deleteButton.render(this.controlsDiv);
    
    if (this.contextId) {
        this.loadSummaries([this.contextId], this.queryText);
    }
};

atb.viewer.Finder.prototype.finishRender = function () {
    atb.viewer.ResourceListViewer.prototype.finishRender.call(this);
    
    if (this.deleteEnabled) {
        this.deleteButton.setChecked(true);
    }
    else {
        this.deleteButton.setChecked(false);
    }
    
    this.withAppropriatePanel(this.contextId, null, null, function (panel) {
        this.syncSelectedMarkersWithViewer(panel.getViewer());
    }, this);

};

atb.viewer.Finder.prototype.handleSearchKeyUp_ = function (e) {
    var key = e.keyCode;

    if (key == goog.events.KeyCodes.ENTER || key == goog.events.KeyCodes.MAC_ENTER) {
        var queryText = e.target.value;

        var newViewer = new atb.viewer.Finder(this.clientApp);
        this.getCurrentPanelContainer().setViewer(newViewer);
        e.stopPropagation();

        newViewer.setQueryText_(queryText);
        newViewer.setContextType(atb.viewer.Finder.ContextTypes.SEARCH);
        newViewer.setLoading(true);
        newViewer.webService.withSearchResults(
            queryText,
            function (resultsJson) {
                newViewer.clearSummaries();
                newViewer.loadSummaries(resultsJson, queryText);
                newViewer.setLoading(false);
                newViewer.searchField.focus();
            },
            this
        );
    }
};


atb.viewer.Finder.prototype.setQueryText_ = function(queryText) {
    this.queryText = queryText;
    this.searchField.value = queryText;
};


atb.viewer.Finder.prototype.refresh = function (e) {
    if (this.isLoading()) {
        return;
    }
    
    this.clearSummaries();
    
    this.loadSummaries(this.lastIdsLoaded, this.queryText);
    
    if (e) e.stopPropagation();
};

/**
 * Asynchronously provides the panel with the specified id, or this Finder's panel if the specified panel does not exist
 *
 * @param findId {string} The desired id for the panel's viewer
 * @param event {?goog.events.Event} An event object if alt key switch panel functionality is desired
 * @param message {?string} A string message to trigger custom behavior, such as an enumeration of
 * atb.resource.ResourceSummary.HANDLER_MSG
 * @param handler {function(atb.viewer.PanelContainer)}
 * @param opt_scope {Object=} the scope in which to call doAfter
 */
atb.viewer.Finder.prototype.withAppropriatePanel = function (findId, event, message, handler, opt_scope) {
    var panelManager = this.clientApp.getPanelManager();
    var thisPanel = this.getCurrentPanelContainer();
    var allPanels = panelManager.getAllPanels();
    
    var correctPanel;
    
    var swapPanels = (event && event.altKey) ||
    (message == atb.resource.ResourceSummary.HANDLER_MSG.swapPanels);
    var newWindow = (message == atb.resource.ResourceSummary.HANDLER_MSG.newWindow);
    
    if (! swapPanels && ! newWindow) {
        for (var i=0, len=allPanels.length; i<len; i++) {
            var panel = allPanels[i];
            var viewer = panel.getViewer();
            
            if (viewer && (viewer.resourceId == findId)) {
                correctPanel = panel;
                break;
            }
        }

        if (! correctPanel) {
            correctPanel = thisPanel;
        }
        
        handler.call(opt_scope || this, correctPanel);
    }
    else if (swapPanels) {
        correctPanel = panelManager.getAnotherPanel(thisPanel);
        handler.call(opt_scope || this, correctPanel);
    }
    else if (newWindow) {
        this.openPopoutPanel(handler, opt_scope);
    }
    else {
        correctPanel = thisPanel;
        handler.call(opt_scope || this, correctPanel);
    }
};

/**
 * Asynchronously opens a popup window, providing the panel container and popup object to the handler
 *
 *@param handler {Function({atb.viewer.PanelContainer}, {atb.ui.PopupWindow})}
 *@param opt_scope {Object}
 */
atb.viewer.Finder.prototype.openPopoutPanel = function (handler, opt_scope) {
    var location = this.clientApp.getWebService().popoutURI();
    
    var popup = new atb.ui.PopupWindow(
        location,
        {
            'width': 570,
            'height': 670
        }
    );
    var popupWin = popup.open();
    this.clientApp.registerPopup(popup);
    
    popup.bindToLoad(function (e) {
        this.onPopoutLoaded(e, popup, handler, opt_scope);
    }, this);
};


atb.viewer.Finder.prototype.onPopoutLoaded = function (event, popup, doAfter, opt_scope) {
    var popupWin = popup.getWindow();
    var panelManager = this.clientApp.getPanelManager();
    
    var dummyObj = {};
    var uid = goog.getUid(dummyObj);
    var name = 'popup'+uid;
    
    var newDiv = popupWin.document.getElementById('left');
    var newTab = popupWin.document.getElementById('leftTab');
	jQuery(newDiv).addClass("atb-popup-viewer");
    
    var popupPanel = new atb.viewer.PanelContainer(name, newDiv, newTab, null, popupWin.document);
    
    popupPanel.setToolbarHangingLeft();
    popupPanel.autoHideToolbars();
    
    panelManager.addPanelSlot(popupPanel);
    
    popup.bindToUnload(function (e) {
        panelManager.removePanelSlot(popupPanel);
        this.clientApp.unregisterPopup(popup);
    }, this);
    
    doAfter.call(opt_scope || this, popupPanel, popup);
};

/**
 * Click handler to be passed to any ResourceSummaries added to this Finder
 *
 * @param id {string}
 * @param summary {atb.resource.ResourceSummary}
 * @param event {goog.events.Event}
 * @param opt_params {Object}
 */
atb.viewer.Finder.prototype.handleResourceSummaryClick = function (id, summary, event, opt_params) {
    var resource = summary.resource;
    var type = resource.getType();
    
    var fireClickEvent = function () {
        var eventDispatcher = this.clientApp.getEventDispatcher();
        var event = new atb.events.ResourceClick(resource.getId(), eventDispatcher, this);
        eventDispatcher.dispatchEvent(event);
    };
    fireClickEvent = atb.Util.scopeAsyncHandler(fireClickEvent, this);
    
    if (this.clientApp.isAnnoLinkingInProgress()) {
        fireClickEvent();
    }
    else {
        var openLocation = null;
        if (opt_params) {
            openLocation = opt_params.openLocation;
        }
        
        var zoomIn = true;
        if (event && event.shiftKey) {
            zoomIn = false;
        }
        
        this.withAppropriatePanel(
            this.crawler.getResourceParentId(resource),
            event, 
            openLocation,
            function (panel, popup) {
                if (type == 'text') {
                    this.loadText(id, resource.getType(), panel);
                }

                else if (type == 'textHighlight') {
                    this.loadTextHighlight(id, resource.getTextId(), resource.getTitle(), panel);
                }

                else if (type == 'canvas' || type == 'manuscript') {
                    this.loadCanvas(id, panel);
                }

                else if (type == 'marker') {
                    this.toggleMarker(id, resource.getCanvasId(), resource, panel, zoomIn);
                }
            },
            this
        );
        
        fireClickEvent();
    }
};

/**
 * Click handler to be passed to any MarkerCollections added to this Finder
 * Paints all markers in the collection on the appropriate canvas
 *
 * @param summary {atb.resource.ResourceSummary}
 * @param event {goog.events.Event}
 * @param message {string} from an enumeration of atb.resource.ResourceSummary.HANDLER_MSG
 */
atb.viewer.Finder.prototype.handleMarkerCollectionClick = function (id, summary, event, message) {
    var zoomIn = event.shiftKey;
    
    var resourceArr = summary.loadableResources;
    
    var openLocation;
    
    if (message && message.openLocation) {
        openLocation = message.openLocation;
    }
    
    this.withAppropriatePanel(
        id,
        event,
        openLocation,
        function (panel, popup) {
            if (!summary.selected) {
                if (resourceArr[0] && resourceArr[0].getType() == 'marker') {
                    this.loadMarkers(resourceArr[0].getCanvasId(), resourceArr, panel);
                    summary.setSelected(true);
                }
                else if (resourceArr[0] && resourceArr[0].type == 'textHighlight') {
                    this.loadText(resourceArr[0].getTextId(), resourceArr[0].getTextTitle(), panel);
                }
            }
            else {
                for (var id in summary.summaries) {
                    var resource = summary.summaries[id].resource;
                    
                    if (resource.getType() == 'marker')
                        this.unloadMarker(resource);
                }
            }
        },
        this
    );
};


/**
 * Loads a text editor
 *
 * @param id <string>
 * @param title <string> the title of the text
 * @param panel <atb.viewer.PanelContainer>
 */
atb.viewer.Finder.prototype.loadText = function (id, title, panel) {
    if (panel.getViewer() && panel.getViewer().resourceId == id) {
        return;
    }
    
    var viewer = new atb.viewer.TextEditor(this.clientApp, null, null);

    viewer.loadResourceById(id);

    panel.setViewer(viewer);
    panel.setTabContents(title);
};


/**
 * Loads a text editor (if the specified document is not already open) and scrolls to the highlight
 *
 * @param id <string> the highlight id
 * @param textId <string> the parent text document's id
 * @param title <string> the tiele of the text document
 * @param panel <atb.viewer.PanelContainer>
 */
atb.viewer.Finder.prototype.loadTextHighlight = function (id, textId, title, panel) {
    var viewer = panel.getViewer();
    
    if (viewer && viewer.resourceId == textId) {
        viewer.scrollIntoViewByResourceId(id);
    }
    else {
        
        var newViewer = new atb.viewer.TextEditor(this.clientApp, null, null);

        newViewer.loadResourceById(textId, function () {
            newViewer.scrollIntoViewByResourceId(id);
        });

        panel.setViewer( newViewer );
        panel.setTabContents(title);
    }
};

/**
 * Loads a canvas
 *
 * @param id <string>
 * @param panel {atb.viewer.PanelContainer}
 */
atb.viewer.Finder.prototype.loadCanvas = function (id, panel) {
	var viewer = new atb.viewer.StandardSimpleMarkerEditor(this.clientApp,null,null,panel.getDomHelper());

    viewer.setResource(id);

    panel.setViewer(viewer);
};

/**
 * Toggles the specified marker, loading the required canvas if necessary
 
 This functionality should be moved to the marker viewer
 *
 * @param id {string} the marker's id
 * @param canvasId {string} the id of the parent canvas
 * @param resource {atb.resource.MarkerResource}
 * @param panel {atb.viewer.PanelContainer}
 * @param zoomIn {boolean} true if the viewer should zoom in to the specified marker, false if not
 */
atb.viewer.Finder.prototype.toggleMarker = function (id, canvasId, resource, panel, zoomIn) {
    var viewer = panel.getViewer();
    
    if (viewer && viewer.resourceId == canvasId && viewer.isShowingMarker) {
        if (! viewer.isShowingMarker(id)) {
            this.loadMarker(id, canvasId, resource, panel, zoomIn);
        }
        else {
            this.unloadMarker(resource);
        }
    }
    else {
        this.loadMarker(id, canvasId, resource, panel, zoomIn);
    }
};

atb.viewer.Finder.prototype.loadMarkerInternal_ = function (id, resource, viewer) {
    viewer.loadMarkerResource(resource);

    this.withAllSummariesMatchingId(id, function (summary) {
        summary.setSelected(true);
    });
};

/**
 * Loads the specified marker, loading the required canvas if necessary
 *
 * @param id {string} the marker's id
 * @param canvasId {string} the parent canvas's id
 * @param resource {atb.resource.MarkerResource}
 * @param panel {atb.viewer.PanelContainer}
 * @param zoomIn {boolean} true if the viewer should zoom in to the specified marker, false if not
 */
atb.viewer.Finder.prototype.loadMarker = function (id, canvasId, resource, panel, zoomIn) {
    var viewer = panel.getViewer();
    
    if (viewer && viewer.resourceId == canvasId) {
        this.loadMarkerInternal_(id, resource, viewer);

        if (zoomIn) {
            viewer.centerOnMarker(id);
        }

    }
    else {
        // Load a MarkerEditor with the required canvas
        var newViewer = new atb.viewer.StandardSimpleMarkerEditor(this.clientApp,null,null,panel.getDomHelper());

        var self = this;

        newViewer.setResource(resource.getCanvasId(), null, function () {
            self.loadMarkerInternal_(id, resource, newViewer)
            newViewer.centerOnMarker(id);
        });
        
        panel.setViewer(newViewer);
    }
};

/**
 * Loads the specified markers, loading the required canvas if necessary
 *
 * @param canvasId {string} the canvas id
 * @param resourceArr {Array.<atb.resource.MarkerResource>} an array of marker resources
 * @param panel {atb.viewer.PanelContainer}
 */
atb.viewer.Finder.prototype.loadMarkers = function (canvasId, resourceArr, panel) {
    var viewer = panel.getViewer();
    
    if (viewer && viewer.resourceId == canvasId) {
        for (var i=0, len=resourceArr.length; i<len; i++) {
            var resource = resourceArr[i];
            var id = resource.getId();
                
            this.loadMarkerInternal_(id, resource, viewer);
        }
    }
    else {
		var newViewer = new atb.viewer.StandardSimpleMarkerEditor(this.clientApp, null, null, panel.getDomHelper());

        var self = this;

        newViewer.setResource(canvasId, null, function () {
            for (var i=0, len=resourceArr.length; i<len; i++) {
                var resource = resourceArr[i];
                var id = resource.getId();
                
                self.loadMarkerInternal_(id, resource, newViewer);
            }
        });
        
        panel.setViewer(newViewer);
    }
};

/**
 * Unloads the specified marker from the appropriate canvas
 *
 * @param resource {atb.resource.MarkerResource}
 */
atb.viewer.Finder.prototype.unloadMarker = function (resource) {
    this.withAllSummariesMatchingId(resource.getId(), function (summary) {
        summary.setSelected(false);
        
        if (summary.parent && summary.parent.selected) {
            summary.parent.setSelected(false);
        }
    });
    
    this.withAppropriatePanel(
        this.crawler.getResourceParentId(resource),
        null,
        null,
        function (panel, popout) {
            var canvas = panel.getViewer();

            if (canvas.unloadMarkerResource) {
                canvas.unloadMarkerResource(resource);
            }
        },
        this
    );
};

/**
 * Click handler for the enable delete toolbar button
 * @param e {goog.events.Event}
 */
atb.viewer.Finder.prototype.handleDeleteEnableClick_ = function (e) {
    e.stopPropagation();
    
    if (this.deleteEnabled) {
        this.disableDelete();
    }
    else {
        this.enableDelete();
    }
}

/**
 * Enables the delete button of every summary which this Finder has permission to delete
 */
atb.viewer.Finder.prototype.enableDelete = function () {
    this.deleteEnabled = true;
    
    this.deleteButton.setChecked(true);
    
    this.forEachSummary(function (summary) {
        if (this.hasDeletePermissions(summary)) {
            summary.enableDelete(atb.Util.scopeAsyncHandler(this.summaryDeleteHandler, this));
        }
    }, this);
};

/**
 * Disables the delete button of every summary in this Finder
 */
atb.viewer.Finder.prototype.disableDelete = function () {
    this.deleteEnabled = false;
    
    this.deleteButton.setChecked(false);
    
    for (var x in this.summaries) {
        var summary = this.summaries[x];
        
        summary.disableDelete();
    }
};

/**
 * This function will be called upon the enabling of delete funcionality with each
 * summary in the Finder.
 * 
 * @return {boolean} true if the resource may be deleted
 */
atb.viewer.Finder.prototype.hasDeletePermissions = function (summary) {
    if (summary.getDeletableResources().length < 1) {
        console.log("no delete permissions for summary", summary);
        return false;
    }
    else {
        return true;
    }
};

/**
 * Called by a {atb.resource.ResourceSummary} when its delete button is clicked
 * 
 * @param summary {atb.resource.ResourceSummary}
 * @param event {goog.events.Event}
 */
atb.viewer.Finder.prototype.summaryDeleteHandler = function (summary, event) {
    if (event && event.altKey) {
        this.deleteOrUnlinkSummary(summary);
    }
    else {
        this.displayDeleteConfirmDialog(summary);
    }
};

atb.viewer.Finder.prototype.deleteOrUnlinkSummary = function (summary) {
    var resource = summary.resource;
    
    var ids = summary.getDeletableResources();
    this.deleteResources(ids);
    if (summary.getView() == atb.resource.TARGET_VIEW) {
        this.visualUnlinkAndMoveSummary(summary);
    }
    else if (summary.getView() == atb.resource.BODY_VIEW) {
        this.visualDeleteSummary(summary);
    }
    else {
        this.visualDeleteSummary(summary, true, true);
        
        var eventDispatcher = this.clientApp.getEventDispatcher();
        var event = new goog.events.Event('resource deleted', resource.getId());
        eventDispatcher.dispatchEvent(event);
    }
    this.disableDelete();
};

atb.viewer.Finder.prototype.deleteResources = function (ids) {
    var ws = this.clientApp.getWebService();
    
    ws.withBatchDelete(
                       ids,
                       function (data) {
                       
                       },
                       this
                       );
};

/**
 * Displays a delete confirmation dialog for a resource
 *
 * @param summary {atb.resource.ResourceSummary}
 */
atb.viewer.Finder.prototype.displayDeleteConfirmDialog = function (summary) {
    var summaryView = summary.getView();
    var isInAnnotation = summaryView == atb.resource.TARGET_VIEW || summaryView == atb.resource.BODY_VIEW;
    
    var caption;
    var okButtonText;
    var message;
    var resourceType = summary.getResourceType().toLowerCase() || 'resource';
    
    if (isInAnnotation) {
        if (summary.getView() == atb.resource.BODY_VIEW) {
            caption = 'Delete annotation';
            okButtonText = 'Delete';
            message = 'Are you sure you want to permanently delete this annotation?';
        }
        else {
            caption = 'Unlink ' + resourceType;
            okButtonText = 'Unlink';
            message = 'Are you sure you want to unlink this '+ resourceType +' from this annotation?';
        }
    }
    else {
        caption = 'Delete '+ resourceType;
        okButtonText = 'Delete';
        message = 'Are you sure you want to permanently delete this '+ resourceType +'?';
    }
    
    var self = this;
    
    var confirmDialog = new atb.widgets.DialogWidget({
        bModal: true,
        caption: caption,
        content: message,
        show_buttons: [
            {
                name: "OkButton",
                visual: {
                    content: okButtonText
                },
                action: function(actionEvent) {
                    self.deleteOrUnlinkSummary(summary);
                    actionEvent.getMenu().onDialogOK(actionEvent);
                },
                custom: {
                    bIsCancelButton: false,
                    bCloseByDefault: true
                }
            },
            {
                name: "CancelButton",
                visual: {
                    content: "Cancel"
                },
                action: function (actionEvent) {
                    self.disableDelete();
                    actionEvent.getMenu().onDialogOK(actionEvent);
                },
                custom: {
                    bIsCancelButton: true,
                    bCloseByDefault: true
                }
            }
        ]
    });
    confirmDialog.show();
};

/**
 * Removes all occurrences of a particular summary from this Finder
 *
 * @param summary {atb.resource.ResourceSummary}
 * @param opt_unpaintAllMarkers {boolean=} true if markers should be removed from other canvases in the workspace
 * @param opt_deleteAllOccurrences {boolean=} true if all other summaries with the given summary's id should also be removed
 */
atb.viewer.Finder.prototype.visualDeleteSummary = function (summary, opt_unpaintAllMarkers, opt_deleteAllOccurrences) {
    this.visualDeleteSummaryInternal_(summary);
    
    if (opt_deleteAllOccurrences) {
        // Delete any other occurrences of this summary in this Finder
        this.withAllSummariesMatchingId(summary.resourceId, function (s) {
                                            this.visualDeleteSummary(s);
                                        }, this);
    }
    
    if (opt_unpaintAllMarkers) {
        // Unpaint the marker from all canvases (if it is a marker)
        var panelManager = this.clientApp.getPanelManager();
        var allPanels = panelManager.getAllPanels();
        
        for (var i=0, len=allPanels.length; i<len; i++) {
            var panel = allPanels[i];
            var viewer = panel.getViewer();
            
            if (viewer && viewer.isShowingMarker && viewer.isShowingMarker(summary.resourceId)) {
                viewer.unloadMarkerObject(summary.resourceId);
            }
        }
    }
};

atb.viewer.Finder.prototype.visualUnlinkAndMoveSummary = function (summary) {
    this.visualDeleteSummaryInternal_(summary);
};

atb.viewer.Finder.prototype.addResourceSummary = function (resourceSummary) {
    atb.viewer.ResourceListViewer.prototype.addResourceSummary.call(this, resourceSummary);
    
    if (this.deleteEnabled && this.hasDeletePermissions(resourceSummary)) {
        resourceSummary.enableDelete(this.summaryDeleteHandler);
    }
};


/**
 * Synchronizes the toggle state of each marker in this Finder with the given viewer
 */
atb.viewer.Finder.prototype.syncSelectedMarkersWithViewer = function (viewer) {
    if (! viewer || !viewer.isShowingMarker)
        return;
    
    this.forEachSummary(
        function (summary) {
            if (viewer.isShowingMarker(summary.resourceId)) {
                summary.setSelected(true);
            }
            else {
                summary.setSelected(false);
            }
        },
        this
    );
};

atb.viewer.Finder.prototype.syncSelectedMarkersWithAppropriateViewer = function (opt_doAfter, opt_scope) {
    if (!this.contextId) {
        return;
    }
    
    this.withAppropriatePanel(this.contextId, null, null, 
                              function (panel) {
                                  this.syncSelectedMarkersWithViewer(panel.getViewer());
                                  
                                  if (opt_doAfter) {
                                      opt_doAfter.call(opt_scope || window);
                                  }
                              }, this);
};

goog.provide('atb.viewer.Finder.ContextTypes');
atb.viewer.Finder.ContextTypes.RESOURCE = 'resource';
atb.viewer.Finder.ContextTypes.SEARCH = 'search';