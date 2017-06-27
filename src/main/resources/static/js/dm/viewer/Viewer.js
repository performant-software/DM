goog.provide('dm.viewer.Viewer');

//goog.require('goog.fx.dom.FadeIn');
//goog.require('goog.fx.dom.FadeOut');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.events.EventTarget');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.ui.Popup');

goog.require('dm.viewer.AnnoTitlesList');
goog.require('dm.util.StyleUtil');
goog.require('dm.Util');
goog.require('dm.widgets.Toolbar');


/**
 * Defines a generic Viewer which can be loaded into a ViewerContainer
 *
 * @note Never create dom elements in the constructor, they should be created in
 * render()
 *
 * @constructor
 * @abstract
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @extends {goog.events.EventTarget}
 *
 * @param clientApp {dm.ClientApp};
 */
dm.viewer.Viewer = function (clientApp) {
    goog.events.EventTarget.call(this);
    this.showHoverTimerId = -1;
    this.readOnlyClone = false;

    /** @type {string} */
    this.viewerType = 'viewer';

    this.setClientApp(clientApp);

    /** @type {dm.data.Databroker} */
    this.databroker = this.clientApp.getDatabroker();

    /** @type {HtmlElement} */
    this.rootDiv = null;

    /** @type {goog.math.Coordinate} */
    this.mousePosition = new goog.math.Coordinate(0,0);

    this.mouseOverUri = null;
    this.mouseIsOverFloatingMenu = false;

    /** @type {boolean} */
    this.hoverMenusEnabled = true;
    /** @type {boolean} */
    this.isShowingHoverMenu = false;

    this.contextMenuWidth = dm.viewer.Viewer.CONTEXT_MENU_WIDTH;
    this.contextMenuHeight = dm.viewer.Viewer.CONTEXT_MENU_HEIGHT;
};
goog.inherits(dm.viewer.Viewer, goog.events.EventTarget);

dm.viewer.Viewer.VIEWER_TYPE = 'viewer';

/**
 * @param clientApp {dm.ClientApp}
 */
dm.viewer.Viewer.prototype.setClientApp = function (clientApp) {
    /** @type {dm.ClientApp} */
    this.clientApp = clientApp;
};

/**
 * @returns {dm.ClientApp}
 */
dm.viewer.Viewer.prototype.getClientApp = function () {
    return this.clientApp;
};

/**
 * @returns {string | null}
 */
dm.viewer.Viewer.prototype.getResourceId = function () {
    return this.resourceId;
};

/**
 * Should be overrided if the viewer needs to be resized programatically.
 * @param  {number} width     The width of the viewer.
 * @param  {number} height    The height of the viewer.
 * @return {dm.viewer.Viwer} this.
 */
dm.viewer.Viewer.prototype.resize = function(width, height) {
    this.size = new goog.math.Size(width, height);

    jQuery(this.rootDiv).width(width).height(height);
    this.repositionLoadingSpinner();

    return this;
};

dm.viewer.Viewer.prototype.render = function (div) {
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
        this.mousePosition.y = e.screenY;
    }, false, this);

    goog.events.listen(this.domHelper.getWindow(), 'keydown',
                       this.handleKeyDown_, false, this);

    var eventDispatcher = this.clientApp.getEventDispatcher();
    goog.events.listen(eventDispatcher,
                       dm.events.LinkingModeEntered.EVENT_TYPE, function (e) {
                           this.disableHoverMenus();
                       }, false, this);
    goog.events.listen(eventDispatcher, dm.events.LinkingModeExited.EVENT_TYPE,
                       function (e) {
                           this.enableHoverMenus();
                       }, false, this);
    if (this.clientApp.isAnnoLinkingInProgress()) {
        this.disableHoverMenus();
    }

    if (div) {
        div.appendChild(this.rootDiv);
    }
};

dm.viewer.Viewer.prototype.handleKeyDown_ = function (event) {
    if (this.isShowingHoverMenu && event.keyCode == goog.events.KeyCodes.ESC) {
        event.stopPropagation();

        this.hideHoverMenu();
    }
};

/**
 * Returns the root dom element of this viewer
 * @returns {HtmlElement}
 */
dm.viewer.Viewer.prototype.getElement = function () {
    if (! this.rootDiv) {
        this.render();
    }

    return this.rootDiv;
};

dm.viewer.Viewer.prototype.setContainer = function(container) {
    this.container = container;
};

