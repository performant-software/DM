goog.provide('atb.viewer.CanvasViewer');

goog.require('atb.viewer.Viewer');

goog.require('atb.ui.InfoPane');

goog.require('sc.canvas.CanvasViewer');
goog.require('sc.canvas.FabricCanvasFactory');


atb.viewer.CanvasViewer = function(clientApp) {
    atb.viewer.Viewer.call(this, clientApp);
    
    this.viewer = null;
};
goog.inherits(atb.viewer.CanvasViewer, atb.viewer.Viewer);

atb.viewer.CanvasViewer.prototype.render = function(div) {
    if (this.rootDiv != null) {
        return;
    }

    var self = this;
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;

    atb.viewer.Viewer.prototype.render.call(this, div);
    jQuery(this.rootDiv).addClass('atb-CanvasViewer');

    var menuButtons = [
        new atb.widgets.MenuItem(
            "showLinkedAnnos",
            createButtonGenerator("atb-radialmenu-button icon-search"),
            function(actionEvent) {
                self.showAnnos(self.getUri());
                
                self.hideHoverMenu();
            },
            'Show resources which are linked to this canvas'
        ),
        new atb.widgets.MenuItem(
            "newTextAnno",
            createButtonGenerator("atb-radialmenu-button icon-pencil"),
            function(actionEvent) {
                self.createTextAnno(self.getUri());
                
                self.hideHoverMenu();
            },
            'Annotate this canvas'
        )
    ];
    
    this.documentIcon = this.domHelper.createElement('div');
	jQuery(this.documentIcon).addClass('atb-viewer-documentIcon ' +
                                       'atb-viewer-documentIcon-noScrollbars');
	goog.events.listen(this.documentIcon, 'click',
                       this.handleDocumentIconClick_, false, this);
    this.addHoverMenuListenersToElement(this.documentIcon, menuButtons,
                                        jQuery.proxy(this.getResourceId, this));
    this.rootDiv.appendChild(this.documentIcon);
    
    this.viewer = new sc.canvas.CanvasViewer({
        databroker: this.databroker
    });
    
    this.setupEventListeners();
    
    this.viewer.render(this.rootDiv);
};

atb.viewer.CanvasViewer.prototype.handleDocumentIconClick_ = function(event) {
    
};

atb.viewer.CanvasViewer.prototype.getResourceId = function() {
    return this.webService.resourceUriToId(this.getUri());
};

atb.viewer.CanvasViewer.prototype.getUri = function() {
    if (this.viewer.mainViewport.canvas) {
        return this.viewer.mainViewport.canvas.getUri();
    }
    else {
        return '';
    }
};

atb.viewer.CanvasViewer.prototype.setupEventListeners = function() {
    var self = this;
    var viewport = this.viewer.mainViewport;
    var eventDispatcher = this.clientApp.getEventDispatcher();
    
    viewport.addEventListener('mouseup', this.onResourceClick, false, this);
    viewport.addEventListener('mouseover', this.onFeatureHover, false, this);
    viewport.addEventListener('mouseout', this.onFeatureMouseout, false, this);
    viewport.addEventListener('canvasAdded', this.onCanvasAdded, false, this);

    var panZoomControl = this.viewer.toolbar.controls.panZoom;
    panZoomControl.addEventListener('activated', function(event) {
                                    this.enableHoverMenus();
                                    }, false, this);
    panZoomControl.addEventListener('deactivated', function(event) {
                                    this.disableHoverMenus();
                                    }, false, this);
/* SGB    
*/
    goog.events.listen(eventDispatcher, 'resource deleted', function (e) {
                       if (e && e.target)
                       var id = e.target;
                       var uri = this.webService.resourceIdToUri(id);
                       
                       try {
                       viewport.canvas.removeObjectByUri(uri);
                       } catch (error) {}
                       }, false, this);
    
    goog.events.listen(eventDispatcher, atb.events.LinkingModeExited.EVENT_TYPE,
                       this.handleLinkingModeExited, false, this);
};

atb.viewer.CanvasViewer.prototype.onCanvasAdded = function(event) {
    var canvas = this.viewer.mainViewport.canvas;
    
    var resource = this.databroker.getResource(canvas.getUri());
    
    var title = resource.getOneProperty('dc:title') || 'Untitled canvas';
    
    this.setTitle(title);
};

