goog.provide("atb.ClientApp");

goog.require("atb.WebService");

goog.require("atb.util.StyleUtil"); //used for a giant hack
goog.require("atb.util.ReferenceUtil");

goog.require('jquery.jQuery');
goog.require('jquery.animate_enhanced'); // converts jquery animations to css3 when possible, enabling hardware accelleration

goog.require('goog.events.EventTarget');
goog.require('goog.events');
goog.require('goog.ui.Popup');
goog.require('atb.ui.Bezel');
goog.require('goog.fx.dom.FadeIn');
goog.require('goog.fx.dom.FadeOut');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.KeyboardShortcutHandler');

goog.require('atb.events.LinkingModeEntered');
goog.require('atb.events.LinkingModeExited');

goog.require('atb.resource.ResourceCrawler');

goog.require('atb.ui.ViewerThumbnailTimeline');

goog.require('sc.data.Databroker');

atb.ClientApp = function (webService, username, opt_hack_set_styleRoot) {
    var self = this;

	this.webService = webService;
    this.webService.setClientApp(this);
    
    this.databroker = new sc.data.Databroker({
        proxiedUrlGenerator: function (url) {
            return self.webService.proxiedUri(url);
        }
    });
    
    this.eventDispatcher = new goog.events.EventTarget();
    goog.events.listen(this.getEventDispatcher(), 'resource clicked', this.resourceClickHandler, false, this);
    
    this.username = username;
    
	this.force_styleRoot = atb.util.ReferenceUtil.applyDefaultValue(opt_hack_set_styleRoot, null);
	
	this.resourceCrawler = new atb.resource.ResourceCrawler(this);
    
	atb.util.StyleUtil.DEFAULT_CSS_ROOT = this.getStyleRoot(); // HACK -- moved over from panel manager!!, also, was a giant hack there, too!

    this.annotationBody = null;
	this.activeAnnotation = null;
    this.createdAnnoLinkIds = [];
    
    this.popupsByName = {};
    
    this.functionToCallBeforeUnload = null;
    goog.events.listen(window, 'beforeunload', this.onBeforeUnload, false, this);
    
    this.linkingInProgress = false;
    this.renderLinkCreationUI();
    
    this.viewerThumbnailTimeline = new atb.ui.ViewerThumbnailTimeline(this);
    
    this.keyboardShortcutHandler = new goog.ui.KeyboardShortcutHandler(window);
    this.registerKeyboardShortcuts();
};

atb.ClientApp.prototype.getWebService = function () {
	return this.webService;
};

atb.ClientApp.prototype.getEventDispatcher = function () {
    return this.eventDispatcher;
};

atb.ClientApp.prototype.getResourceCrawler = function () {
    return this.resourceCrawler;
};

atb.ClientApp.prototype.getDatabroker = function() {
    return this.databroker;
};

atb.ClientApp.prototype.getStyleRoot = function () {
	if (this.force_styleRoot !== null) {
		return this.force_styleRoot;
	}
	return this.webService.getCssRoot(); //for now...
};

atb.ClientApp.prototype.getActiveAnnotation = function () {
	return this.activeAnnotation;
};

atb.ClientApp.prototype.setActiveAnnotation = function (set_active_annotation) {
	this.activeAnnotation = set_active_annotation;
};

atb.ClientApp.prototype.clearActiveAnnotation = function () {
	this.setActiveAnnotation(null);
	this.setAnnotationBody(null);
	
	// var panelContainers = this.getPanelManager().getAllPanels();
	// for (var x in panelContainers) {
	// 	var viewer = panelContainers[x].getViewer();
		
	// 	try {
	// 		viewer.unHighlightDocumentIcon();
	// 	}
	// 	catch (e) {}
	// }
};


atb.ClientApp.prototype.getAnnotationBody = function() {
    return this.annotationBody;
};


atb.ClientApp.prototype.setAnnotationBody = function(annotationBody) {
    this.annotationBody = annotationBody;
};

/**
 * @param popup {atb.ui.PopupWindow}
 */
atb.ClientApp.prototype.registerPopup = function (popup) {
    this.popupsByName[popup.getName()] = popup;
};

atb.ClientApp.prototype.unregisterPopup = function (popup) {
    this.popupsByName[popup.getName()] = null;
};

atb.ClientApp.prototype.getPopupByName = function (name) {
    return this.popupsByName[name];
};

