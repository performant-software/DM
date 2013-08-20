goog.provide('sc.BreadCrumbs');

/**
 * A UI representation of a history pathbar
 * 
 * @constructor
 * @param opt_doc {Object} optional document element to use
 */
sc.BreadCrumbs = function (opt_doc) {
    this.doc = opt_doc || window.document;

    this.itemsInOrder = [];
    this.arrowsInOrder = [];
    this.indexByText = {};

    this.defaultArrowSpan = this.doc.createElement('span');
    jQuery(this.defaultArrowSpan).addClass('sc-BreadCrumbs-arrow');
    jQuery(this.defaultArrowSpan).text('\u25B8');

    this.animationSpeed = 200;
};

/**
 * Decorates a given div as the widget
 */
sc.BreadCrumbs.prototype.decorate = function (div) {
    this.rootDiv = div;
    var $div = jQuery(div);

    $div.addClass('sc-BreadCrumbs');
};

/**
 * Appends the widget to a given div, or returns a rendered div
 * @param opt_div {Element} The div to append the bread crumbs to
 * @return {Element}
 */
sc.BreadCrumbs.prototype.render = function (opt_div) {
    var newDiv = this.doc.createElement('div');

    this.decorate(newDiv);

    if (opt_div)
        opt_div.appendChild(newDiv);
    
    return newDiv;
};

/**
 * Returns the base element of the bread crumbs
 * @return {Element}
 */
sc.BreadCrumbs.prototype.getElement = function () {
    return this.rootDiv;
};

/**
 * Pushes the given text onto the end of the breadcrumbs bar
 * 
 * @note Weird things will start to happen if items with the same text are
 * repeated in the nav bar
 *
 * @param text {string} The text to show in the navbar
 * @param clickHandler {Function} Code to call when the item has been clicked
 * @param opt_tooltip {!string} An optional tooltip to show on the item
 * @return {Element} The element used to represent the item
 */
sc.BreadCrumbs.prototype.push = function (text, clickHandler, opt_tooltip) {
    var span = this.doc.createElement('span');
    jQuery(span).addClass('sc-BreadCrumbs-item');
    jQuery(span).text(text);
    
    if (opt_tooltip) {
        span.title = opt_tooltip;
    }

    var $rootDiv = jQuery(this.rootDiv);

    if (this.itemsInOrder.length > 0) {
        var arrow = jQuery(this.defaultArrowSpan).clone()
        jQuery(arrow).fadeTo(0, 0.0);
        $rootDiv.append(arrow);
        jQuery(arrow).fadeTo(this.animationSpeed, 1.0);
        this.arrowsInOrder.push(arrow);
    }

    jQuery(span).fadeTo(0, 0.0);
    $rootDiv.append(span);
    jQuery(span).fadeTo(this.animationSpeed, 1.0);
    this.itemsInOrder.push(span);
    this.indexByText[jQuery(span).text()] = this.itemsInOrder.length - 1;

    var self = this;
    jQuery(span).click(function (e) {
        var index = self.indexByText[jQuery(this).text()];

        while (self.itemsInOrder.length > index && self.canPop()) {
            self.pop();
        }

        clickHandler();
    });

    this.onSizeChange();

    return span;
};

/**
 * Removes the last item from the navbar
 */
sc.BreadCrumbs.prototype.pop = function () {
    if (! this.canPop()) {
        throw "No more items to remove from breadcrumbs";
    }

    var span = this.itemsInOrder.pop();
    delete this.indexByText[jQuery(span).text()];
    jQuery(span).remove();

    var arrow = this.arrowsInOrder.pop();
    jQuery(arrow).remove();

    this.onSizeChange();
};

/**
 * Returns true if there are items to be popped off the nav bar
 */
sc.BreadCrumbs.prototype.canPop = function () {
    return this.getNumItems() > 0;
};

/**
 * Returns the number of entries in the nav bar
 */
sc.BreadCrumbs.prototype.getNumItems = function () {
    return this.itemsInOrder.length;
};

/**
 * Called each time an element is added or removed
 */
sc.BreadCrumbs.prototype.onSizeChange = function () {
    var self = this;

    for (var i = 0, len = this.itemsInOrder.length; i < len; i++) {
        var span = this.itemsInOrder[i];

        jQuery(span).removeClass('sc-BreadCrumbs-currentItem');
    }

    var lastItem = this.itemsInOrder[this.itemsInOrder.length - 1];
    jQuery(lastItem).addClass('sc-BreadCrumbs-currentItem');
    jQuery(span).fadeTo(this.animationSpeed, 1.0);
}; 