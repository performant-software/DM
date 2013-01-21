goog.provide('atb.resource.MarkerAnnotationSummary');

goog.require('atb.resource.AnnotationSummary');

atb.resource.MarkerAnnotationSummary = function (opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions) {
    atb.resource.AnnotationSummary.call(this, opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions);
};
goog.inherits(atb.resource.MarkerAnnotationSummary, atb.resource.AnnotationSummary);

atb.resource.MarkerAnnotationSummary.prototype.decorate = function () {
    jQuery(this.div).addClass('atb-ResourceCollection');
    jQuery(this.div).addClass('atb-MarkerAnnotationSummary');
    
    this.parentDiv = this.domHelper.createDom('div',
                                              {'class': 'atb-markerannotationsummary-parentDiv'}
                                              );
    
    this.arrowDiv = this.domHelper.createDom('div',
                                             {'class': 'atb-markerannotatationsummary-arrow'}
                                             );
    
    this.childrenDiv = this.domHelper.createDom('div', {
                                                'class': 'atb-markerannotationsummary-childrenDiv'
                                                });

    this.div.appendChild(this.parentDiv);
    this.div.appendChild(this.arrowDiv);
    this.div.appendChild(this.childrenDiv);
};

atb.resource.MarkerAnnotationSummary.prototype.setExpanded = function (expanded) {
    return false;
};