atb.ClientApp.prototype.forEachPopup = function (fn, opt_scope) {
    for (var name in this.popupsByName) {
        var popup = this.popupsByName[name];
        
        if (popup)
            fn.call(opt_scope || window, popup);
    }
};

atb.ClientApp.prototype.numOpenPopups = function () {
    var num = 0;
    
    this.forEachPopup(function (popup) {
        num ++;
    }, this);
    
    return num;
};

atb.ClientApp.prototype.getUsername = function () {
    return this.username;
};

/**
 * Starts the process of creating a link between two resources, taking a body id and optional annoId,
 * and listening for the next 'resource clicked' event for the target id
 */
atb.ClientApp.prototype.createAnnoLink = function (bodyId, opt_annoId) {
    this.linkingInProgress = true;
    
    this.annoLinkCreationBodyId = bodyId;
    this.annoLinkCreationAnnoId = opt_annoId;
    
    var modeEnteredEvent = new atb.events.LinkingModeEntered(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(modeEnteredEvent);
    
    this.createAnnoLinkAddListeners_();
    
    this.showLinkCreationUI();
};

/**
 * Cancels the process of creating a link between two resources after createAnnoLink has been called,
 * but no target has yet been added
 */
atb.ClientApp.prototype.cancelAnnoLinking = function () {
    this.linkingInProgress = false;
    
    var exitedEvent = new atb.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);
    
    this.annoLinkCreationBodyId = null;
    this.annoLinkCreationAnnoId = null;
    
    this.createAnnoLinkRemoveListeners_();
    
    this.hideLinkCreationUI();
};

atb.ClientApp.prototype.renderLinkCreationUI = function () {
    var linkCreationPopupDiv = goog.dom.createDom('div', {'class': 'basic-popup atb-linkCreationControls'});
    document.body.appendChild(linkCreationPopupDiv);
    
    var computeCenteredPosition = atb.util.StyleUtil.computeCenteredBottomClientPosition;
    
    this.linkCreationPopup = new goog.ui.Popup(linkCreationPopupDiv);
    this.linkCreationPopup.setPosition(computeCenteredPosition(linkCreationPopupDiv));
    this.linkCreationPopup.setShouldHideAsync(true);
    this.linkCreationPopup.setTransition(new goog.fx.dom.FadeIn(linkCreationPopupDiv, 500), 
                                         new goog.fx.dom.FadeOut(linkCreationPopupDiv, 500));
    
    var cancelButton = new goog.ui.CustomButton('Cancel link creation');
    goog.events.listen(cancelButton, goog.ui.Component.EventType.ACTION, function (e) {
        this.cancelAnnoLinking();
    }, false, this);
    cancelButton.render(linkCreationPopupDiv);
    
    
    var undoLinkCreationPopupDiv = goog.dom.createDom('div', {'class': 'basic-popup atb-linkCreationControls'});
    document.body.appendChild(undoLinkCreationPopupDiv);
    
    this.undoLinkCreationPopup = new goog.ui.Popup(undoLinkCreationPopupDiv);
    this.undoLinkCreationPopup.setPosition(computeCenteredPosition(undoLinkCreationPopupDiv));
    this.undoLinkCreationPopup.setShouldHideAsync(true);
    this.undoLinkCreationPopup.setTransition(new goog.fx.dom.FadeIn(undoLinkCreationPopupDiv, 500),
                                             new goog.fx.dom.FadeOut(undoLinkCreationPopupDiv, 1000));
    
    var undoButton = new goog.ui.CustomButton('Undo last link');
    goog.events.listen(undoButton, goog.ui.Component.EventType.ACTION, function (e) {
        this.undoLastAnnoLinkCreation();
    }, false, this);
    undoButton.render(undoLinkCreationPopupDiv);
    
    
    goog.events.listen(window, 'resize', function (e) {
        var windowWidth = jQuery(window).width();
        var widnowHeight = jQuery(window).height();
        
        if (this.linkCreationPopup.isVisible()) {
            this.linkCreationPopup.setPosition(computeCenteredPosition(linkCreationPopupDiv));
            this.linkCreationPopup.reposition();
        }
        
        if (this.undoLinkCreationPopup.isVisible()) {
            this.undoLinkCreationPopup.setPosition(computeCenteredPosition(undoLinkCreationPopupDiv));
            this.undoLinkCreationPopup.reposition();
        }
    }, false, this);
};

