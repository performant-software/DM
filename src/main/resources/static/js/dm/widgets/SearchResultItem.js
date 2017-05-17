goog.provide('dm.widgets.SearchResultItem');

goog.require('dm.widgets.WorkingResourcesItem');

dm.widgets.SearchResultItem = function(databroker, uri, opt_domHelper) {
    dm.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);
};
goog.inherits(dm.widgets.SearchResultItem, dm.widgets.WorkingResourcesItem);

dm.widgets.SearchResultItem.prototype.setupLayout_ = function() {
    jQuery(this.div).addClass('sc-SearchResultItem');

    this.thumbnailDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-thumb'
    }, this.domHelper.createDom('div', null, 'T'));
    this.titleDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-title'
    });
    this.matchDiv = this.domHelper.createDom('div', {
        'class': 'sc-SearchResultItem-match'
    });
    this.attributesDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-attributes'
    });

    // this.removeButton = this.domHelper.createDom('div', {
    //     'class': 'atb-WorkingResourcesItem-remove icon-minus-sign',
    //     'title': 'Remove this resource from the project'
    // });
    // jQuery(this.removeButton).hide();
    // goog.events.listen(this.removeButton, 'click', this.handleRemoveClick, false, this);

    this.clearDiv = this.domHelper.createDom('div', {
        'style': 'clear: both;'
    });

    this.div.appendChild(this.thumbnailDiv);
    this.div.appendChild(this.titleDiv);
    this.div.appendChild(this.attributesDiv);
    this.div.appendChild(this.matchDiv);
    // this.div.appendChild(this.removeButton);

    this.div.appendChild(this.clearDiv);
};

dm.widgets.SearchResultItem.prototype.setImage = function(image, imageWidth, imageHeight) {
    if (image) {
        var size = new goog.math.Size(imageWidth, imageHeight).scaleToFit(dm.widgets.WorkingResources.THUMB_SIZE),
            width = Math.round(size.width),
            height = Math.round(size.height);

        jQuery("<img>").appendTo(jQuery(this.thumbnailDiv).empty()).attr({
            src: image + '?w=' + width + '&h=' + height,
            width: width,
            height: height
        });
    }
};

dm.widgets.SearchResultItem.prototype.setText = function(text) {
    jQuery(this.matchDiv).html(text);
};

dm.widgets.SearchResultItem.prototype.setHighlightedTitle = function(title) {
    jQuery(this.titleDiv).html(title);
};
