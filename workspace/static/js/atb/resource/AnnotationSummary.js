goog.provide('atb.resource.AnnotationSummary');

goog.require('atb.resource.ResourceCollection');
goog.require('atb.Util');

/**
 * @extends {atb.resource.ResourceCollection}
 */
atb.resource.AnnotationSummary = function (opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceCollection.call(this, opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Annotation';
    
    this.setType('anno');
};
goog.inherits(atb.resource.AnnotationSummary, atb.resource.ResourceCollection);

atb.resource.AnnotationSummary.prototype.enableDelete = function (deleteClickHandler) {
    atb.resource.ResourceSummary.prototype.enableDelete.call(this, deleteClickHandler);
    var deleteHandler = function (summary, event) {
        deleteClickHandler(summary, event);
        
        if (summary == this.topSummary) {
            deleteClickHandler(this, event);
        }
    };
    
    atb.resource.ResourceCollection.prototype.enableDelete.call(this, atb.Util.scopeAsyncHandler(deleteHandler, this));
};

atb.resource.AnnotationSummary.prototype.disableDelete = function () {
    atb.resource.ResourceCollection.prototype.disableDelete.call(this);
    atb.resource.ResourceSummary.prototype.disableDelete.call(this);
};

atb.resource.AnnotationSummary.prototype.changeClickHandler = function (tempClickHandler) {
    atb.resource.ResourceSummary.prototype.changeClickHandler.call(this, tempClickHandler);
    if (this.topSummary)
        this.topSummary.changeClickHandler(tempClickHandler);
    
    for (var id in this.summaries) {
        this.summaries[id].changeClickHandler(tempClickHandler);
    }
};

atb.resource.AnnotationSummary.prototype.resetClickHandler = function () {
    atb.resource.ResourceSummary.prototype.resetClickHandler.call(this);
    if (this.topSummary)
        this.topSummary.resetClickHandler();
    
    for (var id in this.summaries) {
        this.summaries[id].resetClickHandler();
    }
};