atb.viewer.CanvasViewer.prototype.onFeatureHover = function(event) {
    var feature = event.feature;
    var uri = event.uri;
    
    if (uri == null) return;
    
    if (feature.type == 'image') return;
    
    this.mouseIsOverFloatingMenuParent = true;
    
    var id = this.webService.resourceUriToId(uri);
    var self = this;
    var specificResourceUri = this.databroker.getSvgSelectorSpecificResourceUri(uri) || uri;
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
    
    var afterTimer = function () {
        if (this.mouseIsOverFloatingMenuParent) {
            var menuButtons = [
                new atb.widgets.MenuItem(
                    "getMarkerInfo",
                    createButtonGenerator("atb-radialmenu-button icon-info-sign"),
                    function(actionEvent) {
                        var pane = new atb.ui.InfoPane(self.clientApp, id, self.domHelper);
                        pane.show();
                        
                        self.hideHoverMenu();
                    },
                    'Get marker info'
                ),
                new atb.widgets.MenuItem(
                    "deleteThisMarker",
                    createButtonGenerator("atb-radialmenu-button icon-remove"),
                    function(actionEvent) {
                        self.deleteFeature(uri);
                        
                        self.hideHoverMenu();
                    },
                    'Delete this marker'
                ),
                new atb.widgets.MenuItem(
                    "hideMarker",
                    createButtonGenerator("atb-radialmenu-button icon-eye-close"),
                    function(actionEvent) {
                        self.hideFeature(uri);
                        
                        self.hideHoverMenu();
                    },
                    'Temporarily hide this marker'
                ),
                new atb.widgets.MenuItem(
                    "showLinkedAnnos",
                    createButtonGenerator("atb-radialmenu-button icon-search"),
                    function(actionEvent) {
                        self.showAnnos(specificResourceUri);
                        
                        self.hideHoverMenu();
                    },
                    'Show other resources which are linked to this marker'
                ),
                new atb.widgets.MenuItem(
                    "linkAway",
                    createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
                    function(actionEvent) {
                        self.clientApp.createAnnoLink(specificResourceUri);
                        self.highlightFeature(uri);
                    },
                    'Link another resource to this marker'
                ),
                new atb.widgets.MenuItem(
                    "newTextAnno",
                    createButtonGenerator("atb-radialmenu-button icon-pencil"),
                    function(actionEvent) {
                        self.createTextAnno(specificResourceUri);
                    },
                    'Annotate this marker'
                )
            ];
            this.showHoverMenu(menuButtons, specificResourceUri);
        }
    };
    afterTimer = atb.Util.scopeAsyncHandler(afterTimer, this)
    window.setTimeout(afterTimer, atb.viewer.Viewer.HOVER_SHOW_DELAY);
};

atb.viewer.CanvasViewer.prototype.onFeatureMouseout = function(event) {
    this.mouseIsOverFloatingMenuParent = false;
    this.maybeHideHoverMenu();
};

atb.viewer.CanvasViewer.prototype.onResourceClick = function(event) {
    var uri = event.uri;
    var feature = event.getFeature();
    var specificResourceUri = this.databroker.getSvgSelectorSpecificResourceUri(uri);

    console.log('resource click', event, uri, feature)
    
    if (! uri || !specificResourceUri) return;
    if (! feature) return;
    if (feature.type == 'image') return;
    
    var event = new atb.events.ResourceClicked(specificResourceUri, null, this);

    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    if (eventDispatcher.dispatchEvent(event)) {
        
    }
};

atb.viewer.CanvasViewer.prototype.loadResourceByUri = function(uri) {
    var resource = this.databroker.getResource(uri);

    if (resource.hasAnyType('dms:Canvas')) {
        this.setCanvasByUri(resource.getUri());
    }
    else if (resource.hasAnyType('oa:SpecificResource')) {
        this.setCanvasByUri(resource.getOneProperty('oa:hasSource'));
    }
    else if (resource.hasAnyType('oa:SvgSelector')) {
        var specificResource = this.databroker.getResource(this.databroker.getSvgSelectorSpecificResourceUri(uri));
        this.setCanvasByUri(specificResource.getOneProperty('oa:hasSource'));
    }
};

atb.viewer.CanvasViewer.prototype.setCanvasByUri =
function(uri, opt_onLoad, opt_scope, opt_sequenceUris, opt_sequenceIndex) {
    this.showLoadingSpinner();
    
    var self = this;
    
    var deferredCanvas = sc.canvas.FabricCanvasFactory.createDeferredCanvas(
        uri,
        this.databroker,
        opt_sequenceUris,
        opt_sequenceIndex,
        opt_onLoad ? atb.Util.scopeAsyncHandler(opt_onLoad, opt_scope) : null
    );
    
    deferredCanvas.done(function(canvas) {
        self.hideLoadingSpinner();
    }).fail(function(canvas) {
        self.hideLoadingSpinner();
        self.flashErrorIcon();
    });
    
    this.viewer.addDeferredCanvas(deferredCanvas);
};

atb.viewer.CanvasViewer.prototype.setCanvasById =
function(id, opt_onLoad, opt_scope, opt_sequenceUris, opt_sequenceIndex) {
    var uri = this.webService.resourceIdToUri(id);
    
    this.setCanvasByUri(uri, opt_onLoad, opt_scope, opt_sequenceUris,
                        opt_sequenceIndex);
};

