goog.provide('atb.viewer.TextThumbnail');

goog.require('atb.viewer.ViewerThumbnail');

atb.viewer.TextThumbnail = function (viewer) {
    atb.viewer.ViewerThumbnail.call(this, viewer);
    
    this.resource = this.viewer.textResource;
    
    this.setTitle(this.resource.getTitle());
    
    jQuery(this.baseDiv).addClass('atb-TextThumbnail');
};
goog.inherits(atb.viewer.TextThumbnail, atb.viewer.ViewerThumbnail);