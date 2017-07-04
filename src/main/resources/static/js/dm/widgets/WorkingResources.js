goog.provide('dm.widgets.WorkingResources');

goog.require('goog.dom.classes');
goog.require('goog.dom.DomHelper');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.positioning.ClientPosition');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Popup');
goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');

goog.require('dm.util.StyleUtil');

goog.require('dm.widgets.WorkingResourcesItem');
goog.require('dm.widgets.WorkingResourcesText');

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {dm.data.Databroker} databroker The databroker from which resources
 * should be requested.
 * @param {?goog.dom.DomHelper} opt_domHelper An optional google DomHelper
 * object to use for dom manipulation.
 */
dm.widgets.WorkingResources = function(databroker, opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.div = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources'
    });

    this.scrollingDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources-scroller'
    });

    this.dlg = new goog.fx.DragListGroup();
    this.dlg.setDraggerElClass('atb-WorkingResources-dragger');
    this.dlg.addDragList(this.scrollingDiv, goog.fx.DragListDirection.DOWN);
    this.dlg.init();
    goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.BEFOREDRAGSTART,
          this._onBeforeDragStart.bind(this));
    goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.DRAGSTART,
          this._onDragStart);
    goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.DRAGEND,
          this._onDragEnd.bind(this));

    this.div.appendChild(this.scrollingDiv);

    this.itemsByUri = new goog.structs.Map();
};
goog.inherits(dm.widgets.WorkingResources, goog.events.EventTarget);

/**
 * Loads the resources in a given manifest file
 * @param {string} uri The uri of the manifest.
 * @param {?Function} opt_doAfter An optional function to call after the manifest has loaded.
 */
dm.widgets.WorkingResources.prototype.loadManifest = function(uri, opt_deferred, opt_doAfter) {
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

dm.widgets.WorkingResources.prototype.clear = function() {
    jQuery(this.scrollingDiv).empty();
    this.itemsByUri.clear();
};

dm.widgets.WorkingResources.prototype.render = function(div) {
    div.appendChild(this.div);
};

dm.widgets.WorkingResources.prototype.setSize = function(width, height) {
    if (height == null) {
        height = width.height;
        width = width.width;
    }

    jQuery(this.div).width(width).height(height);
};

dm.widgets.WorkingResources.prototype.getElement = function() {
    return this.div;
};

dm.widgets.WorkingResources.prototype.getDomHelper = function() {
    return this.domHelper;
};

dm.widgets.WorkingResources.prototype.createItem = function(uri) {
    var resource = this.databroker.getResource(uri);
    var item = null;

    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        item = new dm.widgets.WorkingResourcesItem(
            this.databroker,
            uri,
            this.domHelper
        );
    }
    else if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.textTypes)) {
        item = new dm.widgets.WorkingResourcesText(
            this.databroker,
            uri,
            this.domHelper
        );
    }

    if (item) {
        if (this.databroker.user) {
            if (this.databroker.projectController.userHasPermissionOverProject(
                    this.databroker.user, this.uri, dm.data.ProjectController.PERMISSIONS.update)) {
                item.showRemoveButton();
                item.showReorderButton();
            }
        }

        this.updateItem(item);
    }


    return item;
};

dm.widgets.WorkingResources.EVENT_TYPES = {
    'openRequested': 'openRequested'
};

dm.widgets.WorkingResources.prototype.fireOpenRequest = function(item) {
    var event = new goog.events.Event('openRequested', this);
    event.uri = item.getUri();
    event.resource = this.databroker.getResource(event.uri);
    event.urisInOrder = item.manuscriptUrisInOrder;
    event.currentIndex = item.manuscriptIndex;

    this.dispatchEvent(event);
};

dm.widgets.WorkingResources.prototype.updateItemAttrs = function(item) {
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

dm.widgets.WorkingResources.THUMB_SIZE = new goog.math.Size(75, 75);

dm.widgets.WorkingResources.prototype.updateCurrentItems = function() {
    goog.structs.forEach(this.itemsByUri, function(item, uri) {
        this.updateItem(item);
    }, this);
};

dm.widgets.WorkingResources.prototype.updateItem = function(item, opt_isFullyLoaded) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);

    var title = this.databroker.dataModel.getTitle(resource);
    if (title) {
        item.setTitle(title);
    }

    this.updateItemAttrs(item);

    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        this.updateCanvas(item, opt_isFullyLoaded);
    }
    else if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.textTypes)) {
        this.updateText(item, opt_isFullyLoaded);
    }

    return item;
};

