goog.provide('atb.widgets.WorkingResources');

goog.require('atb.util.StyleUtil');
goog.require('atb.widgets.PanelChooser');
goog.require('atb.widgets.WorkingResourcesFolio');
goog.require('atb.widgets.WorkingResourcesItem');
goog.require('atb.widgets.WorkingResourcesManuscript');
goog.require('goog.dom.DomHelper');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.positioning.ClientPosition');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Popup');
goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');
goog.require('jquery.jQuery');

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

    this.setupPanelChooser();
    this.div.appendChild(this.scrollingDiv);

    this.itemsByUri = new goog.structs.Map();
};
goog.inherits(atb.widgets.WorkingResources, goog.events.EventTarget);

/**
 * Loads all working resources for a given user
 * @param  {strint} username The user's username.
 */
atb.widgets.WorkingResources.prototype.loadUser = function(username) {

};

/**
 * Loads the resources in a given manifest file
 * @param {string} uri The uri of the manifest.
 * @param {?Function} opt_doAfter An optional function to call after the manifest has loaded.
 */
atb.widgets.WorkingResources.prototype.loadManifest =
function(uri, opt_doAfter) {
    var withManifest = function(manifest) {
        this.clear();

        var aggregateUris = this.databroker.getAggregationContentsUris(uri);
        var aggregateUrisInOrder = this.databroker.getListUrisInOrder(uri);

        if (aggregateUrisInOrder.length > 0) {
            var resourceUris = aggregateUrisInOrder;
        }
        else {
            var resourceUris = aggregateUris;
        }

        for (var i = 0, len = resourceUris.length; i < len; i++) {
            var resourceUri = resourceUris[i];

            var item = this.createItem(resourceUri);

            this.updateItem(item);

            this.addItem(item);
        }
    };
    withManifest = jQuery.proxy(withManifest, this);

    var deferredManifest = this.databroker.getDeferredResource(uri);
    // deferredManifest.progress(withManifest).done(withManifest);
    deferredManifest.done(withManifest);
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

atb.widgets.WorkingResources.MANUSRCIPT_TYPES = ['dms:Manifest'];
atb.widgets.WorkingResources.CANVAS_TYPES = ['dms:Canvas'];

atb.widgets.WorkingResources.prototype.createItem = function(uri) {
    var resource = this.databroker.getResource(uri);

    if (resource.hasAnyType(atb.widgets.WorkingResources.MANUSRCIPT_TYPES)) {
        var item = new atb.widgets.WorkingResourcesManuscript(
            this.databroker,
            uri,
            this.domHelper
        );
    }
    else if (resource.hasAnyType(atb.widgets.WorkingResources.CANVAS_TYPES)) {
        var item = new atb.widgets.WorkingResourcesItem(
            this.databroker,
            uri,
            this.domHelper
        );
    }

    this.updateItem(item);

    return item;
};

atb.widgets.WorkingResources.prototype.setupPanelChooser = function() {
    var hoverMenuDiv = this.domHelper.createDom('div', {
        'class': 'basic-popup atb-WorkingResources-hoverMenu'
    });
    var hoverMenuCalloutTriangle = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources-calloutTriangle'
    });
    hoverMenuDiv.appendChild(hoverMenuCalloutTriangle);
    this.domHelper.getDocument().body.appendChild(hoverMenuDiv);
    this.hoverMenuPopup = new goog.ui.Popup(hoverMenuDiv);
    this.hoverMenuPopup.setVisible(false);
    goog.events.listen(hoverMenuDiv, 'mouseover', function(event) {
         this.mouseIsOverFloatingMenu = true;
     }, false, this);
    goog.events.listen(hoverMenuDiv, 'mouseout', function(event) {
        this.mouseIsOverFloatingMenu = false;
    }, false, this);

    this.panelChooserDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResources-panelChooser'
    });

    goog.events.listen(this.panelChooserDiv, 'click', function(event) {
        event.stopPropagation();
        this.hidePanelChooser();
    }, false, this);

    this.panelChooser = new atb.widgets.PanelChooser(
        jQuery.proxy(this.handlePanelChoice, this),
        this.domHelper
    );
    this.panelChooser.render(this.panelChooserDiv);

    hoverMenuDiv.appendChild(this.panelChooserDiv);
};

