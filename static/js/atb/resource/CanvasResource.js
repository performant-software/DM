goog.provide('atb.resource.CanvasResource');

goog.require('atb.resource.Resource');

goog.require('goog.structs.Map');
goog.require('goog.math.Size');

atb.resource.CanvasResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'canvas');
    
    this.markerIds = [];
    
    this.thumb = {
    id: null,
    height: null,
    width: null,
    uri: ''
    };
    
    this.height = null;
    this.width = null;
    
    this.defaultImage = '';
    
    this.images = new goog.structs.Map();
};
goog.inherits(atb.resource.CanvasResource, atb.resource.Resource);

atb.resource.CanvasResource.prototype.getMarkerIds = function () {
    return this.markerIds;
};

atb.resource.CanvasResource.prototype.getChildIds = function () {
    return this.markerIds;
};

atb.resource.CanvasResource.prototype.getThumbInfo = function () {
    return this.thumb;
};

atb.resource.CanvasResource.prototype.getThumbSize = function () {
    return new goog.math.Size(this.thumb.width, this.thumb.height);
};

atb.resource.CanvasResource.prototype.getDefaultImageId = function () {
    return this.defaultImage;
};

atb.resource.CanvasResource.prototype.getImages = function () {
    return this.images;
};

atb.resource.CanvasResource.prototype.getImageById = function (id) {
    return this.images.get(id);
};

atb.resource.CanvasResource.prototype.getDefaultImage = function () {
    return this.getImageById(this.defaultImage);
};

atb.resource.CanvasResource.prototype.getWidth = function () {
    return this.width;
};

atb.resource.CanvasResource.prototype.getHeight = function () {
    return this.height;
};

atb.resource.CanvasResource.prototype.getSize = function () {
    return new goog.math.Size(this.width, this.height);
};

atb.resource.CanvasResource.type = 'canvas';