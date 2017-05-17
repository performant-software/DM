goog.provide('dm.resource.ManuscriptSummary');

goog.require('dm.resource.ResourceSummary');

goog.require('goog.structs.Map');

dm.resource.ManuscriptSummary = function (resourceId, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions) {
    dm.resource.ResourceSummary.call(this, resourceId, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Manuscript';
    
    this.title = '' + resource.getTitle();
    
    this.pageSummaries = [];
    this.pageSummaryById = new goog.structs.Map();
    
    this.decorate();
};
goog.inherits(dm.resource.ManuscriptSummary, dm.resource.ResourceSummary);

dm.resource.ManuscriptSummary.prototype.decorate = function () {
    var overviewDiv = this.domHelper.createDom('div');
    this.titleDiv = this.domHelper.createDom('div',
                                             {
                                             'class': 'atb-resourcesummary-title'
                                             }, this.title);
    overviewDiv.appendChild(this.titleDiv);
    
    if (! this.styleOptions.titleOnly) {
        var pageSelectionDiv = this.domHelper.createDom('div', {'class': 'atb-ManuscriptSummary-pageSelection'});
        
        var scrollingListDiv = this.domHelper.createDom('div', {'class': 'atb-ManuscriptSummary-scrollingList'});
        
        this.renderPageNumbers(scrollingListDiv);
        
        this.jumpToInput = this.domHelper.createDom('input',
                                                    {'type': 'text', 'class': 'atb-ManuscriptSummary-jumpToInput',
                                                    'placeholder': 'Find a page'});
        
        goog.events.listen(this.jumpToInput, goog.events.EventType.KEYUP, this.handleJumpToKeyUp, false, this);
        goog.events.listen(this.jumpToInput, goog.events.EventType.CLICK, function (e) {e.stopPropagation()});
        
        pageSelectionDiv.appendChild(this.jumpToInput);
        pageSelectionDiv.appendChild(scrollingListDiv);
        
        this.div.appendChild(overviewDiv);
        this.div.appendChild(pageSelectionDiv);
    }
};

dm.resource.ManuscriptSummary.prototype.renderPageNumbers = function (div) {
    var pages = this.resource.getPages();
    
    for (var i=0, len=pages.length; i<len; i++) {
        var page = pages[i];
        
        var pageNumber = page.number;
        var pageId = page.id;
        
        var summary = this.createPageSummary(pageNumber, pageId);
        
        summary.render(div);
    }
};

dm.resource.ManuscriptSummary.prototype.createPageSummary = function (pageNumber, id) {
    var pageNumberSummary = new dm.resource.ManuscriptSummary.PageNumberSummary(id, this.clickHandler, this.viewer, this.resource, this.clientApp, this.domHelper);
    
    pageNumberSummary.setPageNumber(pageNumber);
    
    this.pageSummaries.push(pageNumberSummary);
    this.pageSummaryById.set(id, pageNumberSummary);
    
    return pageNumberSummary;
};

/**
 * @param pageNumber {string}
 */
dm.resource.ManuscriptSummary.prototype.searchForPageNumber = function (pageNumber) {
    var summaries = this.pageSummaries;
    
    for (var i=0, len=summaries.length; i<len; i++) {
        var summary = summaries[i];
        
        if (summary.pageNumberEquals(pageNumber)) {
            return summary;
        }
    }
    
    return null;
};

dm.resource.ManuscriptSummary.prototype.searchForPageNumberBeginningWith = function (pageNumber) {
    var summaries = this.pageSummaries;
    
    for (var i=0, len=summaries.length; i<len; i++) {
        var summary = summaries[i];
        
        if (summary.pageNumberBeginsWith(pageNumber)) {
            return summary;
        }
    }
    
    return null;
};

dm.resource.ManuscriptSummary.prototype.highlightPageNumberSummary = function (summary) {
    this.unhighlightPageNumberSummary();
    
    this.highlightedPageNumberSummary = summary;
    
    summary.highlight();
};

dm.resource.ManuscriptSummary.prototype.unhighlightPageNumberSummary = function () {
    if (this.highlightedPageNumberSummary) {
        this.highlightedPageNumberSummary.unhighlight();
        
        this.highlightedPageNumberSummary = null;
    }
};

dm.resource.ManuscriptSummary.prototype.handleJumpToKeyUp = function (e) {
    var key = e.keyCode;
    var value = e.target.value;
    
    if (key == goog.events.KeyCodes.ENTER || key == goog.events.KeyCodes.MAC_ENTER) {
        var matchingSummary = this.searchForPageNumber(value);
        
        if (matchingSummary) {
            jQuery(this.jumpToInput).removeClass('atb-ManuscriptSummary-jumpToInput-notFound');
            matchingSummary.callClickHandler();
        }
        else {
            jQuery(this.jumpToInput).addClass('atb-ManuscriptSummary-jumpToInput-notFound');
        }
        this.unhighlightPageNumberSummary();
    }
    else if (value.length > 0) {
        var matchingSummary = this.searchForPageNumberBeginningWith(value);
        
        if (matchingSummary) {
            jQuery(this.jumpToInput).removeClass('atb-ManuscriptSummary-jumpToInput-notFound');
            matchingSummary.scrollIntoView();
            this.highlightPageNumberSummary(matchingSummary);
        }
        else {
            this.unhighlightPageNumberSummary();
            jQuery(this.jumpToInput).addClass('atb-ManuscriptSummary-jumpToInput-notFound');
        }
    }
    else {
        jQuery(this.jumpToInput).removeClass('atb-ManuscriptSummary-jumpToInput-notFound');
        this.unhighlightPageNumberSummary();
    }
};

dm.resource.ManuscriptSummary.prototype.callClickHandler = function (opt_event, opt_params) {
    var id = this.resource.getPages()[0].id;
    
    this.clickHandler.call(this.viewer, id, this, opt_event, opt_params);
};




goog.provide('dm.resource.ManuscriptSummary.PageNumberSummary');

dm.resource.ManuscriptSummary.PageNumberSummary = function (resourceId, clickHandler, viewer, meta_data, clientApp, opt_domHelper) {
    dm.resource.ResourceSummary.call(this, resourceId, clickHandler, viewer, meta_data, clientApp, opt_domHelper);
    
    this.resourceType = 'Manuscript Page';
    
    this.pageNumber = '';
};
goog.inherits(dm.resource.ManuscriptSummary.PageNumberSummary, dm.resource.ResourceSummary);

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.setPageNumber = function (pageNumber) {
    this.pageNumber = '' + pageNumber;
    
    jQuery(this.div).text(this.pageNumber);
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.render = function (div) {
    this.div = this.domHelper.createDom('div', {'class': 'atb-PageNumberSummary'}, this.pageNumber);
    
    goog.events.listen(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);
    
    div.appendChild(this.div);
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.scrollIntoView = function () {
    if (this.div) {
        this.div.scrollIntoView();
    }
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.highlight = function () {
    jQuery(this.div).addClass('atb-PageNumberSummary-highlighted');
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.unhighlight = function () {
    jQuery(this.div).removeClass('atb-PageNumberSummary-highlighted');
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.pageNumberBeginsWith = function (partialPageNumber) {
    return this.pageNumber.toLowerCase().indexOf(partialPageNumber.toLowerCase()) == 0;
};

dm.resource.ManuscriptSummary.PageNumberSummary.prototype.pageNumberEquals = function (pageNumber) {
    return this.pageNumber.toLowerCase() == pageNumber.toLowerCase();
};