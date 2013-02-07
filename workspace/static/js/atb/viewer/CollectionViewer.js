goog.provide('atb.viewer.CollectionViewer');

goog.require('goog.ui.HoverCard');
goog.require('goog.dom.dataset');


atb.viewer.CollectionViewer = function(
    opt_layoutManager, 
    opt_itemViewer, 
    opt_itemHoverViewer,
    opt_clickHandler
) {
    this.items = [];
    this.hoverCard = null;
    this.layoutManager = null;
    this.itemViewer = null;
    this.itemHoverViewer = null;
    if (opt_layoutManager) {
        this.layoutManager = opt_layoutManager;
    }
    if (opt_itemViewer) {
        this.itemViewer = opt_itemViewer;
    }
    if (opt_itemHoverViewer) {
        this.setItemHoverViewer(opt_itemHoverViewer);
    }
    if (opt_clickHandler) {
        this.clickHandler = opt_clickHandler;
    }
};


atb.viewer.CollectionViewer.prototype.addItem = function(id, item) {
    if (! this.layoutManager) {
        throw "Layout manager must be set before adding item.";
    }
    if (! this.itemViewer) {
        throw "Item viewer must be set before adding item.";
    }
    this.items[id] = item;
    var itemDom = this.layoutManager.addItem(
        id, 
        this.items[id], 
        this.itemViewer
    );
    if (this.clickHandler) {
        goog.events.listen(
            itemDom,
            goog.events.EventType.CLICK,
            function(event) {
                this.clickHandler(id, this.items[id]);
            },
            false, 
            this
        );
    }
};


atb.viewer.CollectionViewer.prototype.setLayoutManager = function(
    layoutManager
) {
    this.layoutManager = layoutManager;
    if (this.itemViewer) {
        this.addAllItemsToLayout_();
    }
};


atb.viewer.CollectionViewer.prototype.setItemViewer = function(itemViewer) {
    this.itemViewer = itemViewer;
    if (this.layoutManager) {
        this.addAllItemsToLayout_();
    }
    if (this.itemHoverViewer) {
        this.initHoverCard_();
    }
};


atb.viewer.CollectionViewer.prototype.setItemHoverViewer = function(
    itemHoverViewer
) {
    this.itemHoverViewer = itemHoverViewer;
    if (this.itemViewer) {
         this.initHoverCard_();
    }
}


/*
  @private
 */
atb.viewer.CollectionViewer.prototype.initHoverCard_ = function() {
    var itemViewer = this.itemViewer;
    this.hoverCard = new goog.ui.HoverCard(
        function(element) {
            return itemViewer.isThisClass(element);
        }
    );
    
    this.hoverCard.className = this.itemHoverViewer.getElementClass();

    goog.events.listen(
        this.hoverCard, 
        goog.ui.HoverCard.EventType.TRIGGER,
        this.hoverTrigger_,
        false,
        this
    );

   goog.events.listen(
        this.hoverCard, 
        goog.ui.HoverCard.EventType.BEFORE_SHOW,
        this.hoverBeforeShow_,
        false,
        this
    );


};


/*
  @private
 */
atb.viewer.CollectionViewer.prototype.hoverTrigger_ = function(event) {
    var element = event.anchor;
    var pos = new goog.positioning.AnchoredPosition(
        element,
        goog.positioning.Corner.TOP_LEFT
    );
    this.hoverCard.setPosition(pos);

    return true;
}


atb.viewer.CollectionViewer.prototype.hoverBeforeShow_ = function(event) {
    //TODO: add element here
    hoverElement = this.hoverCard.getElement();
    hoverElement.innerHTML = "";
    var element = this.hoverCard.getAnchorElement();
    var itemId = this.itemViewer.getItemId(element);
    contents = this.itemHoverViewer.makeDom(itemId, this.items[itemId]);
    hoverElement.appendChild(contents);
    if (this.clickHandler) {
        goog.events.listen(
            contents,
            goog.events.EventType.CLICK,
            function(event) {
                this.clickHandler(itemId, this.items[itemId]);
            },
            false, 
            this
        );
    }

    return true;
}


atb.viewer.CollectionViewer.prototype.addAllItemsToLayout_ = function() {
    for (var id in this.items) {
        this.layoutManager.addItem(id, this.items[id], this.itemViewer);
    }
};




