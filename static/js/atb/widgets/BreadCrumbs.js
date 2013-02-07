goog.provide('atb.widgets.BreadCrumbs');

goog.require('goog.dom.DomHelper');
goog.require('goog.structs.Map');
goog.require('goog.array');
goog.require('jquery.jQuery');

/**
 * A UI representation of a history pathbar
 * 
 * @constructor
 * @param opt_domHelper {!goog.dom.DomHelper}
 */
atb.widgets.BreadCrumbs = function (opt_domHelper) {
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.itemsInOrder = [];
    this.arrowsInOrder = [];
    this.indexByText = new goog.structs.Map();

    this.defaultArrowSpan = this.domHelper.createDom('span', {
        'class': 'atb-BreadCrumbs-arrow'
    }, '\u25B8');

    this.animationSpeed = 200;
};

/**
 * Decorates a given div as the widget
 */
atb.widgets.BreadCrumbs.prototype.decorate = function (div) {
    this.rootDiv = div;
    var $div = jQuery(div);

    $div.addClass('atb-BreadCrumbs');
};

/**
 * Appends the widget to a given div
 */
atb.widgets.BreadCrumbs.prototype.render = function (div) {
    var newDiv = this.domHelper.createDom('div');

    this.decorate(newDiv);

    div.appendChild(newDiv);
};

/**
 * Pushes the given text onto the end of the breadcrumbs bar
 *
 * @param text {string} The text to show in the navbar
 * @param clickHandler {Function} Code to call when the item has been clicked
 * @param opt_tooltip {!string} An optional tooltip to show on the item
 * @return {Element} The element used to represent the item
 */
atb.widgets.BreadCrumbs.prototype.push = function (text, clickHandler, opt_tooltip) {
    var span = this.domHelper.createDom('span', {
        'class': 'atb-BreadCrumbs-item'
    }, text);
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
    this.indexByText.set(jQuery(span).text(), this.itemsInOrder.length - 1);

    var self = this;
    jQuery(span).click(function (e) {
        var index = self.indexByText.get(jQuery(this).text());

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
atb.widgets.BreadCrumbs.prototype.pop = function () {
    if (! this.canPop()) {
        throw "No more items to remove from breadcrumbs";
    }

    var span = this.itemsInOrder.pop();
    this.indexByText.remove(jQuery(span).text());
    jQuery(span).remove();

    var arrow = this.arrowsInOrder.pop();
    jQuery(arrow).remove();

    this.onSizeChange();
};

/**
 * Returns true if there are items to be popped off the nav bar
 */
atb.widgets.BreadCrumbs.prototype.canPop = function () {
    return this.getNumItems() > 0;
};

/**
 * Returns the number of entries in the nav bar
 */
atb.widgets.BreadCrumbs.prototype.getNumItems = function () {
    return this.itemsInOrder.length;
};

/**
 * Called each time an element is added or removed
 */
atb.widgets.BreadCrumbs.prototype.onSizeChange = function () {
    var self = this;

    for (var i = 0, len = this.itemsInOrder.length; i < len; i++) {
        var span = this.itemsInOrder[i];

        //        jQuery(span).css({'max-width': (100/self.itemsInOrder.length) + '%'});
        jQuery(span).removeClass('atb-BreadCrumbs-currentItem');
        //        jQuery(span).fadeTo(this.animationSpeed, 0.9);
    }

    var lastItem = this.itemsInOrder[this.itemsInOrder.length - 1];
    jQuery(lastItem).addClass('atb-BreadCrumbs-currentItem');
    jQuery(span).fadeTo(this.animationSpeed, 1.0);
}; 