atb.ClientApp.prototype.showLinkCreationUI = function () {
    this.linkCreationPopup.setVisible(true);
    this.linkCreationPopup.setPosition(atb.util.StyleUtil.computeCenteredBottomClientPosition(this.linkCreationPopup.getElement()));
};

atb.ClientApp.prototype.hideLinkCreationUI = function () {
    this.linkCreationPopup.setVisible(false);
};

atb.ClientApp.prototype.showUndoLinkCreationUI = function () {
    this.undoLinkCreationPopup.setVisible(true);
    this.undoLinkCreationPopup.setPosition(atb.util.StyleUtil.computeCenteredBottomClientPosition(this.undoLinkCreationPopup.getElement()));
};

atb.ClientApp.prototype.hideUndoLinkCreationUI = function () {
    this.undoLinkCreationPopup.setVisible(false);
};

atb.ClientApp.prototype.createAnnoLinkAddListeners_ = function () {
    goog.events.listen(this.getEventDispatcher(), 'resource clicked', this.annoLinkCreationHandler_, false, this);
    goog.events.listen(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

atb.ClientApp.prototype.createAnnoLinkRemoveListeners_ = function () {
    goog.events.unlisten(this.getEventDispatcher(), 'resource clicked', this.annoLinkCreationHandler_, false, this);
    goog.events.unlisten(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

atb.ClientApp.prototype.annoLinkCreationHandler_ = function (e) {
    e.stopPropagation();
    e.preventDefault();
    
    this.createAnnoLinkRemoveListeners_();
    
    this.linkingInProgress = false;
    
    var id = e.target;
    
    if (this.annoLinkCreationBodyId) {
        var bodyId = this.annoLinkCreationBodyId;
        this.annoLinkCreationBodyId = null;

        this.databroker.dataModel.createAnno(bodyId, id);
        
        var bezel = new atb.ui.Bezel('atb-bezel-linked');
        bezel.show();
        
        this.hideLinkCreationUI();
    }

    var exitedEvent = new atb.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);
};

atb.ClientApp.prototype.annoLinkCreationKeyHandler_ = function (e) {
    var keyCode = e.keyCode;
    
    if (keyCode == goog.events.KeyCodes.ESC) {
        this.cancelAnnoLinking();
    }
};

atb.ClientApp.prototype.isAnnoLinkingInProgress = function () {
    return this.linkingInProgress;
};

atb.ClientApp.prototype.undoLastAnnoLinkCreation = function () {
    var lastAnnoLinkId = this.createdAnnoLinkIds.pop();
    
    if (lastAnnoLinkId != null) {
        this.webService.withDeletedResource(lastAnnoLinkId, function () {
            
        }, this, null);
        
        var bezel = new atb.ui.Bezel('atb-bezel-unlinked');
        bezel.show();
    }
    
    this.hideUndoLinkCreationUI();
};

atb.ClientApp.prototype.resourceClickHandler = function (e) {
    var id = e.target;
};

/**
 * @param f function to be called before the main workspace window unloads
 *
 * @note(tandres) If saving is being performed by the function, be sure that the "AJAX" is being
 * performed synchronously; otherwise, the save will not complete.
 */
atb.ClientApp.prototype.registerFunctionToCallBeforeUnload = function (f) {
    // This chaining is necessary because for loops can not be used within onBeforeUnload functions
    
    if (goog.isFunction(this.functionToCallBeforeUnload)) {
        var temp = this.functionToCallBeforeUnload;
        
        this.functionToCallBeforeUnload = function () {
            try {
                temp();
            } catch (e) {console.error(e);}
            
            try {
                f();
            } catch (e) {console.error(e);}
        };
    }
    else {
        this.functionToCallBeforeUnload = f;
    }
};

atb.ClientApp.prototype.onBeforeUnload = function (event) {
    if (goog.isFunction(this.functionToCallBeforeUnload)) {
        try {
            this.functionToCallBeforeUnload();
        } catch (e) {console.error(e);}
    }
};

atb.ClientApp.prototype.registerKeyboardShortcuts = function () {
    this.keyboardShortcutHandler.registerShortcut('show_desktop', 'ctrl+d');
    
    var handleKey = function (event) {
        if (event.identifier) {
            this.viewerThumbnailTimeline.toggleVisibility();
        }
    };
    
    goog.events.listen(this.keyboardShortcutHandler, goog.ui.KeyboardShortcutHandler.EventType.SHORTCUT_TRIGGERED, handleKey, false, this);
};
