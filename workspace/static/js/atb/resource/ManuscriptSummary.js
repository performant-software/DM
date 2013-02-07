goog.provide('atb.resource.ManuscriptSummary');

goog.require('atb.resource.ResourceSummary');

goog.require('goog.structs.Map');

atb.resource.ManuscriptSummary = function (resourceId, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, resourceId, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    
    this.resourceType = 'Manuscript';
    
    this.title = '' + resource.getTitle();
    
    this.pageSummaries = [];
    this.pageSummaryById = new goog.structs.Map();
    
    this.decorate();
};
goog.inherits(atb.resource.ManuscriptSummary, atb.resource.ResourceSummary);

atb.resource.ManuscriptSummary.prototype.decorate = function () {
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

atb.resource.ManuscriptSummary.prototype.renderPageNumbers = function (div) {
    var pages = this.resource.getPages();
    
    for (var i=0, len=pages.length; i<len; i++) {
        var page = pages[i];
        
        var pageNumber = page.number;
        var pageId = page.id;
        
        var summary = this.createPageSummary(pageNumber, pageId);
        
        summary.render(div);
    }
};

atb.resource.ManuscriptSummary.prototype.createPageSummary = function (pageNumber, id) {
    var pageNumberSummary = new atb.resource.ManuscriptSummary.PageNumberSummary(id, this.clickHandler, this.viewer, this.resource, this.clientApp, this.domHelper);
    
    pageNumberSummary.setPageNumber(pageNumber);
    
    this.pageSummaries.push(pageNumberSummary);
    this.pageSummaryById.set(id, pageNumberSummary);
    
    return pageNumberSummary;
};

/**
 * @param pageNumber {string}
 */
atb.resource.ManuscriptSummary.prototype.searchForPageNumber = function (pageNumber) {
    var summaries = this.pageSummaries;
    
    for (var i=0, len=summaries.length; i<len; i++) {
        var summary = summaries[i];
        
        if (summary.pageNumberEquals(pageNumber)) {
            return summary;
        }
    }
    
    return null;
};

atb.resource.ManuscriptSummary.prototype.searchForPageNumberBeginningWith = function (pageNumber) {
    var summaries = this.pageSummaries;
    
    for (var i=0, len=summaries.length; i<len; i++) {
        var summary = summaries[i];
        
        if (summary.pageNumberBeginsWith(pageNumber)) {
            return summary;
        }
    }
    
    return null;
};

atb.resource.ManuscriptSummary.prototype.highlightPageNumberSummary = function (summary) {
    this.unhighlightPageNumberSummary();
    
    this.highlightedPageNumberSummary = summary;
    
    summary.highlight();
};

atb.resource.ManuscriptSummary.prototype.unhighlightPageNumberSummary = function () {
    if (this.highlightedPageNumberSummary) {
        this.highlightedPageNumberSummary.unhighlight();
        
        this.highlightedPageNumberSummary = null;
    }
};

atb.resource.ManuscriptSummary.prototype.handleJumpToKeyUp = function (e) {
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

atb.resource.ManuscriptSummary.prototype.callClickHandler = function (opt_event, opt_params) {
    var id = this.resource.getPages()[0].id;
    
    this.clickHandler.call(this.viewer, id, this, opt_event, opt_params);
};




goog.provide('atb.resource.ManuscriptSummary.PageNumberSummary');

atb.resource.ManuscriptSummary.PageNumberSummary = function (resourceId, clickHandler, viewer, meta_data, clientApp, opt_domHelper) {
    atb.resource.ResourceSummary.call(this, resourceId, clickHandler, viewer, meta_data, clientApp, opt_domHelper);
    
    this.resourceType = 'Manuscript Page';
    
    this.pageNumber = '';
};
goog.inherits(atb.resource.ManuscriptSummary.PageNumberSummary, atb.resource.ResourceSummary);

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.setPageNumber = function (pageNumber) {
    this.pageNumber = '' + pageNumber;
    
    jQuery(this.div).text(this.pageNumber);
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.render = function (div) {
    this.div = this.domHelper.createDom('div', {'class': 'atb-PageNumberSummary'}, this.pageNumber);
    
    goog.events.listen(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);
    
    div.appendChild(this.div);
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.scrollIntoView = function () {
    if (this.div) {
        this.div.scrollIntoView();
    }
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.highlight = function () {
    jQuery(this.div).addClass('atb-PageNumberSummary-highlighted');
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.unhighlight = function () {
    jQuery(this.div).removeClass('atb-PageNumberSummary-highlighted');
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.pageNumberBeginsWith = function (partialPageNumber) {
    return this.pageNumber.toLowerCase().indexOf(partialPageNumber.toLowerCase()) == 0;
};

atb.resource.ManuscriptSummary.PageNumberSummary.prototype.pageNumberEquals = function (pageNumber) {
    return this.pageNumber.toLowerCase() == pageNumber.toLowerCase();
};