dm.viewer.Viewer.prototype.getContainer = function() {
    return this.container;
};

dm.viewer.Viewer.prototype.openRelatedViewer = function(uri, viewer) {
   if ( this.getContainer().grid.isOpen(uri)) {
      var container = this.getContainer().grid.getContainer(uri);
      this.clientApp.scrollIntoView(container.getElement());
   } else {
      var container = new dm.viewer.ViewerContainer(this.getDomHelper());
      var idx = this.container.getIndex() + 1;
      var viewerGrid = this.getContainer().grid;
      viewerGrid.addViewerContainerAt(uri, container, idx);
      container.setViewer(viewer);
   }
};

/**
 * Returns this viewer's dom helper, or fetches it from the panel container if
 * necessary. If there is no panel container, an exception will be thrown.
 *
 * @returns {goog.dom.DomHelper}
 */
dm.viewer.Viewer.prototype.getDomHelper = function () {
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
dm.viewer.Viewer.prototype.setTitleEditable = function (editable) {
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
dm.viewer.Viewer.prototype.setTitle = function (title) {
    var container = this.getContainer();

    if (! container) {
        throw "Viewer does not yet have a container." +
        "Call setTitleEditable() after rendering.";
    }

    container.setTitle(title);
};

dm.viewer.Viewer.prototype.repositionLoadingSpinner = function() {
    var div = this.rootDiv;

    var top = jQuery(div).height() / 2 - 16;
    var left = jQuery(div).width() / 2 - 16;

    if (top < 0) top = 0;
    if (left < 0) left = 0;

    jQuery(this.spinner).css({'top': top, 'left': left});
};

/**
 * Shows a spinning loading indicator
 */
dm.viewer.Viewer.prototype.showLoadingSpinner = function () {
    this.repositionLoadingSpinner();

    jQuery(this.spinner).fadeIn(200);
};

/**
 * Hides the spinning loading indicator
 */
dm.viewer.Viewer.prototype.hideLoadingSpinner = function () {
    jQuery(this.spinner).fadeOut(200);
};

dm.viewer.Viewer.prototype.flashErrorIcon = function () {
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
dm.viewer.Viewer.prototype.showMessage = function (text) {
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
dm.viewer.Viewer.prototype.hideMessage = function () {
    jQuery(this.messageDiv).fadeOut(200);
};

dm.viewer.Viewer.prototype.highlightDocumentIcon = function () {
	jQuery(this.documentIcon).addClass('atb-viewer-documentIconHighlight');
};

dm.viewer.Viewer.prototype.unHighlightDocumentIcon = function () {
	jQuery(this.documentIcon).removeClass('atb-viewer-documentIconHighlight');
};

dm.viewer.Viewer.prototype.flashDocumentIconHighlight = function () {
    this.highlightDocumentIcon();

    var timeoutFns = [
        this.unHighlightDocumentIcon,
        this.highlightDocumentIcon,
        this.unHighlightDocumentIcon
    ];
    dm.Util.timeoutSequence(250, timeoutFns, this);
};

dm.viewer.Viewer.prototype.unlockResource = function(uri, lockIcon, lockMessage) {
   var cleanUri = uri.replace("<", "").replace(">","");
   var self = this;
   $.ajax({
      url: [ this.clientApp.getBasePath(), "store", "lock", cleanUri ].join("/"),
      method: "DELETE",
      complete: function(jqXHR, textStatus) {
         if ( textStatus == "success" ) {
            if ( lockIcon ) {
               lockMessage.text("Click to enable editing on resource");
               lockIcon.removeClass("checked");
            }
            if (self.isEditable())
              self.makeUneditable();
         } else {
            alert("Unlock failed. Please try again later.\n\nReason: "+jqXHR.responseText);
         }
      }
   });
}

dm.viewer.Viewer.prototype.lockResource = function(uri, lockIcon, lockMessage) {
   var cleanUri = uri.replace("<", "").replace(">","");
   var self = this;
   $.ajax({
      url: [ this.clientApp.getBasePath(), "store", "lock", cleanUri ].join("/"),
      method: "POST",
      complete: function(jqXHR, textStatus) {
         if (lockIcon==null || lockMessage==null) {
            return;
         }
         if ( textStatus == "success" ) {
            lockMessage.text("Editing enabled");
            lockIcon.addClass("checked");
            self.makeEditable();
         } else {
            alert("Lock failed. Please try again later.\n\nReason: "+jqXHR.responseText);
         }
      }
   });
}

dm.viewer.Viewer.prototype.lockStatus = function(resourceUri, isLocked, isLockHolder, lockedBy, lockedOn) {
   var lockIcon = $("<div data-uri='"+resourceUri+"' class='lock-for-edit-icon'></div>");
   var lockMessage = $("<div class='lock-message'></div>");
   if ( isLocked == false ) {
      lockMessage.text("Click to enable editing on resource");
   } else {
      if ( isLockHolder ) {
         if (lockedOn == null ) {
            lockMessage.text("Editing enabled");
         } else {
            lockMessage.text("Locked for edit on "+lockedOn);
         }
         lockIcon.addClass('checked');
      } else {
         lockMessage.text("Locked by "+lockedBy+" for edit on "+lockedOn);
         lockIcon.addClass('locked');
      }
   }

   $(lockIcon).on("mouseover", function() {
      lockMessage.show();
   });
   $(lockIcon).on("mouseout", function() {
      lockMessage.hide();
   });

   var self = this;
   $(lockIcon).on("click", function() {
      // someone else has locked it.do nothing
      if ( $(this).hasClass("locked")) {
         return;
      }

      if ( $(this).hasClass("checked")) {
         // you locked it; release lock
         self.unlockResource( $(this).data("uri") , lockIcon, lockMessage);
      } else {
         // Not locked at all, lock it
         self.lockResource( $(this).data("uri") , lockIcon, lockMessage);
      }
   });

   this.rootDiv.appendChild(lockIcon[0]);
   this.rootDiv.appendChild(lockMessage[0]);
   if ( $.trim($("#logged-in-user").text()) == "Guest" ) {
      lockIcon.hide();
   } else {
     $(".lock-for-edit-icon:not(.checked)").trigger("click");
   }
}

/**
 * The default delay for showing and hiding menus on hover
 */
dm.viewer.Viewer.HOVER_SHOW_DELAY = 750;
dm.viewer.Viewer.HOVER_HIDE_DELAY = 750;

/**
 * The default width for context menus (in pixels)
 */
dm.viewer.Viewer.CONTEXT_MENU_WIDTH = 275;
dm.viewer.Viewer.CONTEXT_MENU_HEIGHT = 175;

/**
 * Returns the last known position of the mouse over this viewer relative to the
 * window, but not over the entire window
 */
dm.viewer.Viewer.prototype.getMousePosition = function () {
    return this.mousePosition;
};

dm.viewer.Viewer.prototype.isEditable = function() {
    return false;
};

/**
 * Shows a self hiding hover menu with the given buttons
 *
 * If an element is provided, appropriate event listeners will be added to it;
 * otherwise, this.mouseOverUri should be set with appropriate
 * event listeners manually
 *
 * @param menuButtons {Array}
 * @param opt_position {Object} x: number, y: number
 * @param opt_element {HtmlElement}
 */
dm.viewer.Viewer.prototype.showHoverMenu =
function(menuButtons, resourceId, opt_position) {
    this.hideHoverMenu();

    if (this.hoverMenusEnabled == false) {
        return;
    }

    this.isShowingHoverMenu = true;

    var menuDiv = this.hoverMenuPopup.getElement();

    jQuery(menuDiv).children().detach();

    var contextMenu = new dm.widgets.Toolbar(menuDiv, menuButtons);

    var annoTitlesList = new dm.viewer.AnnoTitlesList(this.clientApp, this,
                                                   resourceId, this.domHelper);
    annoTitlesList.render(menuDiv);
    this.annoTitlesList = annoTitlesList;

    var closeButton = this.domHelper.createDom('div', {
        'class': 'atb-hoverMenu-closeButton',
        'title': 'Close this hover menu (ESC)'
    });
    menuDiv.appendChild(closeButton);

    var position = null;
    if (opt_position) {
        position = new goog.math.Coordinate(opt_position.x, opt_position.y);
    }
    else {
        var mousePosition = this.getMousePosition();
        position = new goog.math.Coordinate(
            mousePosition.x,
            mousePosition.y - jQuery(menuDiv).height()/2
        );
    }

    var $scrollerDiv = jQuery(menuDiv).find(".atb-annoTitlesList-scroller");
    $scrollerDiv.width(this.contextMenuWidth);
    $scrollerDiv.height(this.contextMenuHeight);

    position = dm.util.StyleUtil.maintainPopupPositionWithinWindow(
        position,
        menuDiv,
        this.getDomHelper()
    );
    this.hoverMenuPopup.setPosition(
        new goog.positioning.ClientPosition(position)
    );

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

    $scrollerDiv.resizable({
      start: function(){ this.hoverMenuIsResizing = true; }.bind(this),
      stop: function(){ this.hoverMenuIsResizing = false; }.bind(this)
    });
};

/**
 * Hides the current hover menu, if it exists and is being shown
 */
dm.viewer.Viewer.prototype.hideHoverMenu = function () {
    var $scrollerDiv = jQuery(this.hoverMenuPopup.getElement()).find(".atb-annoTitlesList-scroller");
    if ($scrollerDiv.length > 0) {
      this.contextMenuWidth = $scrollerDiv.width();
      this.contextMenuHeight = $scrollerDiv.height();
    }

    this.mouseIsOverFloatingMenu = false;
    this.isShowingHoverMenu = false;

    this.hoverMenuPopup.setVisible(false);

    this.cancelMaybeHideHoverMenuCommand();

    this.annoTitlesList = null;
};

/**
 * Hides the hover menu only if the mouse is no longer over the menu or its
 * parent element
 */
dm.viewer.Viewer.prototype.maybeHideHoverMenu = function () {
    if (this.maybeHideHoverMenuTimeoutId != null || this.hoverMenuIsResizing) {
        return;
    }

    var afterTimer = function () {
        this.cancelMaybeHideHoverMenuCommand();

        if (! (this.mouseIsOverFloatingMenu ||
               this.mouseOverUri)) {
            this.hideHoverMenu();
        }
    };
    afterTimer = jQuery.proxy(afterTimer, this);
    this.maybeHideHoverMenuTimeoutId = window.setTimeout(afterTimer,
                                         dm.viewer.Viewer.HOVER_HIDE_DELAY);
};

/**
 * Cancels the timeout used by maybeHideHoverMenu()
 */
dm.viewer.Viewer.prototype.cancelMaybeHideHoverMenuCommand = function () {
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
dm.viewer.Viewer.prototype.addHoverMenuListenersToElement =
function(element, menuButtons, fReturnsResourceId) {
    var onHover = function (e) {
        if (goog.isFunction(fReturnsResourceId)) {
            this.mouseOverUri = fReturnsResourceId();
        }
        else {
            this.mouseOverUri = fReturnsResourceId;
        }

        var afterTimer = function () {
        	this.showHoverTimerId = -1;
            if (this.mouseOverUri) {
                if (goog.isFunction(fReturnsResourceId))
                    var uri = fReturnsResourceId();
                else
                    var uri = fReturnsResourceId;

                if (this.mouseOverUri == uri) {
                    this.showHoverMenu(menuButtons, uri);
                }
            }
        }.bind(this);
        this.showHoverTimerId = window.setTimeout(afterTimer, dm.viewer.Viewer.HOVER_SHOW_DELAY);
    };
    goog.events.listen(element, 'mouseover', onHover, false, this);

    var onUnHover = function (e) {
    	  if ( this.showHoverTimerId != -1 ) {
        	  window.clearTimeout(this.showHoverTimerId);
        	  this.showHoverTimerId = -1;
        }
        this.mouseOverUri = null;
        this.maybeHideHoverMenu();
    };
    goog.events.listen(element, 'mouseout', onUnHover, false, this);
};

dm.viewer.Viewer.prototype.cancelHover = function () {
   if ( this.showHoverTimerId != -1 ) {
      window.clearTimeout(this.showHoverTimerId);
      this.showHoverTimerId = -1;
   }
};

dm.viewer.Viewer.prototype.enableHoverMenus = function () {
    this.hoverMenusEnabled = true;
};

dm.viewer.Viewer.prototype.disableHoverMenus = function () {
    this.hoverMenusEnabled = false;

    this.hideHoverMenu();
};

dm.viewer.Viewer.prototype.equals = function (other) {
    if (!goog.isFunction(other.getUid)) {
        return false;
    }

    return this.getUid() == other.getUid();
};

/**
 * @return {String}
 */
dm.viewer.Viewer.prototype.getUid = function () {
    return this.viewerType + '_' + this.resourceId + '_' + goog.getUid(this);
};
