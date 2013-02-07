goog.provide('atb.viewer.HorizontalLayoutManager');

goog.require('atb.viewer.LayoutManager');
goog.require('goog.style');


atb.viewer.HorizontalLayoutManager = function(
    elementId, 
    opt_size, 
    opt_padding
) {
    atb.viewer.LayoutManager.call(this, elementId, opt_size, opt_padding);
}
goog.inherits(atb.viewer.HorizontalLayoutManager, atb.viewer.LayoutManager);


atb.viewer.HorizontalLayoutManager.prototype.addItem = function(
    id, 
    item,
    itemViewer,
    opt_floating
) {
    if (! this.size) {
        throw "Size must be set before adding item.";
    }
    if (! opt_floating) {
        var itemSize = itemViewer.getSize();
        var x = this.numItems * (itemSize.width + this.padding); 
        var position = new goog.math.Coordinate(x, 0); // y always 0
        this.numItems++;
    } else {
        position = null;
    }
    var itemDom = itemViewer.makeDom(id, item, position);
    this.element.appendChild(itemDom);
    this.positions[id] = position;
    this.uids[id] = goog.ui.IdGenerator.instance.getNextUniqueId();
    return itemDom;
}


