goog.provide('atb.viewer.ItemViewer');

goog.require('goog.math.Size');
goog.require('goog.dom.dataset');
goog.require('goog.events.EventTarget');


atb.viewer.ItemViewer = function(opt_size, opt_elementId, opt_elementClass) {
    if (opt_size) {
        this.size = opt_size;
    } else {
        this.size = null;
    }
    if (opt_elementId) {
        this.setElementId(opt_elementId);
    }
    if (opt_elementClass) {
        this.setElementClass(opt_elementClass);
    } else {
        this.setElementClass('atb_viewer_itemviewer');
    }
    this.itemIdPropertyName = 'item_id';
};
goog.inherits(atb.viewer.ItemViewer, goog.events.EventTarget);


atb.viewer.ItemViewer.prototype.makeDom = function(id, item, opt_position) {
    var dom = this.makeDiv_(item);
    var propStr = "";
    for (prop in item) {
        propStr += prop + ": " + item[prop] + "\n"; 
    }
    var propertiesDom = goog.dom.createDom(
        'text',
        null,
        propStr
    );
    goog.dom.appendChild(dom, propertiesDom);
    if (opt_position) {
        goog.style.setPosition(dom, opt_position);
    }
    
    return dom;
};


/*
  @protected
 */
atb.viewer.ItemViewer.prototype.makeDiv_ = function(item) {
    var width = 'null';
    var height = 'null';
    var size = this.getSize();
    if (size) {
        width = size.width;
        height = size.height;
    }
    var thisDiv = goog.dom.createDom(
        'div',
        {'class': this.getElementClass(),
         'style': 'width: ' + width + ";" +
                  'height: ' + height + ";"},
        null
    );

    return thisDiv;
};


atb.viewer.ItemViewer.prototype.getSize = function() {
    return this.size;
};


atb.viewer.ItemViewer.prototype.isThisClass = function(element) {
    var elementClass = $(element).attr('class')
    if (elementClass) {
        if (elementClass == this.getElementClass()) {
            return true;
        }
    }

    return false;
}


atb.viewer.ItemViewer.prototype.setElementId = function(elementId) {
    this.elementId = elementId;
}


atb.viewer.ItemViewer.prototype.getElementId = function() {
    return this.elementId;
}


atb.viewer.ItemViewer.prototype.setElementClass = function(elementClass) {
    this.elementClass = elementClass;
}


atb.viewer.ItemViewer.prototype.getElementClass = function() {
    return this.elementClass;
}


atb.viewer.ItemViewer.prototype.getItemId = function(element) {
    return goog.dom.dataset.get(element, this.itemIdPropertyName);
}


atb.viewer.ItemViewer.prototype.getElementProperties = function() {
    var properties = {
        'class': this.getElementClass()
    }
    var id = this.getElementId();
    if (id) {
        properties['id'] = id;
    }
    return properties;
}


/*
  @protected
 */
atb.viewer.ItemViewer.prototype.setElementSize_ = function(dom) {
    var size = this.getSize();
    if (size) {
        goog.style.setWidth(dom, size.width);
        goog.style.setHeight(dom, size.height);
    }
}


/*
  @protected
 */
atb.viewer.ItemViewer.prototype.setElementPosition_ = function(
    dom,
    opt_position
) {
    if (opt_position) {
        goog.style.setStyle(dom, 'position', 'absolute');
        goog.style.setPosition(dom, opt_position);
    }
}


