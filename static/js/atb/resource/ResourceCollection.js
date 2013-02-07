goog.provide('atb.resource.ResourceCollection');

goog.require('goog.dom');

goog.require('atb.resource.ResourceSummary');
goog.require('atb.widgets.TwirlDown');

/**
 * @extends {atb.resource.ResourceSummary}
 */
atb.resource.ResourceCollection = function (opt_parentSummary, opt_clickHandler, opt_clickHandlerScope, opt_resourceId, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, opt_resourceId, opt_clickHandler || function () {}, opt_clickHandlerScope || this, null, null, opt_domHelper, opt_styleOptions);
    
    this.summaries = {};
    
    this.decorate();
    
    if (opt_parentSummary) {
        this.setParentSummary(opt_parentSummary);
    }
};
goog.inherits(atb.resource.ResourceCollection, atb.resource.ResourceSummary);

atb.resource.ResourceCollection.prototype.addChildSummary = function (summary) {
    this.summaries[summary.resourceId] = summary;
    summary.parent = this;
    summary.render(this.childrenDiv);
};

atb.resource.ResourceCollection.prototype.deleteChildSummary = function (summary) {
    delete this.summaries[summary.resourceId];
};

atb.resource.ResourceCollection.prototype.addChildSummaries = function (summaries) {
    for (var x in summaries) {
        this.addChildSummary(summaries[x]);
    }
};

atb.resource.ResourceCollection.prototype.setParentSummary = function (summary) {
    this.topSummary = summary;
    summary.parent = this;
    this.resourceId = this.resourceId || summary.resourceId;
    summary.render(this.parentDiv);
    
//    if (summary.titleDiv) {
//        this.twirlDown = new atb.widgets.TwirlDown(this.parentDiv, this.childrenDiv, summary.titleDiv, true);
//    }
};

atb.resource.ResourceCollection.prototype.decorate = function () {
    jQuery(this.div).addClass('atb-ResourceCollection');
    
    this.parentDiv = this.domHelper.createDom('div',
        {'class': 'atb-resourcecollection-parent'}
    );
    /*
    this.titleDiv = goog.dom.createDom('div',
        {'class': 'atb-resourcecollection-title'}
    );
    this.titleText = goog.dom.createTextNode('TITLE HERE');
    this.titleDiv.appendChild(this.titleText);
    this.parentDiv.appendChild(this.titleDiv);
    */
    this.childrenDiv = this.domHelper.createDom('div', {
        'class': 'atb-resourcecollection-children '
    });
    this.button = this.domHelper.createDom('div', {
        'class': 'atb-twirldown-button',
        'title': 'Click to show and hide the resources below'
    });

    this.div.appendChild(this.button);
    this.div.appendChild(this.parentDiv);
    this.div.appendChild(this.childrenDiv);
    
    this.twirlDown = new atb.widgets.TwirlDown(this.parentDiv, this.childrenDiv, this.button, true);
};

atb.resource.ResourceCollection.prototype.render = function (opt_div) {
    goog.events.listen(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);

    goog.dom.appendChild(this.outerDiv, this.div);
    
    if (opt_div) {
        goog.dom.appendChild(opt_div, this.outerDiv);
    }
    return this.outerDiv;
};

atb.resource.ResourceCollection.prototype.getChildSummaries = function () {
    return this.summaries;
};

atb.resource.ResourceCollection.prototype.getAllChildSummaries = function () {
    var result = [];
    
    for (var x in this.summaries) {
        var summary = this.summaries[x];
        
        if (summary.summaries) {
            result.concat(this.summaries.concat(summary.getAllChildSummaries()));
        }
    }
    
    return result;
};

atb.resource.ResourceCollection.prototype.getNumChildSummaries = function () {
    var result = 0;
    for (var x in this.summaries) {
        result ++;
    }
    return result;
};

atb.resource.ResourceCollection.prototype.selectSummaries = function (ids) {
    for (var x in ids) {
        ids[x].setSelected(true);
    }
};

atb.resource.ResourceCollection.prototype.unselectSummaries = function (ids) {
    for (var x in ids) {
        ids[x].setSelected(false);
    }
};

atb.resource.ResourceCollection.prototype.enableDelete = function (deleteClickHandler) {
    if (this.topSummary) {
        this.topSummary.enableDelete(deleteClickHandler);
    }
    
    for (var id in this.summaries) {
        this.summaries[id].enableDelete(deleteClickHandler);
    }
};

atb.resource.ResourceCollection.prototype.disableDelete = function () {
    if (this.topSummary) {
        this.topSummary.disableDelete();
    }
    
    for (var id in this.summaries) {
        this.summaries[id].disableDelete();
    }
};

atb.resource.ResourceCollection.prototype.changeClickHandler = function (tempClickHandler) {
    if (this.topSummary)
        this.topSummary.changeClickHandler(tempClickHandler);
    
    for (var id in this.summaries) {
        this.summaries[id].changeClickHandler(tempClickHandler);
    }
};

atb.resource.ResourceCollection.prototype.resetClickHandler = function () {
    if (this.topSummary)
        this.topSummary.resetClickHandler();
    
    for (var id in this.summaries) {
        this.summaries[id].resetClickHandler();
    }
};

atb.resource.ResourceCollection.prototype.setType = function (type) {
    this.type = type;
};

atb.resource.ResourceCollection.prototype.setExpanded = function (expanded) {
    if (this.twirlDown)
        this.twirlDown.setExpanded(expanded);
};