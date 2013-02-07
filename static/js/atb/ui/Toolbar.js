goog.provide('atb.ui.Toolbar');
goog.provide('atb.ui.Toolbar.Orientation');

goog.require('goog.ui.Toolbar');
goog.require('goog.dom');
goog.require('jquery.jQuery');


/**
 * A Toolbar class, implemented as a wrapper of google closure's goog.ui.Toolbar
 * @note To access the goog.ui.Toolbar object, call this.googToolbar
 * @param {String=} divId the ID of the div in which the toolbar should be rendered
 * @param {atb.DMWebService=} ws DMWebService
 * @param {Boolean=} opt_autoRender If true, automatically renders the toolbar upon page load
 * @constructor
 */
atb.ui.Toolbar = function (divId, ws, opt_autoRender) {
	this.googToolbar = new goog.ui.Toolbar();
	this.divId = divId;
	this.ws = ws;
	
	if (opt_autoRender) {
        var toolbar = this;
		jQuery(window).load(function () {
            toolbar.render();
        });
	}
};


/**
 * Adds a button to the toolbar
 * @param {goog.ui.Control=} button The button to be added to the toolbar
 */
atb.ui.Toolbar.prototype.addButton = function (button) {
	this.googToolbar.addChild(button, true);
};


/**
 * Adds a button to the toolbar at the specified index
 * @param {goog.ui.Control=} button The button to be added to the toolbar
 * @param {Integer=} index The index at which the button should be inserted
 */
atb.ui.Toolbar.prototype.addButtonAtIndex = function (button, index) {
	this.googToolbar.addChildAt(button, index, true);
};


/**
 * Gets the button at the specified index
 * @param {Integer=} index
 */
atb.ui.Toolbar.prototype.getButtonAtIndex = function (index) {
	return this.googToolbar.getChildAt(index);
};


/**
 * Renders the toolbar
 */
atb.ui.Toolbar.prototype.render = function () {
	this.googToolbar.render(goog.dom.getElement(this.divId));
};

atb.ui.Toolbar.Orientation = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
};


/**
 * Returns the orientation of the toolbar
 * @return {atb.ui.Toolbar.Orientation}
 */
atb.ui.Toolbar.prototype.getOrientation = function () {
    var result = this.googToolbar.getOrientation();
    
    if (result == goog.ui.Container.Orientation.HORIZONTAL) {
        return atb.ui.Toolbar.Orientation.HORIZONTAL;
    }
    else {
        return atb.ui.Toolbar.Orientation.VERTICAL;
    }
};


/**
 * Sets the toolbar orientation
 * @param {atb.ui.Toolbar.Orientation} orientation
 */
atb.ui.Toolbar.prototype.setOrientation = function (orientation) {
    this.googToolbar.setOrientation(orientation);
};