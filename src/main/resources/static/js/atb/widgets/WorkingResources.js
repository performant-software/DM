goog.provide('atb.widgets.WorkingResources');

goog.require('atb.util.StyleUtil');
goog.require('atb.widgets.WorkingResourcesFolio');
goog.require('atb.widgets.WorkingResourcesItem');
goog.require('atb.widgets.WorkingResourcesManuscript');
goog.require('atb.widgets.WorkingResourcesText');
goog.require('goog.dom.DomHelper');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.positioning.ClientPosition');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Popup');
goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {sc.data.Databroker} databroker The databroker from which resources
 * should be requested.
 * @param {?goog.dom.DomHelper} opt_domHelper An optional google DomHelper
 * object to use for dom manipulation.
 */
atb.widgets.WorkingResources = function(databroker, opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.div = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources'
    });

    this.scrollingDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources-scroller'
    });

    this.div.appendChild(this.scrollingDiv);

    this.itemsByUri = new goog.structs.Map();
};
goog.inherits(atb.widgets.WorkingResources, goog.events.EventTarget);

/**
 * Loads the resources in a given manifest file
 * @param {string} uri The uri of the manifest.
 * @param {?Function} opt_doAfter An optional function to call after the manifest has loaded.
 */
atb.widgets.WorkingResources.prototype.loadManifest = function(uri, opt_deferred, opt_doAfter) {
    this.uri = uri;

    var withManifest = function(manifest) {
        this.clear();

        var resourceUris = this.databroker.projectController.findProjectContents(uri);

        var items = [];

        for (var i = 0, len = resourceUris.length; i < len; i++) {
            var resourceUri = resourceUris[i];

            var item = this.createItem(resourceUri);

            if (item) {
                items.push(item);
            }
        }

        this.addItems(items);

        if (goog.isFunction(opt_doAfter)) {
            opt_doAfter();
        }
    }.bind(this);

    if (opt_deferred) {
        var deferredManifest = this.databroker.getDeferredResource(uri);
        // deferredManifest.progress(withManifest).done(withManifest);
        deferredManifest.done(withManifest);
    }
    else {
        withManifest();
        if (goog.isFunction(opt_doAfter)) {
            opt_doAfter();
        }
    }
};

atb.widgets.WorkingResources.prototype.clear = function() {
    jQuery(this.scrollingDiv).empty();
    this.itemsByUri.clear();
};

atb.widgets.WorkingResources.prototype.render = function(div) {
    div.appendChild(this.div);
};

atb.widgets.WorkingResources.prototype.setSize = function(width, height) {
    if (height == null) {
        height = width.height;
        width = width.width;
    }

    jQuery(this.div).width(width).height(height);
};

atb.widgets.WorkingResources.prototype.getElement = function() {
    return this.div;
};

atb.widgets.WorkingResources.prototype.getDomHelper = function() {
    return this.domHelper;
};

atb.widgets.WorkingResources.prototype.createItem = function(uri) {
    var resource = this.databroker.getResource(uri);
    var item = null;

    if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.manifestTypes)) {
        item = new atb.widgets.WorkingResourcesManuscript(
            this.databroker,
            uri,
            this.domHelper
        );
    }
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
        item = new atb.widgets.WorkingResourcesItem(
            this.databroker,
            uri,
            this.domHelper
        );
    }
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.textTypes)) {
        item = new atb.widgets.WorkingResourcesText(
            this.databroker,
            uri,
            this.domHelper
        );
    }

    if (item) {
        if (this.databroker.user) {
            if (this.databroker.projectController.userHasPermissionOverProject(
                    this.databroker.user, this.uri, sc.data.ProjectController.PERMISSIONS.update)) {
                item.showRemoveButton();
            }
        }

        this.updateItem(item);
    }

   
    return item;
};

atb.widgets.WorkingResources.EVENT_TYPES = {
    'openRequested': 'openRequested'
};

atb.widgets.WorkingResources.prototype.fireOpenRequest = function(item) {
    var event = new goog.events.Event('openRequested', this);
    event.uri = item.getUri();
    event.resource = this.databroker.getResource(event.uri);
    event.urisInOrder = item.manuscriptUrisInOrder;
    event.currentIndex = item.manuscriptIndex;

    this.dispatchEvent(event);
};

