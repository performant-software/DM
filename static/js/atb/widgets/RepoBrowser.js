goog.provide('atb.widgets.RepoBrowser');

goog.require('sc.RepoBrowser');
goog.require('atb.viewer.CanvasViewer');
goog.require('goog.dom');
goog.require('goog.dom.DomHelper');

/**
 * A drill-down browser for viewing RDF Manuscript Repositories and Collections
 *
 * @extends {sc.RepoBrowser}
 */
atb.widgets.RepoBrowser = function (clientApp, options) {
    if (! options) {
        options = {};
    }
    options = jQuery.extend(true, {
        databroker: clientApp.getDatabroker()
    }, options);
    sc.RepoBrowser.call(this, options);

    this.clientApp = clientApp;
    this.domHelper = new goog.dom.DomHelper();

    this.setupPanelChooser();
    this.addEventListener('add_request', this.addHandler, false, this);

    var timeoutIds = [];

    this.addEventListener('mouseover', function(event) {
        if (event.resource.hasAnyType('dms:Canvas')) {
            this.mouseIsOverFloatingMenuParent = true;

            var afterTimer = function() {
                if (this.mouseIsOverFloatingMenuParent) {
                    this.showPanelChooser(event.item);
                }
            };
            afterTimer = jQuery.proxy(afterTimer, this);
            var t = window.setTimeout(
                afterTimer,
                atb.widgets.WorkingResources.HOVER_SHOW_DELAY
            );
            timeoutIds.push(t);
        }
    }, false, this);
    this.addEventListener('mouseout', function(event) {
        for (var i=0, len=timeoutIds.length; i<len; i++) {
            window.clearTimeout(timeoutIds[i]);
        }
        timeoutIds = [];

        this.mouseIsOverFloatingMenuParent = false;

        this.maybeHidePanelChooser();
    }, false, this);
};
goog.inherits(atb.widgets.RepoBrowser, sc.RepoBrowser);

atb.widgets.RepoBrowser.RESOURCE_TYPES = {
    canvases: ['dms:Canvas']
};

atb.widgets.RepoBrowser.prototype.render = function (div) {
    sc.RepoBrowser.prototype.render.call(this, div);
    
    jQuery(this.baseDiv).addClass('atb-widgets-RepoBrowser');

    return this.baseDiv;
};

atb.widgets.RepoBrowser.prototype.addHandler = function(event) {
    var resource = this.databroker.getResource(event.uri);
    
    return true;
};

atb.widgets.RepoBrowser.HOVER_SHOW_DELAY = 300;
atb.widgets.RepoBrowser.HOVER_HIDE_DELAY = 200;

atb.widgets.RepoBrowser.prototype.setupPanelChooser = function() {
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

atb.widgets.RepoBrowser.prototype.showPanelChooser = function(item) {
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

atb.widgets.RepoBrowser.prototype.hidePanelChooser = function() {
    this.hoverMenuPopup.setVisible(false);

    this.cancelMaybeHideHoverMenuCommand();

    this.currentlyHoveredItem = null;
};

atb.widgets.RepoBrowser.prototype.maybeHidePanelChooser = function() {
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
    this.maybeHideHoverMenuTimeoutId = window.setTimeout(
        afterTimer,
        atb.widgets.RepoBrowser.HOVER_HIDE_DELAY
    );
};

atb.widgets.RepoBrowser.prototype.cancelMaybeHideHoverMenuCommand =
function() {
    if (this.maybeHideHoverMenuTimeoutId != null) {
        window.clearTimeout(this.maybeHideHoverMenuTimeoutId);
        this.maybeHideHoverMenuTimeoutId = null;
    }
};

atb.widgets.RepoBrowser.EVENT_TYPES = {
    'panelChosen': 'panelChosen'
};

atb.widgets.RepoBrowser.prototype.handlePanelChoice =
function(index, chooser) {
    var uri = this.currentlyHoveredItem.getUri();

    var chosenEvent = new goog.events.Event('panelChosen', this);
    chosenEvent.uri = uri;
    chosenEvent.panelId = index;
    chosenEvent.resource = this.databroker.getResource(uri);
    chosenEvent.item = this.currentlyHoveredItem;
    chosenEvent.urisInOrder = this.currentlyHoveredItem.getUrisInOrder();
    chosenEvent.currentIndex = this.currentlyHoveredItem.getCurrentIndex();

    this.dispatchEvent(chosenEvent);
};