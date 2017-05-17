goog.provide('dm.RepoBrowserFolio');

goog.require('dm.RepoBrowserItem');

/**
 * UI for displaying a thumbnail item in a dm.RepoBrowser
 * @extends {dm.RepoBrowserItem}
 * @constructor
 * @param repoBrowser {dm.RepoBrowser}
 */
dm.RepoBrowserFolio = function (repoBrowser) {
    dm.RepoBrowserItem.call(this, repoBrowser);
    
    this.innerDiv = this.doc.createElement('div');
    jQuery(this.innerDiv).addClass('sc-RepoBrowserFolio-inner');
};
dm.RepoBrowserFolio.prototype = jQuery.extend(true, dm.RepoBrowserFolio.prototype, dm.RepoBrowserItem.prototype);

/**
 * @override
 */
dm.RepoBrowserFolio.prototype.decorate = function (div) {
    this.rootDiv = div;
    var $div = jQuery(div);
    
    $div.empty();
    $div.addClass('sc-RepoBrowserItem');
    $div.addClass('sc-RepoBrowserFolio');
    
    jQuery(this.innerDiv).append(this.addButtonDiv, this.titleDiv);
    
    $div.append(this.innerDiv);
};