dm.widgets.WorkingResources.prototype.updateCanvas = function(item, opt_isFullyLoaded) {
    var uri = item.getUri();

    var imageSrc = this.databroker.dataModel.findCanvasImageUris(uri)[0];

    if (imageSrc) {
        var image = this.databroker.getResource(imageSrc);

        var size = new goog.math.Size(
            image.getOneProperty('exif:width'),
            image.getOneProperty('exif:height')
        ).scaleToFit(dm.widgets.WorkingResources.THUMB_SIZE);

        item.setThumb(
            this.databroker.getImageSrc(imageSrc, size.width, size.height),
            Math.round(size.width),
            Math.round(size.height)
        );
    }
};

dm.widgets.WorkingResources.prototype.updateFolio = function(folio) {
    var uri = folio.getUri();
    var resource = this.databroker.getResource(uri);

    var title = this.databroker.dataModel.getTitle(resource);
    if (title) {
        folio.setTitle(title);
    }
};

dm.widgets.WorkingResources.prototype.updateText = function(item) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);


};

dm.widgets.WorkingResources.prototype.refreshCurrentItems = function() {
    goog.structs.forEach(this.itemsByUri, function(item, uri) {
        this.refreshItem(item);
    }, this);
};

dm.widgets.WorkingResources.prototype.refreshItem = function(item) {
    var uri = item.getUri();
    var deferredResource = this.databroker.getDeferredResource(uri);

    if (goog.isFunction(item.isEmpty) && item.isEmpty()) {
        window.setTimeout(function () {
            item.showFoliaMessage('loading folia...');
        }, 0);
    }

    var withResource = function(resource) {
        if (goog.isFunction(item.hideFoliaMessage)) {
            item.hideFoliaMessage();
        }

        this.updateItem(item);
    };
    withResource = jQuery.proxy(withResource, this);

    deferredResource.progress(withResource).done(withResource);
};

dm.widgets.WorkingResources.prototype.handleItemAction = function(event) {
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

dm.widgets.WorkingResources.prototype.handleItemRemove = function(event) {
    var uri = event.target.getUri();
    var resource = this.databroker.getResource(uri);
    var item = event.target;

    this.removeItemByUri(uri);
    this.databroker.dataModel.removeResourceFromProject(this.uri, uri);
    this.databroker.sync();
};

dm.widgets.WorkingResources.prototype.addListenersToItem = function(item) {
    var resource = this.databroker.getResource(item.getUri());

    goog.events.listen(item, 'action', this.handleItemAction, false, this);
    goog.events.listen(item, 'remove-click', this.handleItemRemove, false, this);

    goog.events.listen(item.getElement(), 'click', function(event) {
        this.fireOpenRequest(item);
    }, false, this);
};

dm.widgets.WorkingResources.prototype.addItem = function(item) {
    this.itemsByUri.set(item.getUri(), item);

    this.addListenersToItem(item);

    item.render(this.scrollingDiv);
};

dm.widgets.WorkingResources.prototype.addItems = function(items) {
    goog.structs.forEach(items, function(item) {
        this.itemsByUri.set(item.getUri(), item);

        this.addListenersToItem(item);

        item.addToDragList(this.dlg, this.scrollingDiv);
    }, this);
};

dm.widgets.WorkingResources.prototype.removeItemByUri = function(uri) {
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

dm.widgets.WorkingResources.prototype._onBeforeDragStart = function(event) {
   if (!goog.dom.classes.has(event.event.target, "atb-WorkingResourcesItem-reorder")) {
      event.preventDefault();
      event.stopPropagation();
   }
};

dm.widgets.WorkingResources.prototype._onDragStart = function(event) {
   jQuery(event.draggerEl).width(jQuery(event.currDragItem).width());
};

dm.widgets.WorkingResources.prototype._onDragEnd = function(event) {
   var itemUris = jQuery(".atb-WorkingResourcesItem").map(function() { return jQuery(this).data("uri"); }).toArray();
  //  this.databroker.projectController.reorderProjectContents(this.uri, itemUris);
};
