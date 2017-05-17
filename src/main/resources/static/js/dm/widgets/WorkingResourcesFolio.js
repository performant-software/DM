goog.provide('dm.widgets.WorkingResourcesFolio');

goog.require('dm.widgets.WorkingResourcesItem');
goog.require('dm.RepoBrowserFolio');

dm.widgets.WorkingResourcesFolio = function(databroker, uri, opt_domHelper) {
    dm.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);

    jQuery(this.div).addClass('atb-WorkingResourcesFolio');
};
goog.inherits(dm.widgets.WorkingResourcesFolio,
              dm.widgets.WorkingResourcesItem);

dm.widgets.WorkingResourcesFolio.prototype.setupLayout_ = function() {
    this.scThumbnail = new dm.RepoBrowserFolio({
        'options': {
            'doc': this.domHelper.getDocument()
        }
    });

    this.scThumbnail.render(this.div);
};

dm.widgets.WorkingResourcesFolio.prototype.setTitle = function(title) {
    this.title = title;

    this.scThumbnail.setTitle(title);
};