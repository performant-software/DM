goog.provide('atb.resource.ManuscriptResource');

goog.require('atb.resource.Resource');

atb.resource.ManuscriptResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'manuscript');
    
    this.title = '';
    this.pages = [
                  {id: '', page: ''}
    ];
};
goog.inherits(atb.resource.ManuscriptResource, atb.resource.Resource);

atb.resource.ManuscriptResource.prototype.getPages = function () {
    return this.pages;
};

atb.resource.ManuscriptResource.prototype.getChildIds = function () {
    var ids = [];
    
    for (var i=0, len=this.pages.length; i<len; i++) {
        var page = this.pages[i];
        
        ids.push(page.id);
    }
    
    return ids;
};

atb.resource.ManuscriptResource.type = 'manuscript';