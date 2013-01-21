goog.provide("atb.widgets.MenuActionEvent");

/**
 * @fileoverview MenuActionEvent (s) exist to help standardize the arguments to the event handlers for menuItems.
 *
 * @author John O'Meara
**/


/**
 * Creates a MenuActionEvent.
 *
 * @param {atb.widgets.IMenu} set_menu The menu which this is to be applied to.
 * @param {atb.widgets.MenuItem} set_menuItem The menuItem to apply this to.
 * @param {object} set_context A value which has some meaning to our action handlers, based on the menu's "context" value.
 *
 * @constructor
**/
atb.widgets.MenuActionEvent = function(set_pane, set_menu, set_menuItem, set_context)
{
	this.pane = set_pane;//HACK
	this.menu = set_menu;
	this.menuItem = set_menuItem;
	this.context = set_context;
};

/**
 * returns our menu reference.
 * @return {atb.widgets.IMenu} Our menu reference
 * @public
**/
atb.widgets.MenuActionEvent.prototype.getMenu = function()
{
	return this.menu;
};

/**
 * returns our menuItem reference.
 * @return {atb.widgets.MenuItem} Our menuItem reference
 * @public
**/
atb.widgets.MenuActionEvent.prototype.getMenuItem = function()
{
	return this.menuItem;
};

/**
 * returns our context value.
 * @return {object} Our context value.
 * @public
**/
atb.widgets.MenuActionEvent.prototype.getContext = function()
{
	return this.context;
};

atb.widgets.MenuActionEvent.prototype.getPane = function()
{
	return this.pane;
}; 
////// Private Fields: //////

/**
 * Our menu.
 * @type {atb.widgets.IMenu}
 * @private
**/
atb.widgets.MenuActionEvent.prototype.menu = null;

/**
 * Our menuitem.
 * @type {atb.widgets.MenuItem}
 * @private
**/
atb.widgets.MenuActionEvent.prototype.menuItem = null;

/**
 * Our context value.
 * @type {object}
 * @private
**/
atb.widgets.MenuActionEvent.prototype.context = null;
