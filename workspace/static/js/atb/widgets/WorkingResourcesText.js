goog.provide('atb.widgets.WorkingResourcesText');

goog.require('atb.widgets.WorkingResourcesItem');

atb.widgets.WorkingResourcesText = function(databroker, uri, opt_domHelper) {
    atb.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);
};
goog.inherits(atb.widgets.WorkingResourcesText, atb.widgets.WorkingResourcesItem);

atb.widgets.WorkingResourcesText.prototype.setupLayout_ = function() {
    jQuery(this.div).addClass('atb-WorkingResourcesText');

    this.thumbnailDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-thumb'
    }, 'T');
    this.titleDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-title'
    });
    this.attributesDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-attributes'
    });

    this.clearDiv = this.domHelper.createDom('div', {
        'style': 'clear: both;'
    });

    this.div.appendChild(this.thumbnailDiv);
    this.div.appendChild(this.titleDiv);
    this.div.appendChild(this.attributesDiv);

    this.div.appendChild(this.clearDiv);
};