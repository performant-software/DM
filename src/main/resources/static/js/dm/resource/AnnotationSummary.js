goog.provide('dm.resource.AnnotationSummary');

goog.require('dm.resource.ResourceCollection');
goog.require('dm.Util');

/**
 * @extends {dm.resource.ResourceCollection}
 */
dm.resource.AnnotationSummary = function (opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions) {
    dm.resource.ResourceCollection.call(this, opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Annotation';
    
    this.setType('anno');
};
goog.inherits(dm.resource.AnnotationSummary, dm.resource.ResourceCollection);

dm.resource.AnnotationSummary.prototype.enableDelete = function (deleteClickHandler) {
    dm.resource.ResourceSummary.prototype.enableDelete.call(this, deleteClickHandler);
    var deleteHandler = function (summary, event) {
        deleteClickHandler(summary, event);
        
        if (summary == this.topSummary) {
            deleteClickHandler(this, event);
        }
    };
    
    dm.resource.ResourceCollection.prototype.enableDelete.call(this, dm.Util.scopeAsyncHandler(deleteHandler, this));
};

dm.resource.AnnotationSummary.prototype.disableDelete = function () {
    dm.resource.ResourceCollection.prototype.disableDelete.call(this);
    dm.resource.ResourceSummary.prototype.disableDelete.call(this);
};

dm.resource.AnnotationSummary.prototype.changeClickHandler = function (tempClickHandler) {
    dm.resource.ResourceSummary.prototype.changeClickHandler.call(this, tempClickHandler);
    if (this.topSummary)
        this.topSummary.changeClickHandler(tempClickHandler);
    
    for (var id in this.summaries) {
        this.summaries[id].changeClickHandler(tempClickHandler);
    }
};

dm.resource.AnnotationSummary.prototype.resetClickHandler = function () {
    dm.resource.ResourceSummary.prototype.resetClickHandler.call(this);
    if (this.topSummary)
        this.topSummary.resetClickHandler();
    
    for (var id in this.summaries) {
        this.summaries[id].resetClickHandler();
    }
};