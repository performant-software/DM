goog.provide("dm.ClientApp");

goog.require('goog.dom');
goog.require('goog.events.EventTarget');
goog.require('goog.events');
goog.require('goog.fx.dom.FadeIn');
goog.require('goog.fx.dom.FadeOut');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.Dialog');
goog.require('goog.ui.KeyboardShortcutHandler');
goog.require('goog.ui.Popup');
goog.require('goog.Uri');

goog.require('dm.data.Databroker');
goog.require('dm.data.DataModel');
goog.require('dm.data.Quad');
goog.require('dm.data.Term');

goog.require('dm.events.LinkingModeEntered');
goog.require('dm.events.LinkingModeExited');

goog.require('dm.viewer.ProjectViewer');
goog.require('dm.viewer.SearchViewer');
goog.require('dm.viewer.TextEditor');
goog.require('dm.viewer.CanvasViewer');
goog.require('dm.viewer.ViewerGrid');

goog.require('dm.widgets.Bezel');

goog.require("dm.util.StyleUtil"); //used for a giant hack
goog.require("dm.util.ReferenceUtil");

dm.ClientApp = function (basePath, username) {
    this.basePath = basePath;
    this.username = username;
    this.isGuest = (username == "dm:guest");

    this.domHelper = new goog.dom.DomHelper();
    this.viewerGrid = new dm.viewer.ViewerGrid();

    this.databroker = goog.global.databroker = new dm.data.Databroker(this);
    this.projectViewer = goog.global.projectViewer = new dm.viewer.ProjectViewer(this);
    this.searchViewer = goog.global.searchViewer = new dm.viewer.SearchViewer(this);

    this.eventDispatcher = new goog.events.EventTarget();

    this.styleRoot = basePath + "/static/css/";

    dm.util.StyleUtil.DEFAULT_CSS_ROOT = this.styleRoot; // HACK -- moved over from panel manager!!, also, was a giant hack there, too!

    this.annotationBody = null;
    this.activeAnnotation = null;
    this.createdAnnoLinkIds = [];

    this.popupsByName = {};

    goog.events.listen(window, 'beforeunload', this.onBeforeUnload, false, this);

    this.linkingInProgress = false;

    this.keyboardShortcutHandler = new goog.ui.KeyboardShortcutHandler(window);

    this.renderLinkCreationUI();
};

dm.ClientApp.prototype.getEventDispatcher = function () {
    return this.eventDispatcher;
};

dm.ClientApp.prototype.getDatabroker = function() {
    return this.databroker;
};

dm.ClientApp.prototype.getBasePath = function () {
    return this.basePath;
};

dm.ClientApp.prototype.getStyleRoot = function () {
    return this.styleRoot;
};

dm.ClientApp.prototype.getActiveAnnotation = function () {
	return this.activeAnnotation;
};

dm.ClientApp.prototype.setActiveAnnotation = function (set_active_annotation) {
	this.activeAnnotation = set_active_annotation;
};

dm.ClientApp.prototype.clearActiveAnnotation = function () {
	this.setActiveAnnotation(null);
	this.setAnnotationBody(null);
};


dm.ClientApp.prototype.getAnnotationBody = function() {
    return this.annotationBody;
};


dm.ClientApp.prototype.setAnnotationBody = function(annotationBody) {
    this.annotationBody = annotationBody;
};

dm.ClientApp.prototype.getUsername = function () {
    return this.username;
};

/**
 * Starts the process of creating a link between two resources, taking a body id and optional annoId,
 * and listening for the next 'resource-click' event for the target id
 */
dm.ClientApp.prototype.createAnnoLink = function (bodyId, opt_annoId) {
    this.linkingInProgress = true;

    this.annoLinkCreationBodyId = bodyId;
    this.annoLinkCreationAnnoId = opt_annoId || this.databroker.createUuid();

    var modeEnteredEvent = new dm.events.LinkingModeEntered(this.annoLinkCreationAnnoId, this.eventDispatcher);
    this.eventDispatcher.dispatchEvent(modeEnteredEvent);

    this.createAnnoLinkAddListeners_();

    this.showLinkCreationUI();
};

/**
 * Cancels the process of creating a link between two resources after createAnnoLink has been called,
 * but no target has yet been added
 */
