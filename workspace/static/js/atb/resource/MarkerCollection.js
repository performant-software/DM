goog.provide('atb.resource.MarkerCollection');

goog.require('atb.resource.ResourceCollection');

/**
 * @extends {atb.resource.ResourceCollection}
 */
atb.resource.MarkerCollection = function (canvasId, canvasTitle, clickHandler, clickHandlerScope, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceCollection.call(this, null, clickHandler, clickHandlerScope, canvasId, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Marker Collection';
    
    this.setCanvasTitle(canvasTitle);
    
    jQuery(this.div).addClass('atb-markercollection');
    
    this.renderPanelCtrls();
    
    this.loadableResources = [];
};
goog.inherits(atb.resource.MarkerCollection, atb.resource.ResourceCollection);

atb.resource.MarkerCollection.prototype.addChildSummary = function (summary) {
    atb.resource.ResourceCollection.prototype.addChildSummary.call(this, summary);
    
    if (summary.resource)
        this.loadableResources.push(summary.resource);
};

atb.resource.MarkerCollection.prototype.setCanvasTitle = function (title) {
    this.title = title;
    
    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            //'class': 'atb-resourcesummary-title'
        }
    );
        
    jQuery(this.titleDiv).html(title);
    jQuery(this.parentDiv).append(this.titleDiv);
    
    //this.twirlDown = new atb.widgets.TwirlDown(this.parentDiv, this.childrenDiv, this.button, true);
};

atb.resource.MarkerCollection.prototype.enableDelete = function (deleteClickHandler) {
    var deleteHandler = function (summary, event) {
        deleteClickHandler(summary, event);
    }
    
    atb.resource.ResourceCollection.prototype.enableDelete.call(this, atb.Util.scopeAsyncHandler(deleteHandler, this));
};

atb.resource.MarkerCollection.prototype.onChildSelected = function (summary) {
    var numSummaries = 0;
    var numSelectedSummaries = 0;
    
    for (var id in this.summaries) {
        if (this.summaries.hasOwnProperty(id)) {
            var summary = this.summaries[id];
            
            numSummaries ++;
            
            if (summary.selected) {
                numSelectedSummaries ++;
            }
        }
    }
    
    if (numSummaries == numSelectedSummaries) {
        this.setSelected(true);
    }
};