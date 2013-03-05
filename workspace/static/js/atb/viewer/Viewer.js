goog.provide('atb.viewer.Viewer');

goog.require('atb.util.StyleUtil');
goog.require('atb.Util');
goog.require('goog.ui.Popup');
//goog.require('goog.fx.dom.FadeIn');
//goog.require('goog.fx.dom.FadeOut');
goog.require('atb.widgets.Toolbar');
goog.require('atb.ui.AnnoTitlesList');

goog.require('jquery.jQuery');

goog.require('goog.math.Coordinate');
goog.require('goog.events.EventTarget');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');

/**
 * Defines a generic Viewer which can be loaded into a ViewerContainer
 *
 * @note Never create dom elements in the constructor, they should be created in
 * render()
 *
 * @constructor
 * @abstract
 *
 * @extends {goog.events.EventTarget}
 *
 * @param clientApp {atb.ClientApp};
 */
atb.viewer.Viewer = function (clientApp) {
    goog.events.EventTarget.call(this);
    
    /** @type {string} */
    this.viewerType = 'viewer';
    
    this.setClientApp(clientApp);
    /** @type {atb.WebService}*/
    this.webService = this.clientApp.getWebService();
    
    /** @type {sc.data.Databroker} */
    this.databroker = this.clientApp.getDatabroker();
    
    /** @type {HtmlElement} */
    this.rootDiv = null;
    
    /** @type {goog.math.Coordinate} */
    this.mousePosition = new goog.math.Coordinate(0,0);
    
    this.mouseIsOverFloatingMenu = false;
    this.mouseIsOverFloatingMenuParent = false;
    
    /** @type {boolean} */
    this.hoverMenusEnabled = true;
    /** @type {boolean} */
    this.isShowingHoverMenu = false;
    
    /** @type {number} */
    this.timeOfLastThumbnailRegistration = 0;
    
    goog.events.listen(this, atb.events.ViewerHasEnteredBackground.EVENT_TYPE,
                       this.viewerHasEnteredBackground, false, this);
    goog.events.listen(this, 'viewer has reentered foreground',
                       this.viewerHasReenteredForeground, false, this);
    goog.events.listen(this, 'viewer will be purged',
                       this.viewerWillBePurged, false, this);
};
goog.inherits(atb.viewer.Viewer, goog.events.EventTarget);

atb.viewer.Viewer.VIEWER_TYPE = 'viewer';

/**
 * @param clientApp {atb.ClientApp}
 */
atb.viewer.Viewer.prototype.setClientApp = function (clientApp) {
    /** @type {atb.ClientApp} */
    this.clientApp = clientApp;
};

/**
 * @returns {atb.ClientApp}
 */
atb.viewer.Viewer.prototype.getClientApp = function () {
    return this.clientApp;
};

/**
 * @returns {string | null}
 */
atb.viewer.Viewer.prototype.getResourceId = function () {
    return this.resourceId;
};

/**
 * Should be overrided if the viewer needs to be resized programatically.
 * @param  {number} width     The width of the viewer.
 * @param  {number} height    The height of the viewer.
 * @return {atb.viewer.Viwer} this.
 */
atb.viewer.Viewer.prototype.resize = function(width, height) {
    
    return this;
};

/**
 * Is called the first time the viewer is rendered
 */
