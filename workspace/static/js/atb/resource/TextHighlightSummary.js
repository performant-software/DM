goog.provide('atb.resource.TextHighlightSummary');

goog.require('atb.resource.ResourceSummary');

/**
 * atb.resource.TextHighlightSummary
 *
 * Displays an overview of a text based Resource
 * 
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends atb.resource.ResourceSummary
 * @param resourceId {string} id of resource to be summarized
 * @param clickHandler {function}
 * @param clickHandlerScope {object}
 * @param resource {atb.resource.TextHighlightResource}
 * @param div {HTML Element}
 */
atb.resource.TextHighlightSummary = function (uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);

    this.highlightResource = this.databroker.getResource(this.resource.getOneProperty('oa:hasSelector'));
    this.parentResource = this.databroker.getResource(this.resource.getOneProperty('oa:hasSource'));
    
    this.decorate();
};
goog.inherits(atb.resource.TextHighlightSummary, atb.resource.ResourceSummary);

atb.resource.TextHighlightSummary.prototype.type = 'Highlight';

/**
 * decorate()
 *
 * Adds the necessary dom elements to this.div for the short version of the text,
 * including text expansion controls
 */
atb.resource.TextHighlightSummary.prototype.decorate = function (opt_label) {
    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-resourcesummary-title atb-texthighlightsummary-title'
        }
    )

    /*
    jQuery(this.titleDiv).text(this.title);
    jQuery(this.div).prepend(this.titleDiv);
    */
   
    var exactText = this.highlightResource.getOneProperty('oa:exact');

    var cutoff = this.determineCutoff(exactText, 45);
    var truncHtml = exactText.substring(0, cutoff);
    if (cutoff != exactText.length) {
        truncHtml += '...';
    }

    if (! opt_label) {
        opt_label = "";
    } else {
        opt_label = opt_label + " ";
    }

    if (exactText == 'Previous' || exactText == 'Next') {
        this.textBody = this.domHelper.createElement('div');
        var textTitleText = this.domHelper.createTextNode(this.databroker.dataModel.getTitle(this.parentResource));
        jQuery(this.textBody).append(textTitleText);
        jQuery(this.div).append(this.textBody);
    }
    else {
        this.textBody = this.domHelper.createElement('div');
        jQuery(this.textBody).html(opt_label);
        this.textBodySpan = this.domHelper.createElement('span');
        jQuery(this.textBodySpan).addClass('atb-resourcesummary-textbody');
        this.textBody.appendChild(this.textBodySpan);
        jQuery(this.textBodySpan).html(truncHtml)
        var textTitleText = this.domHelper.createTextNode(" in " + this.databroker.dataModel.getTitle(this.parentResource));
        jQuery(this.textBody).append(textTitleText);
        jQuery(this.div).append(this.textBody);
    }
	
    // jQuery(this.div).append('<div class="atb-resourcesummary-user">added by ' + this.user + '</div>');
};

atb.resource.TextHighlightSummary.prototype.determineCutoff = function (text, limit) {
    if (text.length <= limit) {
        return text.length;
    }
	
    var exactCutoff = text.substr(0, limit);
    var indexOfLastWord = exactCutoff.lastIndexOf(' ');
	
    if(limit - indexOfLastWord < 20) {
        return indexOfLastWord;
    }
    else {
        return limit;
    }
};

atb.resource.TextHighlightSummary.prototype.generateTitle = function () {
    var result = '';

    var exactText = this.highlightResource.getOneProperty('oa:exact');
    
    var cutoff = this.determineCutoff(exactText, 45);
    
    result += '"' + exactText.substring(0, cutoff);
    
    if (cutoff != exactText.length)
        result += '...';
    
    result += '" in ' + this.databroker.dataModel.getTitle(this.parentResource);
    
    return result;
};

atb.resource.TextHighlightSummary.prototype.getSortTitle = function() {
    return this.highlightResource.getOneProperty('oa:exact') + this.databroker.dataModel.getTitle(this.parentResource);
};