dm.ClientApp.prototype.cancelAnnoLinking = function () {
    this.linkingInProgress = false;

    var exitedEvent = new dm.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);

    this.annoLinkCreationBodyId = null;
    this.annoLinkCreationAnnoId = null;

    this.createAnnoLinkRemoveListeners_();

    this.hideLinkCreationUI();
};

dm.ClientApp.prototype.renderLinkCreationUI = function () {
	this.linkCreationPopup = $("<div id='cancel-link'>Cancel link creation</div>");
	$("body").append(this.linkCreationPopup);
	var that = this;
	this.linkCreationPopup.on("click", function() {
		that.cancelAnnoLinking();
	});
};

dm.ClientApp.prototype.showLinkCreationUI = function () {
	this.linkCreationPopup.fadeIn();
};

dm.ClientApp.prototype.hideLinkCreationUI = function () {
	this.linkCreationPopup.fadeOut();
};

dm.ClientApp.prototype.createAnnoLinkAddListeners_ = function () {
    goog.events.listen(this.getEventDispatcher(), 'resource-click', this.annoLinkCreationHandler_, false, this);
    goog.events.listen(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

dm.ClientApp.prototype.createAnnoLinkRemoveListeners_ = function () {
    goog.events.unlisten(this.getEventDispatcher(), 'resource-click', this.annoLinkCreationHandler_, false, this);
    goog.events.unlisten(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

dm.ClientApp.prototype.annoLinkCreationHandler_ = function (e) {
    e.stopPropagation();
    e.preventDefault();

    this.createAnnoLinkRemoveListeners_();
    this.linkingInProgress = false;

    var targetUri = e.uri;
    e.viewer.cancelHover();

    // see if this viewer is locked for edit
    if ( e.viewer.isEditable() == false ) {
       alert("Target resource is not locked for edit.\n\nLock it and try again.");
    } else {

       if (this.annoLinkCreationBodyId && targetUri) {
           var bodyId = this.annoLinkCreationBodyId;
           this.annoLinkCreationBodyId = null;

           var anno = this.databroker.dataModel.createAnno(bodyId, targetUri);

           var bezel = new dm.widgets.Bezel('atb-bezel-linked');
           bezel.show();

           this.databroker.sync();
       } else {
          alert("Link creation failed; one of the highlights was missing an ID. Remove and re-add the highlights and try again.");
       }
    }

    this.hideLinkCreationUI();
    var exitedEvent = new dm.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);

};

dm.ClientApp.prototype.annoLinkCreationKeyHandler_ = function (e) {
    var keyCode = e.keyCode;

    if (keyCode == goog.events.KeyCodes.ESC) {
        this.cancelAnnoLinking();
    }
};

dm.ClientApp.prototype.isAnnoLinkingInProgress = function () {
    return this.linkingInProgress;
};

dm.ClientApp.prototype.undoLastAnnoLinkCreation = function () {
    var lastAnnoLinkId = this.createdAnnoLinkIds.pop();

    if (lastAnnoLinkId != null) {
        this.webService.withDeletedResource(lastAnnoLinkId, function () {

        }, this, null);

        var bezel = new dm.widgets.Bezel('atb-bezel-unlinked');
        bezel.show();
    }

    this.hideUndoLinkCreationUI();
};

dm.ClientApp.prototype.onBeforeUnload = function (event) {
    $.ajax({
        url: this.basePath + "/store/lock",
        method: "DELETE",
        async: false
    });
};

dm.ClientApp.prototype.createViewerForUri = function(uri) {
    var databroker = this.databroker;
    var resource = databroker.getResource(uri);

    var viewer = null;

    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.textTypes)) {
        viewer = new dm.viewer.TextEditor(clientApp);
    }
    else if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        viewer = new dm.viewer.CanvasViewer(clientApp);
    }
    else if (resource.hasAnyType('oa:SpecificResource')) {
        var selector = resource.getOneResourceByProperty('oa:hasSelector');

        if (selector.hasType('oa:TextQuoteSelector')) {
            viewer = viewer = new dm.viewer.TextEditor(clientApp);
        }
        else if (selector.hasType('oa:SvgSelector')) {
            viewer = new dm.viewer.CanvasViewer(clientApp);
        }
    }

    return viewer;
};

dm.ClientApp.prototype.scrollIntoView = function(element) {
    var offsetTop = $(element).offset().top;
    offsetTop -= $("#main-nav").outerHeight();
    if (offsetTop < 0) offsetTop = 0;

    $(window).scrollTop(offsetTop);
};
