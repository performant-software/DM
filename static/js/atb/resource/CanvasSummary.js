goog.provide('atb.resource.CanvasSummary');

goog.require('atb.resource.ResourceSummary');
goog.require('goog.math.Size');
goog.require("atb.util.ReferenceUtil");

/**
 * atb.resource.CanvasSummary
 * 
 * Provides an overview of an image based resource
 * 
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends atb.resource.ResourceSummary
 */
atb.resource.CanvasSummary = function (resourceId, clickHandler, clickHandlerScope, resource, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, resourceId, clickHandler, clickHandlerScope, resource, clientApp, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Canvas';
    
	this.thumbURI = resource.getThumbInfo().uri;
    this.size = resource.getThumbSize();
    this.title = resource.getTitle();
	
    this.decorate();
};
goog.inherits(atb.resource.CanvasSummary, atb.resource.ResourceSummary);

atb.resource.CanvasSummary.prototype.decorate = function () {
    var image = this.domHelper.createDom(
        'img',
        {
            'src': this.webService.mediaURI + this.thumbURI,
            'width': this.size.width,
            'height': this.size.height
        }
    );
    
    if (! this.styleOptions.titleOnly) this.div.appendChild(image);
    
    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-resourcesummary-title'
        }
    );
    jQuery(this.titleDiv).html(this.title);
    jQuery(this.div).append(this.titleDiv);
    
    if (! this.styleOptions.titleOnly) {
        jQuery(this.div).append('<div class="atb-resourcesummary-user">added by ' + this.resource.getUser() + '</div>');
        jQuery(this.div).append('<div style="clear:both;" />');
    }
};
