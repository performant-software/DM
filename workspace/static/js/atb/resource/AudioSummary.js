goog.provide('atb.resource.AudioSummary');

goog.require('atb.resource.ResourceSummary');

atb.resource.AudioSummary = function(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    atb.resource.ResourceSummary.call(this, uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);

    if (this.resource.hasType('dms:AudioSegment')) {
        this.parentResource = this.databroker.getResource(this.resource.getOneProperty('dcterms:isPartOf'));
    }

    this.audioAttrs = sc.data.Databroker.getConstraintAttrsFromUri(this.resource.uri);

    this.title = this.findTitle();

    this.setTooltip('Open this audio file');

    this.decorate();
};
goog.inherits(atb.resource.AudioSummary, atb.resource.ResourceSummary);

atb.resource.AudioSummary.prototype.type = 'Audio';

atb.resource.AudioSummary.prototype.findTitle = function() {
    var title = null;

    if (this.parentResource) {
        if (this.parentResource.hasPredicate('dc:title')) {
            title = this.parentResource.getOneProperty('dc:title');
        }
        else {
            title = atb.resource.AudioSummary.findTitleFromUri(this.parentResource.uri);
        }

        if (this.audioAttrs) {
            title += ': ' + this.audioAttrs.startTimecode + '-' + this.audioAttrs.endTimecode;
        }
    }
    else {
        if (this.resource.hasPredicate('dc:title')) {
            title = this.resource.getOneProperty('dc:title');
        }
        else {
            title = atb.resource.AudioSummary.findTitleFromUri(this.resource.uri);
        }
    }

    return title;
};

atb.resource.AudioSummary.findTitleFromUri = function(uri) {
    var title = null;

    var indexOfSlash = uri.lastIndexOf('/');
    if (indexOfSlash != -1) {
        title = uri.substring(indexOfSlash + 1, uri.length);
    }
    else {
        title = uri;
    }

    return title;
};

atb.resource.AudioSummary.prototype.decorate = function() {
    jQuery(this.outerDiv).addClass('atb-audiosummary');

    this.titleDiv = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-resourcesummary-title'
        }
    );
    jQuery(this.titleDiv).text(this.title);
    this.div.appendChild(this.titleDiv);
};