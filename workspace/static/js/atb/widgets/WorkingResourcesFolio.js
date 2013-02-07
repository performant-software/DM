goog.provide('atb.widgets.WorkingResourcesFolio');

goog.require('atb.widgets.WorkingResourcesItem');
goog.require('sc.RepoBrowserFolio');

atb.widgets.WorkingResourcesFolio = function(databroker, uri, opt_domHelper) {
    atb.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);

    jQuery(this.div).addClass('atb-WorkingResourcesFolio');
};
goog.inherits(atb.widgets.WorkingResourcesFolio,
              atb.widgets.WorkingResourcesItem);

atb.widgets.WorkingResourcesFolio.prototype.setupLayout_ = function() {
    this.scThumbnail = new sc.RepoBrowserFolio({
        'options': {
            'doc': this.domHelper.getDocument()
        }
    });

    this.scThumbnail.render(this.div);
};

atb.widgets.WorkingResourcesFolio.prototype.setTitle = function(title) {
    this.title = title;

    this.scThumbnail.setTitle(title);
};