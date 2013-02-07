goog.provide('atb.viewer.TiledLayoutManager');

goog.require('atb.viewer.LayoutManager');
goog.require('goog.style');


atb.viewer.TiledLayoutManager = function(elementId, opt_size, opt_padding) {
    atb.viewer.LayoutManager.call(this, elementId, opt_size, opt_padding);
    this.x = 0;
    this.y = 0;
}
goog.inherits(atb.viewer.TiledLayoutManager, atb.viewer.LayoutManager);


atb.viewer.TiledLayoutManager.prototype.addItem = function(
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
        if (this.numItems != 0) {
            if ((this.x + itemSize.width) > this.size.width) {
                this.x = 0;
                this.y = this.y + itemSize.height + this.padding;
            }
        }
        this.numItems++;
        var position = new goog.math.Coordinate(this.x, this.y);
        this.x += itemSize.width + this.padding;
    } else {
        //console.log("not floating");
        position = null;
    }
    var itemDom = itemViewer.makeDom(id, item, position);
    this.element.appendChild(itemDom);
    this.positions[id] = position;
    this.uids[id] = goog.ui.IdGenerator.instance.getNextUniqueId();

    return itemDom;
}