atb.viewer.Viewer.prototype.render = function () {
    /** @type {goog.dom.DomHelper} */
    this.domHelper = this.getDomHelper();
    
    /** @type {HtmlElement} */
    this.rootDiv = this.domHelper.createDom('div', {'class': 'atb-Viewer'});
    
    var spinnerTop = 70;
    var spinnerLeft = 50; // These coordinates will be changed when
                          // showLoadingSpinner() is called
    this.spinner = this.domHelper.createDom('div',
    {
        'style' : 'top:' + spinnerTop + 'px; left: ' + spinnerLeft + 'px;',
        'class' : 'atb-viewer-loadingSpinner'
    });
    jQuery(this.spinner).hide();
    this.rootDiv.appendChild(this.spinner);
    
    this.errorIcon = this.domHelper.createDom('div',
    {
        'style': 'top:' + spinnerTop + 'px; left: ' + spinnerLeft + 'px;',
        'class': 'atb-viewer-networkErrorIcon'
    });
    jQuery(this.errorIcon).hide();
    this.rootDiv.appendChild(this.errorIcon);

    
    this.messageDiv = this.domHelper.createDom(
        'div',
        {'class': 'atb-finder-blankIndicator'},
        'No Resources'
    );
    jQuery(this.messageDiv).hide();
    this.rootDiv.appendChild(this.messageDiv);
    
    var hoverMenuDiv = goog.dom.createDom('div',
                                      {'class': 'basic-popup atb-hoverMenu'});
    this.domHelper.getDocument().body.appendChild(hoverMenuDiv);
    this.hoverMenuPopup = new goog.ui.Popup(hoverMenuDiv);
//  this.hoverMenuPopup.setTransition(new goog.fx.dom.FadeIn(hoverMenuDiv, 100),
//                                  new goog.fx.dom.FadeOut(hoverMenuDiv, 200));
    
    goog.events.listen(this.rootDiv, 'mousemove', function (e) {
        this.mousePosition.x = e.clientX;
        this.mousePosition.y = e.clientY;
    }, false, this);
    
    goog.events.listen(this.domHelper.getWindow(), 'keydown',
                       this.handleKeyDown_, false, this);
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    goog.events.listen(eventDispatcher,
                       atb.events.LinkingModeEntered.EVENT_TYPE, function (e) {
                           this.disableHoverMenus();
                       }, false, this);
    goog.events.listen(eventDispatcher, atb.events.LinkingModeExited.EVENT_TYPE,
                       function (e) {
                           this.enableHoverMenus();
                       }, false, this);
    if (this.clientApp.isAnnoLinkingInProgress()) {
        this.disableHoverMenus();
    }

    //Remove in cleanup
    if (goog.isFunction(this.finishRender)) {
        this.finishRender();
    }
};

atb.viewer.Viewer.prototype.handleKeyDown_ = function (event) {
    if (this.isShowingHoverMenu && event.keyCode == goog.events.KeyCodes.ESC) {
        event.stopPropagation();
        
        this.hideHoverMenu();
    }
};

/**
 * Returns the root dom element of this viewer
 * @returns {HtmlElement}
 */
atb.viewer.Viewer.prototype.getElement = function () {
    if (! this.rootDiv) {
        this.render();
    }
    
    return this.rootDiv;
};

atb.viewer.Viewer.prototype.setContainer = function(container) {
    this.container = container;
};

atb.viewer.Viewer.prototype.getContainer = function() {
    return this.container;
};

/**
 * Returns this viewer's dom helper, or fetches it from the panel container if
 * necessary. If there is no panel container, an exception will be thrown.
 *
 * @returns {goog.dom.DomHelper}
 */
atb.viewer.Viewer.prototype.getDomHelper = function () {
    if (! this.domHelper) {
        if ( this.container ) {
            this.domHelper = this.container.getDomHelper();
        }
        else {
            throw "Viewer does not yet have a container";
        }
    }
    
    return this.domHelper;
};

/**
 * Sets whether the viewer's title should be user editable
 * @param editable {boolean}
 */
atb.viewer.Viewer.prototype.setTitleEditable = function (editable) {
    var container = this.getContainer();
    
    if (! container) {
        throw "Viewer does not yet have a container. " +
        "Call setTitleEditable() after rendering.";
    }
    
    container.setTitleEditable(editable);
};

/**
 * Sets the viewer's title
 * @param title {string}
 */
atb.viewer.Viewer.prototype.setTitle = function (title) {
    var container = this.getContainer();
    
    if (! container) {
        throw "Viewer does not yet have a container." +
        "Call setTitleEditable() after rendering.";
    }
    
    container.setTitle(title);
};

/**
 * Shows a spinning loading indicator
 */
