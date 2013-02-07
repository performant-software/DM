goog.provide('atb.viewer.ViewerThumbnail');

goog.require('jquery.jQuery');

atb.viewer.ViewerThumbnail = function (viewer) {
    this.viewer = viewer;
    
    this.clientApp = viewer.getClientApp();
    this.domHelper = viewer.getDomHelper();
    this.resourceId = viewer.resourceId;
    
    this.title = '';
    
    this.titleDiv = this.domHelper.createDom('div', {'class': 'atb-ViewerThumbnail-title'});
    this.titleParentDiv = this.domHelper.createDom('span', {'class': 'atb-ViewerThumbnail-titleParent'}, this.titleDiv);
    this.baseDiv = this.domHelper.createDom('div', {'class': 'atb-ViewerThumbnail'}, this.titleParentDiv);
    
    goog.events.listen(this.baseDiv, 'mouseover', this.handleMouseOver, false, this);
    goog.events.listen(this.baseDiv, 'mouseout', this.handleMouseOut, false, this);
    goog.events.listen(this.baseDiv, 'click', this.handleClick, false, this);
};

atb.viewer.ViewerThumbnail.WIDTH = 150;
atb.viewer.ViewerThumbnail.HEIGHT = 150;

atb.viewer.ViewerThumbnail.prototype.render = function (div) {
    div.appendChild(this.baseDiv);
    
    return this.baseDiv;
};

atb.viewer.ViewerThumbnail.prototype.getResourceId = function () {
    return this.resourceId;
};

atb.viewer.ViewerThumbnail.prototype.getResource = function () {
    return this.resource;
};

atb.viewer.ViewerThumbnail.prototype.getViewer = function () {
    return this.viewer;
};

atb.viewer.ViewerThumbnail.prototype.setTitle = function (title) {
    this.title = title;
    jQuery(this.titleDiv).text(title);
};

atb.viewer.ViewerThumbnail.prototype.getTitle = function () {
    return this.title;
};

atb.viewer.ViewerThumbnail.prototype.handleMouseOver = function (event) {
    jQuery(this.titleDiv).addClass('atb-ViewerThumbnail-title-hover');
};

atb.viewer.ViewerThumbnail.prototype.handleMouseOut = function (event) {
    jQuery(this.titleDiv).removeClass('atb-ViewerThumbnail-title-hover');
};

atb.viewer.ViewerThumbnail.prototype.handleClick = function (event) {
    
};

atb.viewer.ViewerThumbnail.prototype.getUid = function () {
    return this.viewer.getUid();
};