atb.viewer.CanvasViewer.prototype.resize = function(width, height) {
    atb.viewer.Viewer.prototype.resize.call(this, width, height);

    this.viewer.resize(width, height);

    return this;
};


atb.viewer.CanvasViewer.prototype.deleteFeature = function(uri) {
    var viewport = this.viewer.mainViewport;
    
    viewport.canvas.removeObjectByUri(uri);
    viewport.requestFrameRender();
    
    var id = this.webService.resourceUriToId(uri);
    
    // var webService = this.clientApp.getWebService();
    // webService.withDeletedResource(id, function (response) {}, this, jQuery.proxy(this.flashErrorIcon, this));
    
    var event = new goog.events.Event('resource deleted', id);
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.CanvasViewer.prototype.hideFeature = function(uri) {
    var viewport = this.viewer.mainViewport;

    var obj = viewport.canvas.getFabricObjectByUri(uri);
    viewport.canvas.hideObject(obj);
    viewport.requestFrameRender();
};

atb.viewer.CanvasViewer.prototype.showAnnos = function (opt_uri) {
	var uri = opt_uri || this.viewer.mainViewport.canvas.uri;
    var id = this.webService.resourceUriToId(uri);
    
    var otherContainer = this.getPanelManager().getAnotherPanel(this.getPanelContainer());
    
	var finder = new atb.viewer.Finder(this.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);
    
	otherContainer.setViewer(finder);
    finder.loadSummaries([id]);
};

atb.viewer.CanvasViewer.prototype.createTextAnno = function(uri) {
    console.log("createTextAnno uri:", uri);
    var svgUri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
    
    var canvasUri = this.viewer.mainViewport.canvas.getUri();
    var canvasResource = this.databroker.getResource(canvasUri);
    
    var canvasTitle = canvasResource.getOneProperty('dc:title') || 'Untitled canvas';
    
    var textTitle = 'New annotation on ' + canvasTitle;
    
    var textEditor = new atb.viewer.Editor(this.clientApp);
    textEditor.setPurpose('anno');

    var newTextResource = this.databroker.createText(textTitle, "");
    var newTextId = newTextResource.uri;
       
    var newAnno = this.databroker.createAnno(newTextId, uri);
    var annoId = newAnno.uri;

    textEditor.resourceId = newTextId;
    textEditor.annotationUid = annoId;
    textEditor.toggleIsAnnoText(true);

    this.openRelatedViewer(textEditor);

    textEditor.setTitle(textTitle);
};

atb.viewer.CanvasViewer.HIGHLIGHTED_FEATURE_STYLE = {
    'stroke': '#D90000',
    'fill': '#D90000'
};

atb.viewer.CanvasViewer.prototype.highlightFeature = function(uri) {
    var feature = this.viewer.mainViewport.canvas.getFabricObjectByUri(uri);
    
    this.lastHighlightedFeatureUri = uri;
    this.lastHighlightedFeatureStyle = {
        stroke: feature.get('stroke'),
        fill: feature.get('fill')
    };
    
    feature.set(atb.viewer.CanvasViewer.HIGHLIGHTED_FEATURE_STYLE);
    this.viewer.mainViewport.requestFrameRender();
};

atb.viewer.CanvasViewer.prototype.unhighlightFeature = function(uri) {
    var feature = this.viewer.mainViewport.canvas.getFabricObjectByUri(uri);
    
    if (this.lastHighlightedFeatureStyle) {
        feature.set(this.lastHighlightedFeatureStyle);
    }

    this.viewer.mainViewport.requestFrameRender();
};

atb.viewer.CanvasViewer.prototype.flashFeatureHighlight = function(uri) {
    //Something may be buggy here
    this.highlightFeature(uri);
    
    atb.Util.timeoutSequence(sc.canvas.Canvas.FADE_SPEED, [
        function() {
            this.unhighlightFeature(uri);
        },
        function() {
            this.highlightFeature(uri);
        },
        function() {
            this.unhighlightFeature(uri);
        }
    ], this);
};

atb.viewer.CanvasViewer.prototype.handleLinkingModeExited = function(event) {
    var anno = event.getResource();
    
    if (! anno) {
        if (this.lastHighlightedFeatureUri) {
            this.unhighlightFeature(this.lastHighlightedFeatureUri);
        }
        
        return;
    }
    
    var targetsAndBodies = new goog.structs.Set(anno.getChildIds());
    
    goog.structs.forEach(targetsAndBodies, function (id) {
        var uri = this.webService.resourceIdToUri(id);
        /*if (uri) {
            this.flashFeatureHighlight(uri);
        }
        else */if (this.getResourceId() == id) {
            this.flashDocumentIconHighlight();
        }
    }, this);
};