atb.widgets.WorkingResources.prototype.showPanelChooser = function(item) {
    var itemElement = item.getElement();
    var itemOffset = goog.style.getClientPosition(itemElement);
    var itemSize = goog.style.getSize(itemElement);
    var uri = item.getUri();

    this.currentlyHoveredItem = item;

    var hoverMenuDiv = this.hoverMenuPopup.getElement();
    var chooserSize = this.panelChooser.getSize();

    var position = atb.util.StyleUtil.maintainPopupPositionWithinWindow(
        new goog.math.Coordinate(itemOffset.x + itemSize.width / 2 - chooserSize.width / 2,
                                 itemOffset.y + itemSize.height),
        hoverMenuDiv,
        this.domHelper
    );
    this.hoverMenuPopup.setPosition(
        new goog.positioning.ClientPosition(position)
    );

    this.hoverMenuPopup.setVisible(true);
};

atb.widgets.WorkingResources.prototype.hidePanelChooser = function() {
    this.hoverMenuPopup.setVisible(false);

    this.cancelMaybeHideHoverMenuCommand();

    this.currentlyHoveredItem = null;
};

atb.widgets.WorkingResources.prototype.maybeHidePanelChooser = function() {
    if (this.maybeHideHoverMenuTimeoutId != null) {
        return;
    }

    var afterTimer = function() {
        this.cancelMaybeHideHoverMenuCommand();

        if (! (this.mouseIsOverFloatingMenu ||
               this.mouseIsOverFloatingMenuParent)) {
            this.hidePanelChooser();
        }
    };
    afterTimer = jQuery.proxy(afterTimer, this);
    this.maybeHideHoverMenuTimeoutId = window.setTimeout(afterTimer,
                                                         atb.widgets.WorkingResources.HOVER_HIDE_DELAY);
};

atb.widgets.WorkingResources.prototype.cancelMaybeHideHoverMenuCommand =
function() {
    if (this.maybeHideHoverMenuTimeoutId != null) {
        window.clearTimeout(this.maybeHideHoverMenuTimeoutId);
        this.maybeHideHoverMenuTimeoutId = null;
    }
};

atb.widgets.WorkingResources.EVENT_TYPES = {
    'panelChosen': 'panelChosen'
};

