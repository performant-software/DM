goog.provide('dm.resource.AudioSummary');

goog.require('dm.resource.ResourceSummary');

dm.resource.AudioSummary = function(uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    dm.resource.ResourceSummary.call(this, uri, viewer, clientApp, opt_domHelper, opt_styleOptions);

    if (this.resource.hasType('dms:AudioSegment')) {
        this.parentResource = this.databroker.getResource(this.resource.getOneProperty('dcterms:isPartOf'));
    }

    this.audioAttrs = dm.data.DataModel.getConstraintAttrsFromUri(this.resource.uri);

    this.title = this.findTitle();

    this.setTooltip('Open this audio file');

    this.decorate();
};
goog.inherits(dm.resource.AudioSummary, dm.resource.ResourceSummary);

dm.resource.AudioSummary.prototype.type = 'Audio';

dm.resource.AudioSummary.prototype.findTitle = function() {
    var title = null;
    var getTitle = this.databroker.dataModel.getTitle;

    if (this.parentResource) {
        if (!(title = getTitle(this.parentResource))) {
            title = dm.resource.AudioSummary.findTitleFromUri(this.parentResource.uri);
        }

        if (this.audioAttrs) {
            title += ': ' + this.audioAttrs.startTimecode + '-' + this.audioAttrs.endTimecode;
        }
    }
    else {
        if (!(title = getTitle(this.resource))) {
            title = dm.resource.AudioSummary.findTitleFromUri(this.resource.uri);
        }
    }

    return title;
};

dm.resource.AudioSummary.findTitleFromUri = function(uri) {
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

dm.resource.AudioSummary.prototype.decorate = function() {
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