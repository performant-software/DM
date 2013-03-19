goog.provide('atb.viewer.ViewerContainer');

goog.require('goog.dom.DomHelper');
goog.require('goog.events.EventTarget')
goog.require('jquery.jQuery');

atb.viewer.ViewerContainer = function(opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.viewer = null;
    this.grid = null;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.element = this.domHelper.createDom('div', {'class': 'atb-ViewerContainer'});
    this.titleEl = this.domHelper.createDom('h3', {'class': 'atb-ViewerContainer-title'});
    this.viewerEl = this.domHelper.createDom('div', {'class': 'atb-ViewerContainer-viewer'});
    this.element.appendChild(this.titleEl);
    this.element.appendChild(this.viewerEl);
};
goog.inherits(atb.viewer.ViewerContainer, goog.events.EventTarget);

atb.viewer.ViewerContainer.prototype.setViewer = function(viewer) {
    if (this.viewer) {
        jQuery(this.viewer.getElement()).detach();
        this.viewer.setContainer(null);
    }

    this.viewer = viewer;
    this.viewer.setContainer(this);
    viewer.render(this.viewerEl);
};

atb.viewer.ViewerContainer.prototype.getViewer = function() {
    return this.viewer;
};

atb.viewer.ViewerContainer.prototype.render = function(div) {
    div.appendChild(this.element);
};

atb.viewer.ViewerContainer.prototype.getDomHelper = function() {
    return this.domHelper;
};

atb.viewer.ViewerContainer.prototype.setTitle = function(title) {
    this.title = title;
};

atb.viewer.ViewerContainer.prototype.getTitle = function() {
    return this.title;
};

atb.viewer.ViewerContainer.prototype.setTitleEditable = function(editable) {
    this.isTitleEditable = editable;
};

atb.viewer.ViewerContainer.prototype.getElement = function() {
    return this.element;
};

atb.viewer.ViewerContainer.prototype.autoResize = function() {
    if (this.viewer) {
        var $el = jQuery(this.element);

        var width = $el.innerWidth();
        var height = $el.innerHeight() - jQuery(this.titleEl).outerHeight();

        this.viewer.resize(width, height);
    }
};

atb.viewer.ViewerContainer.prototype.close = function() {
    

    if (this.grid) {
        this.grid.removeViewerContainer(this);
    }
};