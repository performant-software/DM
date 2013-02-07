goog.provide('sc.canvas.CommentedCanvasViewer');

goog.require('sc.canvas.CanvasViewer');
goog.require('sc.CommentViewer');

goog.require('goog.events');

/**
 * A subclass of the standard Canvas Viewer which shows comments on constraints
 * on the canvas in popouts over the constraint when they are hovered.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {sc.canvas.CanvasViewer}
 * @param {Object} options Optional configuration information.
 */
sc.canvas.CommentedCanvasViewer = function(options) {
    sc.canvas.CanvasViewer.call(this, options);
    
    this.setupPopup();
};
goog.inherits(sc.canvas.CommentedCanvasViewer, sc.canvas.CanvasViewer);

/**
 * Default options for the canvas which can be overridden in the constructor.
 */
sc.canvas.CommentedCanvasViewer.prototype.options =
jQuery.extend(sc.canvas.CanvasViewer.prototype.options, {
    'popupWidth': 300,
    'popupHeight': 250,
    'popupHideDelay': 500,
    'popupShowDelay': 300
});

/**
 * Sets up the dom for the comments popup.
 *
 * @protected
 */
sc.canvas.CommentedCanvasViewer.prototype.setupPopup = function() {
    this.popupDiv = document.createElement('div');
    jQuery(this.popupDiv).addClass('sc-CanvasViewer-popup').hide();
    
    this.calloutArrow = document.createElement('div');
    jQuery(this.calloutArrow).addClass('sc-CanvasViewer-popup-calloutArrow');
    jQuery(this.popupDiv).append(this.calloutArrow);
    jQuery(this.popupDiv).append('<h3>comments:</h3>')
    
    var self = this;
    
    jQuery(this.popupDiv).mouseenter(function(event) {
        self.mouseIsOverPopup = true;
    });
    jQuery(this.popupDiv).mouseleave(function(event) {
        self.mouseIsOverPopup = false;
                                     
        self.delayedMaybeHideComments();
    });
    
    this.commentViewer = new sc.CommentViewer(this.databroker);
    this.commentViewer.render(this.popupDiv);
    
    jQuery('body').prepend(this.popupDiv);
    
    goog.events.listen(this.mainViewport, ['mouseover', 'mousemove'],
                       this.handleMouseover, false, this);
    goog.events.listen(this.mainViewport, 'mouseout',
                       this.handleMouseout, false, this);
};

/**
 * Shows the comments popup at a given position for a given resource uri. The
 * popup will not be shown again if it is already being shown for the given
 * resource.
 *
 * @param {string} uri The uri of the resource to show comments for.
 * @param {Object} pagePosition An object with x and y properties representing
 * the coordinates relative to the top left corner of the page at which the
 * comments popup should be shown.
 */
sc.canvas.CommentedCanvasViewer.prototype.showComments =
function(uri, pagePosition) {
    if (this.isShowingComments && uri == this.currentFeatureUri)
        return;
    
    this.isShowingComments = true;
    this.currentFeatureUri = uri;
    
    this.commentViewer.setUri(uri);
    
    var popupCoords = this.calculatePopupCoords(pagePosition);
    
    jQuery(this.popupDiv).css({
        'top': popupCoords.y,
        'left': popupCoords.x,
        'width': this.options.popupWidth,
        'height': this.options.popupHeight
    });
    
    jQuery(this.popupDiv).show();
    
    jQuery(this.calloutArrow).offset({
        'top': pagePosition.y,
        'left': pagePosition.x - 8
    });
};

/**
 * Calculates the coordinates at which the comments popup should be shown,
 * trying to center it under the given coords, while still fitting it within
 * the window.
 *
 * @param {Object} pageCoords An object with x and y properties representing
 * the coordinates relative to the top left corner of the page at which the
 * comments popup should be shown.
 */
sc.canvas.CommentedCanvasViewer.prototype.calculatePopupCoords =
function(pageCoords) {
    var yCoord = pageCoords.y + 16;
    var xCoord = pageCoords.x - this.options.popupWidth / 2;
    
    var farXcoord = xCoord + this.options.popupWidth;
    var farYcoord = yCoord + this.options.popupHeight;
    
    var windowWidth = jQuery(window).width();
    var windowHeight = jQuery(window).height();
    
    var PADDING = 5;
    
    if (windowWidth < farXcoord + PADDING) {
        var xOverrun = farXcoord - windowWidth;
        xCoord -= xOverrun + 5;
    }
    if (windowHeight < farYcoord + PADDING) {
        var yOverrun = farYcoord - windowHeight;
        yCoord -= yOverrun + 5;
    }
    
    if (xCoord < PADDING) {
        xCoord = PADDING;
    }
    if (yCoord < PADDING) {
        yCoord = PADDING;
    }
    
    if (xCoord < 0) {
        xCoord = 0;
    }
    if (yCoord < 0) {
        yCoord = 0;
    }
    
    return {
        'x': xCoord,
        'y': yCoord
    };
};

/**
 * Shows the comments popup at the given position for the given resource uri
 * after the delay specified in the options.
 *
 * @param {string} uri The uri of the resource to show comments for.
 * @param {Object} pagePosition An object with x and y properties representing
 * the coordinates relative to the top left corner of the page at which the
 * comments popup should be shown.
 */
sc.canvas.CommentedCanvasViewer.prototype.delayedShowComments =
function(uri, pagePosition) {
    var self = this;
    window.setTimeout(function() {
        self.showComments(uri, pagePosition);
    }, this.options.popupShowDelay);
};

/**
 * Hides the comments popup.
 */
sc.canvas.CommentedCanvasViewer.prototype.hideComments = function() {
    this.isShowingComments = false;
    
    jQuery(this.popupDiv).hide();
};

/**
 * Hides the comments popup only if the mouse is not over the original feature
 * or the popup.
 */
sc.canvas.CommentedCanvasViewer.prototype.maybeHideComments = function() {
    if (!(this.mouseIsOverFeature || this.mouseIsOverPopup)) {
        this.hideComments();
    }
};

/**
 * Calls maybeHideComments after the hide delay specified in the options.
 */
sc.canvas.CommentedCanvasViewer.prototype.delayedMaybeHideComments =
function() {
    var self = this;
    window.setTimeout(function() {
        self.maybeHideComments();
    }, this.options.popupHideDelay);
};

/**
 * Handles mouseover events from a viewport.
 *
 * @protected
 * @param {Event} event The event fired.
 */
sc.canvas.CommentedCanvasViewer.prototype.handleMouseover = function(event) {
    var featureType = event.feature.type;
    var uri = event.uri;
    
    if (featureType == 'image') {
        return;
    }
    
    this.mouseIsOverFeature = true;
    
    var pagePosition = {
        'x': event.pageX,
        'y': event.pageY
    };
    
    this.delayedShowComments(uri, pagePosition);
};

/**
 * Handles mouseout events from a viewport.
 *
 * @protected
 * @param {Event} event The event fired.
 */
sc.canvas.CommentedCanvasViewer.prototype.handleMouseout = function(event) {
    this.mouseIsOverFeature = false;
    
    this.delayedMaybeHideComments();
};