atb.viewer.Viewer.prototype.showLoadingSpinner = function () {
    var div = this.rootDiv;
    
    var top = jQuery(div).height() / 2 - 16;
    var left = jQuery(div).width() / 2 - 16;
    
    if (top < 0) top = 0;
    if (left < 0) left = 0;
    
    jQuery(this.spinner).css({'top': top, 'left': left});
    
    jQuery(this.spinner).fadeIn(200);
};

/**
 * Hides the spinning loading indicator
 */
atb.viewer.Viewer.prototype.hideLoadingSpinner = function () {
    jQuery(this.spinner).fadeOut(200);
};

atb.viewer.Viewer.prototype.flashErrorIcon = function () {
    this.hideLoadingSpinner();
    
    var div = this.rootDiv;
    
    var top = jQuery(div).height() / 2 - 18;
    var left = jQuery(div).width() / 2 - 18;
    
    if (top < 0) top = 0;
    if (left < 0) left = 0;
    
    jQuery(this.errorIcon).css({'top': top, 'left': left});
    
    var self = this;
	jQuery(this.errorIcon).fadeIn(200, function () {
		window.setTimeout(function () {
			jQuery(self.errorIcon).fadeOut(1500);
		}, 1000);
	});
};

/**
 * Shows a textual message which floats centered over the viewer
 * 
 * @param text {string}
 */
atb.viewer.Viewer.prototype.showMessage = function (text) {
    jQuery(this.messageDiv).text(text);
    
    // Calculate the height of the div without actually showing it
    jQuery(this.messageDiv).css({'visibility': 'hidden', 'display': 'block'});
    var textHeight = jQuery(this.messageDiv).height();
    jQuery(this.messageDiv).css({'display': 'none', 'visibility': 'visible'});
    
    var div = this.rootDiv;
    
    var top = (jQuery(div).height()) / 2 - (textHeight / 2);
    var left = 0;
    var width = jQuery(div).width();
    jQuery(this.messageDiv).css({'top': top, 'left': left, 'width': width});
    
    jQuery(this.messageDiv).fadeIn(400);
};

/**
 * Hides the textual message which floats over the viewer
 */
atb.viewer.Viewer.prototype.hideMessage = function () {
    jQuery(this.messageDiv).fadeOut(200);
};

atb.viewer.Viewer.prototype.highlightDocumentIcon = function () {
	jQuery(this.documentIcon).addClass('atb-viewer-documentIconHighlight');
};

atb.viewer.Viewer.prototype.unHighlightDocumentIcon = function () {
	jQuery(this.documentIcon).removeClass('atb-viewer-documentIconHighlight');
};

atb.viewer.Viewer.prototype.flashDocumentIconHighlight = function () {
    this.highlightDocumentIcon();
    
    var timeoutFns = [
        this.unHighlightDocumentIcon,
        this.highlightDocumentIcon,
        this.unHighlightDocumentIcon
    ];
    atb.Util.timeoutSequence(250, timeoutFns, this);
};

/**
 * Called by a panel container whenever the viewer becomes no longer visible and
 * placed in the container's history
 */
atb.viewer.Viewer.prototype.viewerHasEnteredBackground = function (event) {
    if (goog.isFunction(this.onPaneUnloaded)) {
        this.onPaneUnloaded();
    }
};

atb.viewer.Viewer.prototype.viewerHasReenteredForeground = function (event) {
    
};

atb.viewer.Viewer.prototype.viewerWillBePurged = function (event) {
    
};

/**
 * The default delay for showing and hiding menus on hover
 */
atb.viewer.Viewer.HOVER_SHOW_DELAY = 400;
atb.viewer.Viewer.HOVER_HIDE_DELAY = 200;

/**
 * The default width for context menus (in pixels)
 */
atb.viewer.Viewer.CONTEXT_MENU_WIDTH = 275;

/**
 * Returns the last known position of the mouse over this viewer relative to the
 * window, but not over the entire window
 */
atb.viewer.Viewer.prototype.getMousePosition = function () {
    return this.mousePosition;
};

