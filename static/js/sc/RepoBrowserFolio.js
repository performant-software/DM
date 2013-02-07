goog.provide('sc.RepoBrowserFolio');

goog.require('sc.RepoBrowserItem');

/**
 * UI for displaying a thumbnail item in a sc.RepoBrowser
 * @extends {sc.RepoBrowserItem}
 * @constructor
 * @param repoBrowser {sc.RepoBrowser}
 */
sc.RepoBrowserFolio = function (repoBrowser) {
    sc.RepoBrowserItem.call(this, repoBrowser);
    
    this.innerDiv = this.doc.createElement('div');
    jQuery(this.innerDiv).addClass('sc-RepoBrowserFolio-inner');
};
sc.RepoBrowserFolio.prototype = jQuery.extend(true, sc.RepoBrowserFolio.prototype, sc.RepoBrowserItem.prototype);

/**
 * @override
 */
sc.RepoBrowserFolio.prototype.decorate = function (div) {
    this.rootDiv = div;
    var $div = jQuery(div);
    
    $div.empty();
    $div.addClass('sc-RepoBrowserItem');
    $div.addClass('sc-RepoBrowserFolio');
    
    jQuery(this.innerDiv).append(this.addButtonDiv, this.titleDiv);
    
    $div.append(this.innerDiv);
};