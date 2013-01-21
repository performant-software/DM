goog.provide('atb.resource.TextHighlightResource');

goog.require('atb.resource.Resource');

atb.resource.TextHighlightResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'textHighlight');
    
    this.textId = '';
    this.annoIdsAsBody = [];
    this.contents = '';
    this.textTitle = '';
};
goog.inherits(atb.resource.TextHighlightResource, atb.resource.Resource);

atb.resource.TextHighlightResource.prototype.getTextId = function () {
    return this.textId;
};

atb.resource.TextHighlightResource.prototype.getAnnoIdsAsBody = function () {
    return this.annoIdsAsBody;
};

atb.resource.TextHighlightResource.prototype.getContents = function () {
    return this.contents;
};

atb.resource.TextHighlightResource.prototype.getTitle = atb.resource.TextHighlightResource.prototype.getContents;

atb.resource.TextHighlightResource.prototype.getTextTitle = function () {
    return this.textTitle;
};

atb.resource.TextHighlightResource.type = 'textHighlight';