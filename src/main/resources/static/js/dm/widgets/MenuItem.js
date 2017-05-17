goog.provide("dm.widgets.MenuItem");

/**
 * @fileoverview MenuItems form the basis our our menu creation efforts. They are the little pieces of data which tell a menu how to create a menuitem for that item.
 *
 * @author John O'Meara
**/

goog.require("dm.util.ReferenceUtil");

/**
 * Creates a MenuItem.
 *
 * @param {string} set_itemName The name of thie menuItem.
 * @param {function(dm.widgets.MenuItem, ?HTMLElement=): HTMLElement} set_domGenerator The function used to generate our items' dom element(s).
 * @param {function(dm.widgets.MenuActionEvent)} set_actionHandler The action handler for our menuItem.
 * @param {?string=} opt_set_tooltip An optional tooltip value to display when hovering over the menuitem in some menu implementations.
 * @param {?string=} opt_set_buttonGroup An optional buttonGroup name to "Radiobutton" this menuItem into.
 * @param {boolean=) opt_setEnabled An optional boolean value controlling the default enabled status of this menuItem.
 *
 * @constructor
**/
dm.widgets.MenuItem = function(set_itemName, set_domGenerator, set_actionHandler, opt_set_tooltip, opt_set_buttonGroup, opt_setEnabled, opt_customOptions)
{	
	this.modificationListeners = [];
	this.customOptions = {};//hack
	
	this.bToggleButtonHack = false;
	
	this.itemName = set_itemName;
	this.domGenerator= set_domGenerator;
	this.actionHandler = set_actionHandler;
	this.buttonGroup = dm.util.ReferenceUtil.applyDefaultValue(opt_set_buttonGroup, this.buttonGroup);	
	this.bEnabled = dm.util.ReferenceUtil.applyDefaultValue(opt_setEnabled, this.bEnabled);
	this.tooltip =  dm.util.ReferenceUtil.applyDefaultValue(opt_set_tooltip, this.tooltip);
	
	//this.customOptions = dm.util.ReferenceUtil.applyDefaultValue(opt_customOptions, this.customOptions);
	this.customOptions = dm.util.ReferenceUtil.applyDefaultValue(opt_customOptions, this.customOptions);
	
	//this.bToggleButtonHack = dm.util.langUtil.forceBoolean(customOptions["bToggleButtonHack"], this.bToggleButtonHack);//HACK
	//this.bToggleButtonHack = dm.util.LangUtil.forceBoolean(customOptions["bToggleButtonHack"], this.bToggleButtonHack);//HACK
	this.bToggleButtonHack = dm.util.LangUtil.forceBoolean(this.customOptions["bToggleButtonHack"], this.bToggleButtonHack);//HACK
	//{});
	
	this.modificationListeners = [];//lolz!
};

/**
 * @return {string} Our item name.
**/
dm.widgets.MenuItem.prototype.getName = function()
{
	return this.itemName;
};

/**
 * @return {boolean} Our enabled state.
**/
dm.widgets.MenuItem.prototype.isEnabled = function()
{
	return this.bEnabled;
};

/**
 * returns our dom generator function.
 * @return {function(dm.widgets.MenuItem, ?HTMLElement=): HTMLElement} Our dom generator function.
**/
dm.widgets.MenuItem.prototype.getDomGenerator = function()
{
	return this.domGenerator;
};

/**
 * returns our tooltip.
 * (Currently a string or null...)
**/
dm.widgets.MenuItem.prototype.getTooltip = function()
{
	return this.tooltip;
};

/**
 * @return {function(dm.widgets.MenuActionEvent)} Our action handler function.
**/
dm.widgets.MenuItem.prototype.getActionHandler = function()
{
	//return this.actionHandler;
	
	//this should allow us to modify stuff better at runtime...lol:
	var self = this;
	return function(actionEvent)
	{
		//HACK - this way we can transparently swap the action:
		return self.actionHandler.call(this, actionEvent);
	};
};

/**
 * @return {?string} The name of our button group, or null (if we don't have a group name).
**/
dm.widgets.MenuItem.prototype.getButtonGroup = function()
{
	return this.buttonGroup;
};

//lol prefered alias:
dm.widgets.MenuItem.prototype.getGroupName=dm.widgets.MenuItem.prototype.getButtonGroup;


dm.widgets.MenuItem.prototype.getCustomOptions = function()
{
	return this.customOptions;
};

dm.widgets.MenuItem.prototype.addModifyListener = function(modifyListenerFunc)
{
	this.modificationListeners.push(modifyListenerFunc);
};

//dm.widgets.MenuItem.prototype.setEnabled(set_bEnabled)
dm.widgets.MenuItem.prototype.setEnabled = function(set_bEnabled)
{
	set_bEnabled = !!set_bEnabled;//(set_bEnabled===true);
	if (set_bEnabled !== this.bEnabled)
	{
		this.bEnabled = set_bEnabled;
		this.raiseModifyEvent();
	}
	else
	{
		//do nothing...
	}
};

//protected|private method:...?:
dm.widgets.MenuItem.prototype.raiseModifyEvent = function()
{//^Lolhack
	var event = {
		items: [this]
	};//^lolhack
	for (var i=0, l = this.modificationListeners.length; i<l; i++)
	{
		var listener = this.modificationListeners[i];
		listener(event);
	}
};

dm.widgets.MenuItem.prototype.isToggleButton_hack = function()
{
	return this.bToggleButtonHack;
};

//properties:
dm.widgets.MenuItem.prototype.itemName = "unnamed menu item";//HACK
dm.widgets.MenuItem.prototype.domGenerator = null;
dm.widgets.MenuItem.prototype.actionHandler = null;

dm.widgets.MenuItem.prototype.tooltip = "";
dm.widgets.MenuItem.prototype.buttonGroup = null;
dm.widgets.MenuItem.prototype.bEnabled = true;

dm.widgets.MenuItem.prototype.modificationListeners = null;//[];//hack
dm.widgets.MenuItem.prototype.customOptions =null;// {};//hacklol
//modificationListeners
//raiseModifyEvent


////////////////////////////////////////////////////

//or lol context generator...??
//or lol context generator...???????

//or lolre-render func for domgenerated...???
//or lol context-based tooltip-generator...??
//what of mutators...???..listeners to mutators...???
////lolordering priorities...?
/*
MenuItem class:
- Instantiate with parameters: name, function that generates a domElement, clickHandler, buttonGroup
- getName
- setEnabled method with parameter: true/false
- isEnabled method
- getDomElement
- getDomElementFunction
- getClickHandler
- setClickHandler
- getButtonGroup
*/
//or lol buttonbindingsgenerators...??
//or lol tool/vs representation of a tool button distinctions....???
//Q: ordering...???
