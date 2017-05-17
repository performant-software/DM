goog.provide('dm.resource.MarkerAnnotationSummary');

goog.require('dm.resource.AnnotationSummary');

dm.resource.MarkerAnnotationSummary = function (opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions) {
    dm.resource.AnnotationSummary.call(this, opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions);
};
goog.inherits(dm.resource.MarkerAnnotationSummary, dm.resource.AnnotationSummary);

dm.resource.MarkerAnnotationSummary.prototype.decorate = function () {
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

dm.resource.MarkerAnnotationSummary.prototype.setExpanded = function (expanded) {
    return false;
};