atb.widgets.WorkingResources.prototype.updateItemAttrs = function(item) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);

    if (resource.hasPredicate('tei:institution')) {
        item.setAttribute('Institution', resource.getOneProperty('tei:institution'));
    }
    if (resource.hasPredicate('tei:repository')) {
        item.setAttribute('Repository', resource.getOneProperty('tei:repository'));
    }
    if (resource.hasPredicate('tei:collection')) {
        item.setAttribute('Collection', resource.getOneProperty('tei:country'));
    }
    if (resource.hasPredicate('tei:settlement')) {
        item.setAttribute('Settlement', resource.getOneProperty('tei:settlement'));
    }
    if (resource.hasPredicate('tei:country')) {
        item.setAttribute('Country', resource.getOneProperty('tei:country'));
    }
};

atb.widgets.WorkingResources.THUMB_SIZE = new goog.math.Size(75, 75);

atb.widgets.WorkingResources.prototype.updateCurrentItems = function() {
    goog.structs.forEach(this.itemsByUri, function(item, uri) {
        this.updateItem(item);
    }, this);
};

atb.widgets.WorkingResources.prototype.updateItem = function(item, opt_isFullyLoaded) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);

    var title = this.databroker.dataModel.getTitle(resource);
    if (title) {
        item.setTitle(title);
    }

    this.updateItemAttrs(item);

    if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.manifestTypes)) {
        this.updateManuscript(item, opt_isFullyLoaded);
    }
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
        this.updateCanvas(item, opt_isFullyLoaded);
    }
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.textTypes)) {
        this.updateText(item, opt_isFullyLoaded);
    }

    return item;
};

atb.widgets.WorkingResources.prototype.updateManuscript = function(item, opt_isFullyLoaded) {
    var uri = item.getUri();

    item.setTooltip('Show the folia in ' +
                    item.getTitle() || 'this manuscript');

    var sequenceUri = this.databroker.dataModel.findManuscriptSequenceUris(uri)[0];
    if (sequenceUri) {
        var sequence = this.databroker.getResource(sequenceUri);
        var foliaUris = this.databroker.getListUrisInOrder(sequence.getOneProperty('sc:hasCanvases'));
        if (foliaUris.length > 0) {
            var thumbSrc = this.databroker.dataModel.findCanvasImageUris(foliaUris[0])[0];
            if (thumbSrc) {
                var image = this.databroker.getResource(thumbSrc);
                var size = new goog.math.Size(
                    image.getOneProperty('exif:width'),
                    image.getOneProperty('exif:height')
                ).scaleToFit(atb.widgets.WorkingResources.THUMB_SIZE);

                var src = thumbSrc + '?w=' + Math.round(size.width) + '&h=' + 
                    Math.round(size.height);

                item.setThumb(src, size.width, size.height);
            }

            for (var i = 0, len = foliaUris.length; i < len; i++) {
                var folioUri = foliaUris[i];

                if (! item.containsFolio(folioUri)) {
                    var folioItem = new atb.widgets.WorkingResourcesFolio(
                        this.databroker,
                        folioUri,
                        this.domHelper
                    );
                    this.addListenersToItem(folioItem);
                    item.addFolio(folioItem);
                }
                else {
                    var folioItem = item.getFolio(folioUri);
                }

                this.updateFolio(folioItem);
                folioItem.manuscriptUrisInOrder = foliaUris;
                folioItem.manuscriptIndex = i;
            }
        }
        else if (opt_isFullyLoaded) {
            item.showFoliaMessage('empty manuscript');
        }
    }
};

atb.widgets.WorkingResources.prototype.updateCanvas = function(item, opt_isFullyLoaded) {
    var uri = item.getUri();

    var imageSrc = this.databroker.dataModel.findCanvasImageUris(uri)[0];

    if (imageSrc) {
        var image = this.databroker.getResource(imageSrc);

        var size = new goog.math.Size(
            image.getOneProperty('exif:width'),
            image.getOneProperty('exif:height')
        ).scaleToFit(atb.widgets.WorkingResources.THUMB_SIZE);

        item.setThumb(
            this.databroker.getImageSrc(imageSrc, size.width, size.height),
            Math.round(size.width),
            Math.round(size.height)
        );
    }
};

atb.widgets.WorkingResources.prototype.updateFolio = function(folio) {
    var uri = folio.getUri();
    var resource = this.databroker.getResource(uri);

    var title = this.databroker.dataModel.getTitle(resource);
    if (title) {
        folio.setTitle(title);
    }
};