/**
 * Shows a self hiding hover menu with the given buttons
 *
 * If an element is provided, appropriate event listeners will be added to it;
 * otherwise, this.mouseIsOverFloatingMenuParent should be set with appropriate
 * event listeners manually
 *
 * @param menuButtons {Array}
 * @param opt_position {Object} x: number, y: number
 * @param opt_element {HtmlElement}
 */
atb.viewer.Viewer.prototype.showHoverMenu =
function(menuButtons, resourceId, opt_position) {
    this.hideHoverMenu();
    
    if (this.hoverMenusEnabled == false) {
        return;
    }
    
    this.isShowingHoverMenu = true;
    
    var menuDiv = this.hoverMenuPopup.getElement();
    
    jQuery(menuDiv).children().detach();
    
    var contextMenu = new atb.widgets.Toolbar(menuDiv, menuButtons);
    
    contextMenu.setWidthHack(atb.viewer.Viewer.CONTEXT_MENU_WIDTH);
    
    var annoTitlesList = new atb.ui.AnnoTitlesList(this.clientApp, this,
                                                   resourceId, this.domHelper);
    annoTitlesList.render(menuDiv);
    
    var closeButton = this.domHelper.createDom('div', {
        'class': 'atb-hoverMenu-closeButton',
        'title': 'Close this hover menu (ESC)'
    });
    jQuery(closeButton).css({
        'top': 0,
        'left': atb.viewer.Viewer.CONTEXT_MENU_WIDTH - 16 + 'px'
    });
    menuDiv.appendChild(closeButton);
    
    var position = null;
    if (opt_position) {
        position = new goog.math.Coordinate(opt_position.x, opt_position.y);
    }
    else {
        var mousePosition = this.getMousePosition();
        position = new goog.math.Coordinate(
            mousePosition.x - jQuery(menuDiv).width() / 2,
            mousePosition.y + atb.util.StyleUtil.CURSOR_SIZE * 1.5
        );
    }
    
    position = atb.util.StyleUtil.maintainPopupPositionWithinWindow(
        position,
        menuDiv,
        this.getDomHelper()
    );
    this.hoverMenuPopup.setPosition(
        new goog.positioning.ClientPosition(position)
    );
    
    var willDisplayUnderMouse = (this.getMousePosition().y - position.y) >= 0;
    
    if (! willDisplayUnderMouse) {
        var calloutTriangle = this.domHelper.createDom('div',
                                   {'class': 'atb-hoverMenu-calloutTriangle'});
        jQuery(calloutTriangle).css({
            'top': '-16px',
            'left': (this.getMousePosition().x - position.x - 8) +'px'
        });
        menuDiv.appendChild(calloutTriangle);
    }
    
    goog.events.listen(menuDiv, 'mouseover', function (e) {
                           this.mouseIsOverFloatingMenu = true;
                       }, false, this);
    goog.events.listen(menuDiv, 'mouseout', function (e) {
                           this.mouseIsOverFloatingMenu = false;
                           
                           this.maybeHideHoverMenu();
                       }, false, this);
    goog.events.listen(closeButton, 'click', function (e) {
                           e.stopPropagation();
                           
                           this.hideHoverMenu();
                       }, false, this);
    
    this.hoverMenuPopup.setVisible(true);
};

/**
 * Hides the current hover menu, if it exists and is being shown
 */
atb.viewer.Viewer.prototype.hideHoverMenu = function () {
    this.mouseIsOverFloatingMenu = false;
    this.isShowingHoverMenu = false;
    
    this.hoverMenuPopup.setVisible(false);
    
    this.cancelMaybeHideHoverMenuCommand();
};

/**
 * Hides the hover menu only if the mouse is no longer over the menu or its
 * parent element
 */
atb.viewer.Viewer.prototype.maybeHideHoverMenu = function () {
    if (this.maybeHideHoverMenuTimeoutId != null) {
        return;
    }
    
    var afterTimer = function () {
        this.cancelMaybeHideHoverMenuCommand();
        
        if (! (this.mouseIsOverFloatingMenu ||
               this.mouseIsOverFloatingMenuParent)) {
            this.hideHoverMenu();
        }
    };
    afterTimer = jQuery.proxy(afterTimer, this);
    this.maybeHideHoverMenuTimeoutId = window.setTimeout(afterTimer,
                                         atb.viewer.Viewer.HOVER_HIDE_DELAY);
};

