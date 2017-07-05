goog.provide('dm.viewer.CanvasViewer');

goog.require('dm.viewer.Viewer');

goog.require('dm.canvas.CanvasViewer');
goog.require('dm.canvas.FabricCanvasFactory');
goog.require('dm.viewer.TextEditor');


dm.viewer.CanvasViewer = function(clientApp) {
    dm.viewer.Viewer.call(this, clientApp);
    this.url = null;
    this.viewer = null;
};
goog.inherits(dm.viewer.CanvasViewer, dm.viewer.Viewer);

dm.viewer.CanvasViewer.prototype.render = function(div) {
   if (this.rootDiv != null) {
      return;
   }

   this._isEditable = true;
   dm.viewer.Viewer.prototype.render.call(this, div);
   $(this.rootDiv).addClass('atb-CanvasViewer');

   this.documentIcon = this.domHelper.createElement('div');
	$(this.documentIcon).addClass('atb-viewer-documentIcon');
	goog.events.listen(this.documentIcon, 'click',
                      this.handleDocumentIconClick_, false, this);
	this.rootDiv.appendChild(this.documentIcon);

   this.viewer = new dm.canvas.CanvasViewer({
       databroker: this.databroker
   });

   this.setupEventListeners();

   this.viewer.render(this.rootDiv);
   this.setTitleEditable(true);



   this.setupControlEventListeners();
   this._addDocumentIconListeners();
};

dm.viewer.Viewer.prototype.resize = function(width, height) {
   this.size = new goog.math.Size(width, height-10);

   jQuery(this.rootDiv).width(width).height(height-10);
   this.repositionLoadingSpinner();

   return this;
};

dm.viewer.CanvasViewer.prototype._addDocumentIconListeners = function() {
    goog.events.removeAll(this.documentIcon, 'mouseover');
    goog.events.removeAll(this.documentIcon, 'mouseout');

    var self = this;
    var createButtonGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;

    if ( this.databroker.projectController.canUserEditProject() &&  this.isEditable() ) {
        var menuButtons = [
            new dm.widgets.MenuItem(
               "createLink",
               createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
               function(actionEvent) {
                   self.linkAnnotation();
                   self.hideHoverMenu();
               }.bind(this),
               'Link another resource to this document'
            ),
            new dm.widgets.MenuItem(
                "newTextAnno",
                createButtonGenerator("atb-radialmenu-button icon-pencil"),
                function(actionEvent) {
                    self.createTextAnno(self.getUri());

                    self.hideHoverMenu();
                },
                'Annotate this canvas'
            )
        ];
    }
    else {
        var menuButtons = [];
        this.setTitleEditable(false);
    }
    this.addHoverMenuListenersToElement(this.documentIcon, menuButtons, this.getUri.bind(this));
};

dm.viewer.CanvasViewer.prototype.handleDocumentIconClick_ = function(event) {
   event.stopPropagation();

   var eventDispatcher = this.clientApp.getEventDispatcher();
   var event = new dm.events.ResourceClick(this.getResourceId(), eventDispatcher, this);
   eventDispatcher.dispatchEvent(event);
};

dm.viewer.CanvasViewer.prototype.getUri = function() {
    if (this.viewer.mainViewport.canvas) {
        return this.viewer.mainViewport.canvas.getUri();
    }
    else {
        return '';
    }
};

dm.viewer.CanvasViewer.prototype.getResourceId = dm.viewer.CanvasViewer.prototype.getUri;

