goog.provide("dm.widgets.MenuActionEvent");

/**
 * @fileoverview MenuActionEvent (s) exist to help standardize the arguments to the event handlers for menuItems.
 *
 * @author John O'Meara
**/


/**
 * Creates a MenuActionEvent.
 *
 * @param {dm.widgets.IMenu} set_menu The menu which this is to be applied to.
 * @param {dm.widgets.MenuItem} set_menuItem The menuItem to apply this to.
 * @param {object} set_context A value which has some meaning to our action handlers, based on the menu's "context" value.
 *
 * @constructor
**/
dm.widgets.MenuActionEvent = function(set_pane, set_menu, set_menuItem, set_context)
{
	this.pane = set_pane;//HACK
	this.menu = set_menu;
	this.menuItem = set_menuItem;
	this.context = set_context;
};

/**
 * returns our menu reference.
 * @return {dm.widgets.IMenu} Our menu reference
 * @public
**/
dm.widgets.MenuActionEvent.prototype.getMenu = function()
{
	return this.menu;
};

/**
 * returns our menuItem reference.
 * @return {dm.widgets.MenuItem} Our menuItem reference
 * @public
**/
dm.widgets.MenuActionEvent.prototype.getMenuItem = function()
{
	return this.menuItem;
};

/**
 * returns our context value.
 * @return {object} Our context value.
 * @public
**/
dm.widgets.MenuActionEvent.prototype.getContext = function()
{
	return this.context;
};

dm.widgets.MenuActionEvent.prototype.getPane = function()
{
	return this.pane;
}; 
////// Private Fields: //////

/**
 * Our menu.
 * @type {dm.widgets.IMenu}
 * @private
**/
dm.widgets.MenuActionEvent.prototype.menu = null;

/**
 * Our menuitem.
 * @type {dm.widgets.MenuItem}
 * @private
**/
dm.widgets.MenuActionEvent.prototype.menuItem = null;

/**
 * Our context value.
 * @type {object}
 * @private
**/
dm.widgets.MenuActionEvent.prototype.context = null;
