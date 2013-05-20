goog.provide('sc.CommentViewer');

goog.require('goog.dom.DomHelper');
goog.require('goog.events.EventTarget');
goog.require('goog.structs.Map');
goog.require('goog.ui.AnimatedZippy');

/**
 * A simple tool for viewing all comment annotations on a resource, no matter
 * what type that resource is. Implements the W3C EventTarget interface.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @extends {goog.events.EventTarget}
 *
 * @param {sc.data.Databroker} databroker The databroker from which annotation
 * data should be queried.
 * @param {(Object|null|undefined)} options Options to apply to this Comment
 * Comment Viewer.
 */
sc.CommentViewer = function(databroker, options) {
    goog.events.EventTarget.call(this);
    if (! options) {
        options = {};
    }
    this.options = jQuery.extend(this.options, options);
    
    this.databroker = databroker;
    
    this.domHelper = new goog.dom.DomHelper(this.options.doc);
    
    this.commentsDiv = this.domHelper.createDom('div', {
        'class': 'sc-CommentViewer-comments'
    });
    this.div = this.domHelper.createDom('div', {
        'class': 'sc-CommentViewer'
    }, this.commentsDiv);
    
    this.commentDivsByUri = new goog.structs.Map();
    this.zippiesByUri = new goog.structs.Map();
};
goog.inherits(sc.CommentViewer, goog.events.EventTarget);

/**
 * The types of annotation bodies which should be rendered as comments.
 */
sc.CommentViewer.COMMENT_BODY_TYPES = ['media-types:text/html'];

/**
 * The default options.
 */
sc.CommentViewer.prototype.options = {
    'doc': window.document
};

/**
 * Appends the Comment Viewer to an element.
 *
 * @param {Element} div The element to which the Comment Viewer should be
 * appended.
 */
sc.CommentViewer.prototype.render = function(div) {
    div.appendChild(this.div);
};

/**
 * Returns the base element used for the gui of the Comment Viewer.
 *
 * @return {Element} The base element.
 */
sc.CommentViewer.prototype.getElement = function() {
    return this.div;
};

/**
 * Removes all comments from the viewer.
 */
sc.CommentViewer.prototype.clear = function() {
    jQuery(this.commentsDiv).empty();
    
    this.commentDivsByUri.clear();
    this.zippiesByUri.clear();
};

/**
 * Adds a comment body resource given its uri. If the resource has already been
 * rendered, it will only be modified, rather than added again.
 *
 * @param {string} uri The uri of the body comment resource.
 */
sc.CommentViewer.prototype.addOrModifyComment = function(uri) {
    var resource = this.databroker.getResource(uri);
    
    var title = resource.getOneProperty('dc:title') || 'Untitled comment';
    var content = resource.getOneProperty('cnt:chars') ||
    'comment has no content';
    
    if (! this.isCommentRendered(uri)) {
        var headerDiv = this.domHelper.createDom('h3', {
            'class': 'sc-CommentViewer-comment-title'
        });
        
        var contentDiv = this.domHelper.createDom('div', {
            'class': 'sc-CommentViewer-comment-content'
        });
        
        var wrapperDiv = this.domHelper.createDom('div', {
            'class': 'sc-CommentViewer-comment'
        }, headerDiv, contentDiv);
        this.commentDivsByUri.set(uri, wrapperDiv);
        
        var zippy = new goog.ui.AnimatedZippy(headerDiv, contentDiv, false);
        this.zippiesByUri.set(uri, zippy);
        
        this.commentsDiv.appendChild(wrapperDiv);
    }
    else {
        var wrapperDiv = this.commentDivsByUri.get(uri);
        var headerDiv = jQuery(wrapperDiv).find('.sc-CommentViewer-comment-title');
        var contentDiv = jQuery(wrapperDiv).find('.sc-CommentViewer-comment-content');
        
        var zippy = this.zippiesByUri.get(uri);
    }
    
    jQuery(headerDiv).text(title);
    jQuery(contentDiv).html(content);
};

/**
 * Returns whether a comment body with a given uri has already been rendered.
 *
 * @param {string} uri The uri of the comment body resource.
 * @return {boolean} True if the resource has already been rendered.
 */
sc.CommentViewer.prototype.isCommentRendered = function(uri) {
    return this.commentDivsByUri.containsKey(uri);
};

/**
 * Sets the uri of the resource for which comments should be displayed.
 * Note: loading of comments is not synchronous.
 *
 * @param {string} uri The uri of the resource to show comments for.
 * @return {sc.CommentViewer} This.
 */
sc.CommentViewer.prototype.setUri = function(uri) {
    this.uri = uri;
    
    this.clear();
    
    var withBodyResource = function(resource) {
        if (resource.hasAnyType(sc.CommentViewer.COMMENT_BODY_TYPES)) {
            this.addOrModifyComment(resource.getUri());
        }
    };
    withBodyResource = jQuery.proxy(withBodyResource, this);
    
    var withResource = function(resource) {
        if (! resource.isSameAs(this.uri)) {
            return;
        }
        
        var targetAnnoUris = this.databroker.dataModel.findAnnosReferencingResourceAsTarget(uri);
        
        for (var i=0, len=targetAnnoUris.length; i<len; i++) {
            var annoResource = this.databroker.getResource(targetAnnoUris[i]);
            
            var bodyUri = annoResource.getOneProperty('oac:hasBody');
            var deferredBody = this.databroker.getDeferredResource(bodyUri);
            deferredBody.progress(withBodyResource).done(withBodyResource);
        }
    };
    withResource = jQuery.proxy(withResource, this);
    
    var deferred = this.databroker.getDeferredResource(uri);
    deferred.progress(withResource).done(withResource);
    
    return this;
};