dm.viewer.CanvasViewer.prototype.setupControlEventListeners = function() {
    var panZoomControl = this.viewer.mainViewport.getControl('PanZoomGesturesControl');
    if (panZoomControl) {
        panZoomControl.addEventListener(
            'activated', function(event) {
                this.enableHoverMenus();
            }, false, this);
        panZoomControl.addEventListener(
            'deactivated', function(event) {
                this.disableHoverMenus();
            }, false, this);
        panZoomControl.addEventListener(
            'panstart', function(event) {
                this.isPanning = true;

                if (this.hoverMenusEnabled) {
                    this.disableHoverMenus();
                    goog.events.listenOnce(panZoomControl, 'panstop', function(event) {
                        this.enableHoverMenus();
                    }, false, this);
                }
            }, false, this);
        panZoomControl.addEventListener(
            'panstop', function(event) {
                this.isPanning = false;
                this.viewer.mainViewport.setCursor(null);
            }, false, this);
    }

    var zoomSlider = this.viewer.mainViewport.getControl('ZoomSliderControl');
    if (zoomSlider) {
        zoomSlider.addEventListener('slidestart', function(event) {
            if (this.hoverMenusEnabled) {
                this.disableHoverMenus();
                goog.events.listenOnce(zoomSlider, 'slidestop', this.enableHoverMenus.bind(this));
            }
        }, false, this);

        jQuery(zoomSlider.sliderDiv).mouseenter(function(e) {
            if (this.hoverMenusEnabled) {
                this.disableHoverMenus();
                jQuery(zoomSlider.sliderDiv).one('mouseleave', this.enableHoverMenus.bind(this));
            }
        }.bind(this));
    }
};

dm.viewer.CanvasViewer.prototype.setupEventListeners = function() {
    var self = this;
    var viewport = this.viewer.mainViewport;
    var eventDispatcher = this.clientApp.getEventDispatcher();

    this._addDocumentIconListeners();

    viewport.addEventListener('mouseup', this.onResourceClick, false, this);
    viewport.addEventListener('mouseover', this.onFeatureHover, false, this);
    viewport.addEventListener('mouseout', this.onFeatureMouseout, false, this);
    viewport.addEventListener('canvasAdded', this.onCanvasAdded, false, this);

    this.setupControlEventListeners();

/* SGB
*/
    goog.events.listen(eventDispatcher, 'resource deleted', function (e) {
                       if (e && e.target)
                       var id = e.target;
                       var uri = id;

                       try {
                       viewport.canvas.removeObjectByUri(uri);
                       } catch (error) {}
                       }, false, this);

    goog.events.listen(eventDispatcher, dm.events.LinkingModeExited.EVENT_TYPE,
                       this.handleLinkingModeExited, false, this);
};

dm.viewer.CanvasViewer.prototype.isEditable = function() {
    return this._isEditable;
};

dm.viewer.CanvasViewer.prototype.makeEditable = function() {
    if (!this.isEditable()) {
        this.viewer.makeEditable();
        this._isEditable = true;
        this.setTitleEditable(true);
        this._addDocumentIconListeners();
    }
};

dm.viewer.CanvasViewer.prototype.makeUneditable = function() {
    if (this.isEditable()) {
        this.viewer.makeUneditable();
        this.setTitleEditable(false);
        this.enableHoverMenus();

        this._isEditable = false;
        this._addDocumentIconListeners();

        if ( this.readOnlyClone ) {
          //  $(this.documentIcon).hide();
           var title = $(this.container.titleEl).closest(".atb-ViewerContainer-titleWrapper");
           title.addClass("read-only-clone");
           if ( this.databroker.projectController.canUserEditProject() ) {
              $(title).append("<div class='clone-header'>Read-Only Copy</div>");
           }
        }
    }
};

dm.viewer.CanvasViewer.prototype.onCanvasAdded = function(event) {
    this.setTitle(this.getCompleteTitle());
};

dm.viewer.CanvasViewer.prototype.setTitle = function(title) {
    var canvas = this.viewer.mainViewport.canvas;
    var canvasResource = this.databroker.getResource(canvas.getUri());
    this.databroker.dataModel.setTitle(canvasResource, title);
    this.setDisplayTitle(title);
    this.databroker.sync();
};

dm.viewer.CanvasViewer.prototype.setDisplayTitle = function(title) {
    if (this.container) {
        this.container.setTitle(title);
    }
};

