goog.provide('atb.resource.TextResource');

goog.require('atb.resource.Resource');

atb.resource.TextResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'text');
    
    this.annoIdsAsBody = [];
    
    this.contents = '';
    this.highlightIds = [];
    this.purpose = '';
};
goog.inherits(atb.resource.TextResource, atb.resource.Resource);

atb.resource.TextResource.prototype.getContents = function () {
    return this.contents;
};

atb.resource.TextResource.prototype.getHighlightIds = function () {
    return this.highlightIds;
};

atb.resource.TextResource.prototype.getChildIds = function () {
    return this.highlightIds;
};

atb.resource.TextResource.prototype.getAnnoIdsAsBody = function () {
    return this.annoIdsAsBody;
};

atb.resource.TextResource.prototype.getPurpose = function () {
    return this.purpose;
};

atb.resource.TextResource.type = 'text';