/**
 * Cancels the timeout used by maybeHideHoverMenu()
 */
atb.viewer.Viewer.prototype.cancelMaybeHideHoverMenuCommand = function () {
    if (this.maybeHideHoverMenuTimeoutId != null) {
        window.clearTimeout(this.maybeHideHoverMenuTimeoutId);
        this.maybeHideHoverMenuTimeoutId = null;
    }
};

/**
 * Adds event listeners to a given element to show a hover menu on hover
 * @param element {HtmlElement}
 * @param menuButtons {Array}
 * @param fReturnsResourceId {Function | string} a function which returns the
 * resource id (since it can't be passed as a pointer in js), or a normal
 * resource id
 */
atb.viewer.Viewer.prototype.addHoverMenuListenersToElement =
function(element, menuButtons, fReturnsResourceId) {
    var onHover = function (e) {
        this.mouseIsOverFloatingMenuParent = true;
        
        var afterTimer = function () {
            if (this.mouseIsOverFloatingMenuParent) {
                var resourceId;
                if (goog.isFunction(fReturnsResourceId))
                    resourceId = fReturnsResourceId();
                else
                    resourceId = fReturnsResourceId;
                
                this.showHoverMenu(menuButtons, resourceId);
            }
        };
        afterTimer = jQuery.proxy(afterTimer, this);
        window.setTimeout(afterTimer, atb.viewer.Viewer.HOVER_SHOW_DELAY);
    };
    goog.events.listen(element, 'mouseover', onHover, false, this);
    
    var onUnHover = function (e) {
        this.mouseIsOverFloatingMenuParent = false;
        
        this.maybeHideHoverMenu();
    };
    goog.events.listen(element, 'mouseout', onUnHover, false, this);
};

atb.viewer.Viewer.prototype.enableHoverMenus = function () {
    this.hoverMenusEnabled = true;
};

atb.viewer.Viewer.prototype.disableHoverMenus = function () {
    this.hoverMenusEnabled = false;
    
    this.hideHoverMenu();
};

/**
 * Creates an atb.viewer.ViewerThumbnail object for the current state of the
 * viewer
 *
 * Should be overridden by subclasses
 */
atb.viewer.Viewer.prototype.generateViewerThumbnail = function () {
    return new atb.viewer.ViewerThumbnail(this);
};

/**
 * Calls the generateViewerThumbnail() method, and registers the thumbnail to
 * the panel container, and debounces multiple calls to the method in quick
 * succession
 *
 * @param opt_synchronous
 * @return {Boolean} true if the thumbnail has been (or is about to be)
 * registered, false if it was debounced
 */
atb.viewer.Viewer.prototype.registerThumbnailToPanel =
function(opt_synchronous) {
    // if (goog.now() - this.timeOfLastThumbnailRegistration > 500) {
    //     this.timeOfLastThumbnailRegistration = goog.now();
        
    //     var code = function () {
    //         var thumbnail = this.generateViewerThumbnail();
            
    //         var panelContainer = this.getPanelContainer();
    //         if (this.panelContainer) {
    //             panelContainer.registerViewerThumbnail(thumbnail);
    //         }
    //     };
    //     code = jQuery.proxy(code, this);
        
    //     if (opt_synchronous) {
    //         code();
    //     }
    //     else {
    //         window.setTimeout(code, 500);
    //     }
        
    //     return true;
    // }
    // else {
    //     return false;
    // }
};

atb.viewer.Viewer.prototype.equals = function (other) {
    if (!goog.isFunction(other.getUid)) {
        return false;
    }
    
    return this.getUid() == other.getUid();
};

/**
 * @return {String}
 */
atb.viewer.Viewer.prototype.getUid = function () {
    return this.viewerType + '_' + this.resourceId + '_' + goog.getUid(this);
};