dm.viewer.CanvasViewer.prototype.getCompleteTitle = function() {
    var canvas = this.viewer.mainViewport.canvas;
    var canvasResource = this.databroker.getResource(canvas.getUri());
    var title = this.databroker.dataModel.getTitle(canvasResource) || 'Untitled canvas';

    var parentResourceUri = this.databroker.dataModel.findManifestsContainingCanvas(canvasResource.uri)[0];
    if (parentResourceUri) {
        var parentResource = this.databroker.getResource(parentResourceUri);
        var parentTitle = this.databroker.dataModel.getTitle(parentResource);

        if (title.indexOf(parentTitle) == -1) {
            title = parentTitle + ', ' + title;
        }
    }

    return title;
};

dm.viewer.CanvasViewer.prototype.onFeatureHover = function(event) {
    var feature = event.feature;
    var uri = event.uri;

    if (uri == null || feature.type == 'image') return;
    if (this.isPanning) return;

    this.viewer.mainViewport.setCursor('pointer');

    this.mouseOverUri = uri;

    var id = uri;
    var self = this;
    var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(uri) || uri;
    var createButtonGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;

    var afterTimer = function () {
        if (this.mouseOverUri && this.mouseOverUri == uri) {
            if (this.isEditable()) {
                var menuButtons = [
                    new dm.widgets.MenuItem(
                        "deleteThisMarker",
                        createButtonGenerator("atb-radialmenu-button icon-remove"),
                        function(actionEvent) {
                            self.deleteFeature(uri);

                            self.hideHoverMenu();
                        },
                        'Delete this marker'
                    ),
                    new dm.widgets.MenuItem(
                        "hideMarker",
                        createButtonGenerator("atb-radialmenu-button icon-eye-close"),
                        function(actionEvent) {
                            self.hideFeature(uri);

                            self.hideHoverMenu();
                        },
                        'Temporarily hide this marker'
                    ),
                    new dm.widgets.MenuItem(
                        "linkAway",
                        createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
                        function(actionEvent) {
                            self.clientApp.createAnnoLink(specificResourceUri);
                            self.highlightFeature(uri);

                            if (self.annoTitlesList) {
                                self.annoTitlesList.loadForResource(specificResourceUri);
                            }
                        },
                        'Link another resource to this marker'
                    ),
                    new dm.widgets.MenuItem(
                        "newTextAnno",
                        createButtonGenerator("atb-radialmenu-button icon-pencil"),
                        function(actionEvent) {
                            self.createTextAnno(specificResourceUri);

                            if (self.annoTitlesList) {
                                self.annoTitlesList.loadForResource(specificResourceUri);
                            }
                        },
                        'Annotate this marker'
                    )
                ];
            }
            else {
                var menuButtons = [
                    new dm.widgets.MenuItem(
                        "hideMarker",
                        createButtonGenerator("atb-radialmenu-button icon-eye-close"),
                        function(actionEvent) {
                            self.hideFeature(uri);

                            self.hideHoverMenu();
                        },
                        'Temporarily hide this marker'
                    )
                ];
            }

            this.showHoverMenu(menuButtons, specificResourceUri);
        }
    }.bind(this);
    window.setTimeout(afterTimer, dm.viewer.Viewer.HOVER_SHOW_DELAY);
};

dm.viewer.CanvasViewer.prototype.onFeatureMouseout = function(event) {
    this.viewer.mainViewport.setCursor(null);

    this.mouseOverUri = null;
    this.maybeHideHoverMenu();
};

dm.viewer.CanvasViewer.prototype.onResourceClick = function(event) {
    var uri = event.uri;
    if (! uri) return;
    var feature = event.getFeature();
    var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(uri);

    DM.resourceSelected(uri);

    if (!specificResourceUri) return;
    if (! feature) return;
    if (feature.type == 'image') return;

    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new dm.events.ResourceClick(specificResourceUri, eventDispatcher, this);

    var createButtonGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;

    if (eventDispatcher.dispatchEvent(event)) {

    }
};

