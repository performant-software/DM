goog.provide('atb.ui.Container');

goog.require('goog.ui.Container');


atb.ui.Container = function() {
    this.container = new goog.ui.Container(
        goog.ui.Container.Orientation.VERTICAL
//        goog.ui.Container.Orientation.HORIZONTAL
    );
}


atb.ui.Container.prototype.addChild = function(itemDom) {
    var itemControl = new goog.ui.Control(itemDom)
//    itemControl.addClassName('goog-inline-block');
    this.container.addChild(itemControl, true);
}


atb.ui.Container.prototype.addToDom = function(parent) {
    this.container.render();
}


