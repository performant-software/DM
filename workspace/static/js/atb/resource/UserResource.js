goog.provide('atb.resource.UserResource');

goog.require('atb.resource.Resource');

goog.require('goog.array');

atb.resource.UserResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'user');
    
    this.canvasIds = [];
    this.markerIds = [];
    this.textIds = [];
    this.textHighlightIds = [];
    this.annoIds = [];
    this.manuscriptIds = [];
};
goog.inherits(atb.resource.UserResource, atb.resource.Resource);

atb.resource.UserResource.prototype.getCanvasIds = function () {
    return this.canvasIds;
};

atb.resource.UserResource.prototype.getMarkerIds = function () {
    return this.markerIds;
};

atb.resource.UserResource.prototype.getTextIds = function () {
    return this.textIds;
};

atb.resource.UserResource.prototype.getTextHighlightIds = function () {
    return this.textHighlightIds;
};

atb.resource.UserResource.prototype.getAnnoIds = function () {
    return this.annoIds;
};

atb.resource.UserResource.prototype.getManuscriptIds = function () {
    return this.manuscriptIds;
};

atb.resource.UserResource.prototype.getChildIds = function () {
    return goog.array.concat(this.canvasIds, this.markerIds, this.textIds, this.textHighlightIds, this.annoIds, this.manuscriptIds);
};

atb.resource.UserResource.type = 'user';