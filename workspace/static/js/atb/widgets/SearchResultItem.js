goog.provide('atb.widgets.SearchResultItem');

goog.require('atb.widgets.WorkingResourcesItem');

atb.widgets.SearchResultItem = function(databroker, uri, opt_domHelper) {
    atb.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);
};
goog.inherits(atb.widgets.SearchResultItem, atb.widgets.WorkingResourcesItem);

atb.widgets.SearchResultItem.prototype.setupLayout_ = function() {
    jQuery(this.div).addClass('sc-SearchResultItem');

    this.thumbnailDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-thumb'
    }, 'T');
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

atb.widgets.SearchResultItem.prototype.setText = function(text) {
    jQuery(this.matchDiv).html(text);
};

atb.widgets.SearchResultItem.prototype.setHighlightedTitle = function(title) {
    jQuery(this.titleDiv).html(title);
};