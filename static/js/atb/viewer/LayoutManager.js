goog.provide('atb.viewer.LayoutManager');

goog.require('atb.viewer.ItemViewer');
goog.require('goog.math.Size');
goog.require('goog.dom.DomHelper');
goog.require('goog.ui.IdGenerator');
goog.require('goog.style');


atb.viewer.LayoutManager = function(elementId, opt_size, opt_padding) {
    this.elementId = elementId;
    this.size = null;
    if (opt_size) {
        this.size = opt_size;
    }
    this.padding = 0;
    if (opt_padding) {
        this.padding = opt_padding;
    }

    this.element = document.getElementById(elementId);
    this.numItems = 0;
    this.positions = [];
    this.uids = [];
}


atb.viewer.LayoutManager.prototype.setSize = function(size) {
    this.size = size;
    goog.style.setSize(element);
}


atb.viewer.LayoutManager.prototype.addItem = function(
    id, 
    item, 
    itemViewer,
    opt_floating
) {
    if (! this.size) {
        throw "Size must be set before adding item.";
    }
    this.numItems++;
    this.uids[id] = goog.ui.IdGenerator.instance.getNextUniqueId();
    this.positions[id] = null;
    var itemDom = this.itemViewer.makeDom(id, item);
    this.element.appendChild(itemDom);
    return itemDom;
}


atb.viewer.LayoutManager.prototype.deleteItem = function(id) {
    var element = this.getItemElement(id);
    if (element) {
        // How do I delete an entry from the assoc arrays?
        goog.dom.DomHelper.removeNode(element);
    }
}


atb.viewer.LayoutManager.prototype.getItemPosition = function(id) {
    return this.positions[id];
}


atb.viewer.LayoutManager.prototype.getItemElement = function(id) {
    //TODO: How do I check to ensure that the id exists?
    if (id in this.uids) {
        var uid = this.uids[id];
        var element = document.getElementById(uid);
        return element;
    } else {
        return null;
    }
}


atb.viewer.LayoutManager.prototype.getElement = function() {
    return this.element;
}