atb.widgets.WorkingResources.prototype.updateText = function(item) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);

    
};

atb.widgets.WorkingResources.prototype.refreshCurrentItems = function() {
    goog.structs.forEach(this.itemsByUri, function(item, uri) {
        this.refreshItem(item);
    }, this);
};

atb.widgets.WorkingResources.prototype.refreshItem = function(item) {
    var uri = item.getUri();
    var deferredResource = this.databroker.getDeferredResource(uri);

    if (goog.isFunction(item.isEmpty) && item.isEmpty()) {
        window.setTimeout(function () {
            item.showFoliaMessage('loading folia...');
        }, 0);
    }

    var withResource = function(resource) {
        if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.manifestTypes)) {
            var onUpdate = function(sequence) {
                this.updateItem(item);
            }.bind(this);

            var onLoaded = function(sequence) {
                this.updateItem(item, true);
            }.bind(this);
            
            var aggregatedUris = this.databroker.dataModel.findManuscriptAggregationUris(uri);
            for (var i=0; i<aggregatedUris.length; i++) {
                this.databroker.getDeferredResource(aggregatedUris[i]).
                    progress(onUpdate).done(onLoaded);
            }
             
            /*
            var sequenceUri = this.databroker.dataModel.findManuscriptSequenceUris(uri)[0];
            var imageAnnoUri = this.databroker.dataModel.findManuscriptImageAnnoUris(uri)[0];
            if (sequenceUri) {
                this.databroker.getDeferredResource(sequenceUri).
                    progress(withSequence).done(withSequence);
            }
            if (imageAnnoUri) {
                this.databroker.getDeferredResource(imageAnnoUri).
                    progress(withSequence).done(withSequence);
            }
            */
        }

        if (goog.isFunction(item.hideFoliaMessage)) {
            item.hideFoliaMessage();
        }

        this.updateItem(item);
    };
    withResource = jQuery.proxy(withResource, this);

    deferredResource.progress(withResource).done(withResource);
};

atb.widgets.WorkingResources.prototype.handleItemAction = function(event) {
    var uri = event.target.getUri();
    var resource = this.databroker.getResource(uri);
    var item = event.target;

    this.lastClickedUri = uri;

    if (goog.isFunction(item.isEmpty)) {
        if (item.isEmpty()) {
            this.refreshItem(item);
        }
    }
};

atb.widgets.WorkingResources.prototype.handleItemRemove = function(event) {
    var uri = event.target.getUri();
    var resource = this.databroker.getResource(uri);
    var item = event.target;

    this.removeItemByUri(uri);
    this.databroker.dataModel.removeResourceFromProject(this.uri, uri);
    this.databroker.sync();
};

atb.widgets.WorkingResources.prototype.addListenersToItem = function(item) {
    var resource = this.databroker.getResource(item.getUri());

    goog.events.listen(item, 'action', this.handleItemAction, false, this);
    goog.events.listen(item, 'remove-click', this.handleItemRemove, false, this);

    if (! resource.hasAnyType(sc.data.DataModel.VOCABULARY.manifestTypes)) {
        goog.events.listen(item.getElement(), 'click', function(event) {
            this.fireOpenRequest(item);
        }, false, this);
    }
};

atb.widgets.WorkingResources.prototype.addItem = function(item) {
    this.itemsByUri.set(item.getUri(), item);

    this.addListenersToItem(item);

    item.render(this.scrollingDiv);
};

atb.widgets.WorkingResources.prototype.addItems = function(items) {
    var fragment = this.domHelper.getDocument().createDocumentFragment();

    goog.structs.forEach(items, function(item) {
        this.itemsByUri.set(item.getUri(), item);

        this.addListenersToItem(item);

        item.render(fragment);
    }, this);

    this.scrollingDiv.appendChild(fragment);
};

atb.widgets.WorkingResources.prototype.removeItemByUri = function(uri) {
    var item = this.itemsByUri.get(uri);

    if (! item) {
        return false;
    }
    else {
        var elem = item.getElement();
        jQuery(elem).animate({
            left: '100%',
            opacity: 0.0,
            height: 0
        }, 300, function() {
            jQuery(this).detach();
        });

        this.itemsByUri.remove(uri);

        return true;
    }
};