atb.widgets.WorkingResources.prototype.handlePanelChoice =
function(index, chooser) {
    var uri = this.currentlyHoveredItem.getUri();

    var event = new goog.events.Event('panelChosen', this);
    event.uri = uri;
    event.panelId = index;
    event.resource = this.databroker.getResource(uri);
    event.urisInOrder = this.currentlyHoveredItem.manuscriptUrisInOrder;
    event.currentIndex = this.currentlyHoveredItem.manuscriptIndex;

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

atb.widgets.WorkingResources.prototype.updateItem = function(item) {
    var uri = item.getUri();
    var resource = this.databroker.getResource(uri);

    if (resource.hasPredicate('dc:title')) {
        item.setTitle(resource.getOneProperty('dc:title'));
    }

    this.updateItemAttrs(item);

    if (resource.hasAnyType(atb.widgets.WorkingResources.MANUSRCIPT_TYPES)) {
        this.updateManuscript(item);
    }
    else if (resource.hasAnyType(atb.widgets.WorkingResources.CANVAS_TYPES)) {
        this.updateCanvas(item);
    }

    return item;
};

atb.widgets.WorkingResources.prototype.updateManuscript = function(item) {
    var uri = item.getUri();

    item.setTooltip('Show the folia in ' +
                    item.getTitle() || 'this manuscript');

    var thumbSrc = this.databroker.getCanvasImageUris(uri)[0];

    if (thumbSrc) {
        var image = this.databroker.getResource(thumbSrc);

        var size = new goog.math.Size(
            image.getOneProperty('exif:width'),
            image.getOneProperty('exif:height')
        ).scaleToFit(atb.widgets.WorkingResources.THUMB_SIZE);

        var src = thumbSrc + '?w=' + Math.round(size.width) + '&h=' + Math.round(size.height);

        item.setThumb(src, size.width, size.height);
    }

    var sequenceUri = this.databroker.getManuscriptSequenceUris(uri)[0];
    if (sequenceUri) {
        var foliaUris = this.databroker.getListUrisInOrder(sequenceUri);

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
};

atb.widgets.WorkingResources.prototype.updateCanvas = function(item) {
    var uri = item.getUri();

    var imageSrc = this.databroker.getCanvasImageUris(uri)[0];

    if (imageSrc) {
        var image = this.databroker.getResource(imageSrc);
    }

    var size = new goog.math.Size(
        image.getOneProperty('exif:width'),
        image.getOneProperty('exif:height')
    ).scaleToFit(atb.widgets.WorkingResources.THUMB_SIZE);

    var src = firstImageSrc + '?w=' + size.width + '&h=' + size.height;

    item.setThumb(firstImageSrc, size.width, size.height);
};

atb.widgets.WorkingResources.prototype.updateFolio = function(folio) {
    var uri = folio.getUri();
    var resource = this.databroker.getResource(uri);

    if (resource.hasPredicate('dc:title')) {
        folio.setTitle(resource.getOneProperty('dc:title'));
    }
};

atb.widgets.WorkingResources.prototype.refreshItem = function(item) {
    var uri = item.getUri();
    var deferredResource = this.databroker.getDeferredResource(uri);

    if (goog.isFunction(item.isEmpty) && item.isEmpty()) {
        window.setTimeout(function () {
            item.showFoliaMessage('Loading folia...');
        }, 0)
    }

    var withResource = function(resource) {
        var sequenceUri = this.databroker.getManuscriptSequenceUris(uri)[0];
        var imageAnnoUri = this.databroker.getManuscriptImageAnnoUris(uri)[0];

        if (resource.hasAnyType(
                atb.widgets.WorkingResources.MANUSRCIPT_TYPES)) {
            var withSequence = function(sequence) {
                this.updateItem(item);
            };
            withSequence = jQuery.proxy(withSequence, this);

            if (sequenceUri) {
                this.databroker.getDeferredResource(sequenceUri).
                progress(withSequence).done(withSequence);
            }
            if (imageAnnoUri) {
                this.databroker.getDeferredResource(imageAnnoUri).
                progress(withSequence).done(withSequence);
            }
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

atb.widgets.WorkingResources.HOVER_SHOW_DELAY = 300;
atb.widgets.WorkingResources.HOVER_HIDE_DELAY = 200;

atb.widgets.WorkingResources.prototype.addListenersToItem = function(item) {
    var resource = this.databroker.getResource(item.getUri());

    goog.events.listen(item, 'action', this.handleItemAction,
                       false, this);

    if (! resource.hasAnyType(atb.widgets.WorkingResources.MANUSRCIPT_TYPES)) {
        var onMouseover = function(event) {
            this.mouseIsOverFloatingMenuParent = true;

            var afterTimer = function() {
                if (this.mouseIsOverFloatingMenuParent) {
                    this.showPanelChooser(item);
                }
            };
            afterTimer = jQuery.proxy(afterTimer, this);
            var t = window.setTimeout(
                afterTimer,
                atb.widgets.WorkingResources.HOVER_SHOW_DELAY
            );
            goog.events.listenOnce(event.target, 'mouseout', function(event) {
                window.clearTimeout(t);

                this.mouseIsOverFloatingMenuParent = false;

                this.maybeHidePanelChooser();
            }, false, this);
        };

        goog.events.listen(item.getElement(), 'mouseover', onMouseover,
                           false, this);
    }
};

atb.widgets.WorkingResources.prototype.addItem = function(item) {
    this.itemsByUri.set(item.getUri(), item);

    this.addListenersToItem(item);

    item.render(this.scrollingDiv);
};

atb.widgets.WorkingResources.prototype.removeItemByUri = function(uri) {
    var item = this.itemsByUri.get(uri);

    if (! item) {
        return false;
    }
    else {
        var elem = item.getElement();
        jQuery(elem).detach();

        this.itemsByUri.remove(uri);

        return true;
    }
};