dm.viewer.CanvasViewer.prototype.loadResourceByUri = function(uri) {
    var resource = this.databroker.getResource(uri);

    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        //this.mainViewport.listenOnce("canvasRendered", this.mainViewport.zoomToFit, false, this.mainViewport);

        this.setCanvasByUri(resource.getUri()).done((function() {
            this.viewer.mainViewport.zoomToFit();
        }).bind(this));
        this.uri = resource.uri;
    }
    else if (resource.hasAnyType('oa:SpecificResource')) {
        this.loadSpecificResource(resource);
    }
    else if (resource.hasAnyType('oa:SvgSelector')) {
        var specificResource = this.databroker.getResource(this.databroker.dataModel.findSelectorSpecificResourceUri(uri));
        this.loadSpecificResource(specificResource);
    }
};

dm.viewer.CanvasViewer.prototype.resourceZoom = function( resource ) {
   this.viewer.mainViewport.pauseRendering();
   this.viewer.marqueeViewport.pauseRendering();

   var canvas = this.viewer.mainViewport.canvas;
   var featureUri = resource.getOneProperty('oa:hasSelector');
   var feature = canvas.getFabricObjectByUri(featureUri);

   if (feature) {
       canvas.hideMarkers();
       canvas.showObject(feature);

       this.viewer.mainViewport.zoomToFeatureByUri(featureUri);
   }
   else {
       console.error('Specific Resource', specificResource.uri, 'not found on canvas', canvas.getUri());
   }

   this.viewer.mainViewport.resumeRendering();
   this.viewer.marqueeViewport.resumeRendering();
};

dm.viewer.CanvasViewer.prototype.loadSpecificResource = function(specificResource) {
    specificResource = this.databroker.getResource(specificResource);

    var sourceUri = specificResource.getOneProperty('oa:hasSource');
    var deferredCanvas = this.setCanvasByUri(sourceUri);

    var zoomToFeature = function() {
       this.resourceZoom(specificResource);
    }.bind(this);

    deferredCanvas.progress(zoomToFeature).always(zoomToFeature);
};

dm.viewer.CanvasViewer.prototype.setCanvasByUri =
function(uri, opt_onLoad, opt_scope, opt_sequenceUris, opt_sequenceIndex) {
    this.showLoadingSpinner();

    var self = this;

    var deferredCanvas = dm.canvas.FabricCanvasFactory.createDeferredCanvas(
        uri,
        this.databroker,
        opt_sequenceUris,
        opt_sequenceIndex,
        opt_onLoad ? dm.Util.scopeAsyncHandler(opt_onLoad, opt_scope) : null
    );

    deferredCanvas.done(function(canvas) {
        self.hideLoadingSpinner();
    }).fail(function(canvas) {
        self.hideLoadingSpinner();
        self.flashErrorIcon();
    });

    this.viewer.addDeferredCanvas(deferredCanvas);

    return deferredCanvas;
};

dm.viewer.CanvasViewer.prototype.setCanvasById =
function(id, opt_onLoad, opt_scope, opt_sequenceUris, opt_sequenceIndex) {
    var uri = id;

    this.setCanvasByUri(uri, opt_onLoad, opt_scope, opt_sequenceUris,
                        opt_sequenceIndex);
};

dm.viewer.CanvasViewer.prototype.resize = function(width, height) {
    dm.viewer.Viewer.prototype.resize.call(this, width, height);

    this.viewer.resize(width, height);

    return this;
};



dm.viewer.CanvasViewer.prototype.deleteFeature = function(uri) {
   var viewport = this.viewer.mainViewport;
   viewport.canvas.removeObjectByUri(uri);
   viewport.requestFrameRender();

   var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(uri);

   var selectorResource = this.databroker.getResource(uri);
   var specificResource = this.databroker.getResource(specificResourceUri);
   var deleted = [];
   goog.structs.forEach(specificResource.getReferencingResources('oa:hasTarget'), function(anno) {
      var body = anno.getOneProperty('oa:hasBody');
      if ( body != null ) {
         var annoUri = anno.getUri();
         annoUri = annoUri.substring(1, annoUri.length - 1);
         deleted.push(annoUri);
      }
      anno.deleteProperty('oa:hasTarget', specificResource);
   }, this);

   selectorResource.delete();
   specificResource.delete();

   var event = new goog.events.Event('resource-deleted', uri);
   var eventDispatcher = this.clientApp.getEventDispatcher();
   eventDispatcher.dispatchEvent(event);

   // sync after every anno is removed
   this.databroker.sync();

   if (deleted.length > 0) {
      this.databroker.annotsDeleted(deleted);
   }
};

