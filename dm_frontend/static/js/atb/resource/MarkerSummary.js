goog.provide('atb.resource.MarkerSummary');

goog.require('atb.resource.ResourceSummary');
goog.require('goog.math.Size');

/**
 * @extends atb.resource.ResourceSummary
 * 
 * @param resourceId
 * @param clickHandler
 * @param clickHandlerScope
 * @param resource
 * @param webService
 */
atb.resource.MarkerSummary = function (resourceId, clickHandler, clickHandlerScope, resource, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, resourceId, clickHandler, clickHandlerScope, resource, clientApp, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Marker';

    this.selected = false;

    this.setTooltip('Show this marker on the canvas');

    this.thumbInfo = {
                        width: 75,
                        height: 75,
                        uri: this.webService.resourceJpgURI(this.resource.getRemoteId(), [75,75], false)
                    };

    this.decorate();
};
goog.inherits(atb.resource.MarkerSummary, atb.resource.ResourceSummary);

atb.resource.MarkerSummary.prototype.decorate = function () {
    jQuery(this.outerDiv).addClass('atb-markersummary');
    
    this.imageDiv = this.domHelper.createDom(
        'div',
        {
            'class' : 'atb-markersummary-thumb'
        }
    );
    jQuery(this.imageDiv).width(this.thumbInfo.width);
    jQuery(this.imageDiv).height(this.thumbInfo.height);
    
    var image = new Image();
    image.src = this.thumbInfo.uri;
    
    jQuery(image).load(atb.Util.scopeAsyncHandler(function (e) {
                                                  jQuery(this.imageDiv).fadeTo(200, 0.0, atb.Util.scopeAsyncHandler(function () {
                                                        jQuery(this.imageDiv).removeClass('atb-markersummary-loadingSpinner');
                                                        jQuery(this.imageDiv).css('background-image', 'url('+this.thumbInfo.uri+')');
                                                        jQuery(this.imageDiv).fadeTo(200, 1.0);
                                                       }, this));
                                                  
                                                  }, this));
    
    jQuery(this.imageDiv).addClass('atb-markersummary-loadingSpinner');
    
    this.div.appendChild(this.imageDiv);
};
