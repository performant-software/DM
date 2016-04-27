goog.provide('atb.resource.TextSummary');

goog.require('atb.resource.ResourceSummary');

/**
 * atb.resource.TextSummary
 *
 * Displays an overview of a text based Resource
 * 
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends atb.resource.ResourceSummary
 */
atb.resource.TextSummary = function (uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
	
    this.text = this.resource.getOneProperty('cnt:chars') || 'no contents';
    this.title = this.databroker.dataModel.getTitle(this.resource) || 'Untitled text';
    this.user = '';
    
    this.cutoff = this.determineCutoff_(atb.resource.TextSummary.MAX_SUMMARY_LENGTH);
    this.textContinues = this.cutoff < this.text.length;

    this.longCutoff = this.determineCutoff_(atb.resource.TextSummary.MAX_LONG_LENGTH);
	
    this.decorate();
};
goog.inherits(atb.resource.TextSummary, atb.resource.ResourceSummary);

atb.resource.TextSummary.prototype.type = 'Text';


atb.resource.TextSummary.MAX_SUMMARY_LENGTH = 200;
atb.resource.TextSummary.MAX_LONG_LENGTH = 200;


atb.resource.TextSummary.prototype.determineCutoff_ = function (limit) {
    if (this.text.length <= limit) {
        return this.text.length;
    }
	
    var exactCutoff = this.text.substr(0, limit);
    var indexOfLastWord = exactCutoff.lastIndexOf(' ');
	
    if(limit - indexOfLastWord < 20) {
        return indexOfLastWord;
    }
    else {
        return limit;
    }
};


atb.resource.TextSummary.prototype.getShortText = function () {
    var result = this.text.substring(0, this.cutoff);
	
    return result;
};


atb.resource.TextSummary.prototype.getRestOfText = function () {
    if (!this.textContinues) {
        return '';
    }
	
    return '\u2026' + this.text.substr(this.cutoff, this.text.length);
};

atb.resource.TextSummary.prototype.getLongText = function () {
    var result = this.text.substring(0, this.longCutoff);

    return result;
};

/**
 * decorate()
 *
 * Adds the necessary dom elements to this.div for the short version of the text,
 * including text expansion controls
 */
atb.resource.TextSummary.prototype.decorate = function (opt_titleOnly, opt_label) {
    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-resourcesummary-title'
        }
    )
    if (! opt_label) {
        opt_label = "";
    }
    jQuery(this.titleDiv).html(opt_label + " " + this.title);
//    jQuery(this.outerDiv).prepend(this.titleDiv);
    jQuery(this.div).append(this.titleDiv);

    if (! this.styleOptions.titleOnly) {
        this.textBody = this.domHelper.createElement('div', {'class':'atb-resourcesummary-textbody'}, null);
	    jQuery(this.textBody).html(this.getLongText());
        jQuery(this.div).append(this.textBody);
//        this.textBody = this.domHelper.createElement('div', {'class':'atb-resourcesummary-textbody'}, null);
//        this.decorateWithShortText();
    }
};

/**
 * decorateWithLongText()
 *
 * Adds the necessary dom elements to this.div for the complete version of the text,
 * including text expansion controls
 */
atb.resource.TextSummary.prototype.decorateWithLongText = function () {
    if (!this.textBody) {
        this.decorate();
    }

    jQuery(this.textBody).html(this.getLongText());

    var showLess = this.domHelper.createDom('span', {
        'class': 'atb-annotationviewer-text-show-more'
    }, ' <<');

    goog.events.listen(showLess, goog.events.EventType.CLICK, this.handleClickShowLess, false, this);

    jQuery(this.textBody).append(showLess);
};

atb.resource.TextSummary.prototype.decorateWithShortText = function () {
	if (!this.textBody) {
        this.decorate();
    }
	
	jQuery(this.textBody).html(this.getShortText());
    jQuery(this.div).append(this.textBody);

    if(this.textContinues) {
        var showMore = this.domHelper.createDom('span', {
            'class': 'atb-annotationviewer-text-show-more'
        }, '\u2026 >>');
        goog.events.listen(showMore, goog.events.EventType.CLICK, this.handleClickShowMore, false, this);

        this.textBody.appendChild(showMore);
    }
};

atb.resource.TextSummary.prototype.stripHtmlTags = function (html) {
//	html = html.replace(/(<style>.*?<\/style>)/ig, "")
//	html = html.replace(/(<.*?>)/ig,"");
	return html;
};

atb.resource.TextSummary.prototype.handleClickShowMore = function (e) {
    if (!e) {
        e = window.event;
    }
    e.cancelBubble = true;
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.decorateWithLongText();
};

atb.resource.TextSummary.prototype.handleClickShowLess = function (e) {
    if (!e) {
        e = window.event;
    }
    e.cancelBubble = true;
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.decorateWithShortText();
};