dm.viewer.CanvasViewer.prototype.hideFeature = function(uri) {
    var viewport = this.viewer.mainViewport;

    var obj = viewport.canvas.getFabricObjectByUri(uri);
    viewport.canvas.hideObject(obj);
    viewport.requestFrameRender();
};

/**
 * Start process of linking another resource to this document
 */
dm.viewer.CanvasViewer.prototype.linkAnnotation = function () {
   this.highlightDocumentIcon();
   this.hideHoverMenu();
   var canvasUri = this.viewer.mainViewport.canvas.getUri();
   var canvasResource = this.databroker.getResource(canvasUri);
   this.clientApp.createAnnoLink("<"+canvasResource.uri+">");
};

dm.viewer.CanvasViewer.prototype.createTextAnno = function(uri) {
   this.hideHoverMenu();
    var canvasUri = this.viewer.mainViewport.canvas.getUri();
    var canvasResource = this.databroker.getResource(canvasUri);
    var canvasTitle = this.databroker.dataModel.getTitle(canvasResource) || 'Untitled canvas';

    var databroker = this.databroker;
    var body = databroker.dataModel.createText('New annotation on ' + canvasTitle);

    var anno = databroker.dataModel.createAnno(body, uri);

    var textEditor = new dm.viewer.TextEditor(this.clientApp);
    textEditor.setPurpose('anno');
    this.openRelatedViewer(body.uri, textEditor);

    var email = $.trim($("#logged-in-email").text());
    textEditor.lockStatus(body.uri,true,true, email, null);
    textEditor.lockResource(body.uri,null,null);

    textEditor.loadResourceByUri(body.uri);
};

dm.viewer.CanvasViewer.HIGHLIGHTED_FEATURE_STYLE = {
    'stroke': '#D90000',
    'fill': '#D90000'
};

dm.viewer.CanvasViewer.prototype.highlightFeature = function(uri) {
    var feature = this.viewer.mainViewport.canvas.getFabricObjectByUri(uri);

    this.lastHighlightedFeatureUri = uri;
    this.lastHighlightedFeatureStyle = {
        stroke: feature.get('stroke'),
        fill: feature.get('fill')
    };

    feature.set(dm.viewer.CanvasViewer.HIGHLIGHTED_FEATURE_STYLE);
    this.viewer.mainViewport.requestFrameRender();
};

dm.viewer.CanvasViewer.prototype.unhighlightFeature = function(uri) {
    var feature = this.viewer.mainViewport.canvas.getFabricObjectByUri(uri);

    if (this.lastHighlightedFeatureStyle) {
        feature.set(this.lastHighlightedFeatureStyle);
    }

    this.viewer.mainViewport.requestFrameRender();
};

dm.viewer.CanvasViewer.prototype.flashFeatureHighlight = function(uri) {
    //Something may be buggy here
    this.highlightFeature(uri);

    dm.Util.timeoutSequence(dm.canvas.Canvas.FADE_SPEED, [
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

dm.viewer.CanvasViewer.prototype.handleLinkingModeExited = function(event) {
    var anno = this.databroker.getResource(event.uri);
    this.unHighlightDocumentIcon();
    if (this.lastHighlightedFeatureUri) {
        this.unhighlightFeature(this.lastHighlightedFeatureUri);
    }

    var targetsAndBodies = new goog.structs.Set(anno.getProperties('oa:hasTarget').concat(anno.getProperties('oa:hasBody')));

    goog.structs.forEach(targetsAndBodies, function (uri) {
        if (uri) {
            this.flashFeatureHighlight(uri);
        }
        else if (this.getUri() == uri) {
            this.flashDocumentIconHighlight();
        }
    }, this);
};
