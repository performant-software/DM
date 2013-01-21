goog.provide("atb.widgets.MenuButtonSet");

/**
 * @fileoverview extends goog.ui.Dialog.ButtonSet in order to provide a more flexible button management system.
 *
 * @author John O'Meara
**/

goog.require("goog.ui.Dialog.ButtonSet");
goog.require("goog.dom");
goog.require("atb.widgets.MenuUtil");
goog.require("jquery.jQuery");
goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugUtil");
goog.require("atb.widgets.MenuActionEvent");

atb.widgets.MenuButtonSet = function(set_dialogWidget, opt_domHelper)
{
	goog.ui.Dialog.ButtonSet.call(this, opt_domHelper);
	this.menuEntriesByKey = {};
	this.menuItemKeys = [];
	
	this.rootDiv = document.createElement("div");
	this.mbs_element = goog.dom.getElement(this.rootDiv);
	goog.ui.Dialog.ButtonSet.prototype.attachToElement.call(this, this.getGoogleElementUnderscore());
	this.dialogWidget = set_dialogWidget;
	//HACK:
	//this.element_ = goog.dom.getElement(buttonContainerDiv); //HACK
};

goog.inherits(atb.widgets.MenuButtonSet, goog.ui.Dialog.ButtonSet);

atb.widgets.MenuButtonSet.prototype.getButton = function(key)
{
	var entry = this.getMenuEntry(key);
	return entry.tag;
};

atb.widgets.MenuButtonSet.prototype.getAllButtons = function()
{
	var ret = [];
	for(var i=0, l=this.menuItemKeys.length; i<l; i++)
	{
		var key = this.menuItemKeys[i];
		var menuEntry = this.getMenuEntryByKey(key);
		var tag = menuEntry.button;
		var elem = goog.dom.getElement(tag);
		ret.push(elem);
	}
	return ret;
};
	
atb.widgets.MenuButtonSet.prototype.attachToElement = function(el)
{
	//el.appendChild(this.getGoogleElementUnderscore());
	this.mbs_element = this.element_ = el;
	this.render();
};

atb.widgets.MenuButtonSet.prototype.render = function()
{
	var allButtons = this.getAllButtons();
	for(var i=0, l=allButtons.length; i<l; i++)
	{
		var b = allButtons[i];
		//el.appendChild(b);
		this.getGoogleElementUnderscore().appendChild(b);
	}
};
atb.widgets.MenuButtonSet.prototype.decorate=function(elem)
{
	alert("Decorate!");
	this.attachToElement(elem);//HACK
	//elem.appendChild(buttonContainerDiv);
};	

///////////////////////////////////////////

atb.widgets.MenuButtonSet.prototype.getMenuEntryByKey = function(key)
{
	return this.menuEntriesByKey[key];
};

atb.widgets.MenuButtonSet.prototype.getGoogleElementUnderscore = function()
{
	//assert: this.mbs_element IS this.element_ //[where this.element_ is from goog.ui.Dialog.ButtonSet]
	return this.mbs_element;
};


////////////////

atb.widgets.MenuButtonSet.prototype.addItem = function(menuItem)
{
	var key = menuItem.getName();
	var useDiv;
	var buttonTagWrapperParent = document.createElement("button");
	var buttonTagWrapper = document.createElement("div");
	buttonTagWrapperParent.appendChild(buttonTagWrapper);
	buttonTagWrapperParent.setAttribute("name", key);
	
	useDiv = atb.widgets.MenuUtil.handleDomGeneratorProperly(menuItem, buttonTagWrapper);
	var entry = {
		button: buttonTagWrapperParent,
		tag: useDiv,
		menuItem: menuItem,
		key: key
	};
	
	this.rootDiv.appendChild(buttonTagWrapperParent);
	
	this.menuItemKeys.push(key);
	this.menuEntriesByKey[key] = entry;
	
	var custom = menuItem.getCustomOptions();
	
	var bDefaultButton = atb.util.LangUtil.forceBoolean(custom.bIsDefaultButton, false);
	if (bDefaultButton)
	{
		this.setDefault(key);
	}
	
	var bCancelButton = atb.util.LangUtil.forceBoolean(custom.bIsCancelButton, false);
	if (bCancelButton)
	{
		this.setCancel(key);
	}
};

atb.widgets.MenuButtonSet.prototype.addButton = atb.widgets.MenuButtonSet.prototype.addItem;//HACK

atb.widgets.MenuButtonSet.prototype.getPane=function()
{
	return null;//todo:?=maybe get from dialog_widget...?
	//return this.dialogWidget;
	//return null;//HACK
	//return this;//HACK
};

atb.widgets.MenuButtonSet.prototype.getContext=function()
{
	return null;//HACK//TODO:?=get from dialog_widget...??
};

atb.widgets.MenuButtonSet.prototype.onSelectEvent=function(selectEvent)
{
	var withKey = selectEvent.key;
	var menuEntry = this.getMenuEntryByKey(withKey);
	
	if (atb.util.ReferenceUtil.isBadReferenceValue(menuEntry))
	{
		atb.debug.DebugUtil.debugAssertion(false, "atb.widgets.MenuButtonSet::onSelectEvent: key not found: '"+withKey+"'");
		return;
	}
	
	var menuItem = menuEntry.menuItem;
	
	var menuActionEvent = new atb.widgets.MenuActionEvent(
		this.getPane(),
		this.dialogWidget,//HACK!
		menuItem,
		this.getContext()
	);
	var handler = menuItem.getActionHandler();
	var raw_ret = handler(menuActionEvent);
	var custom = menuItem.getCustomOptions();
	var bCloseByDefault = atb.util.LangUtil.forceBoolean(custom.bCloseByDefault, false);//hack
	return atb.util.LangUtil.forceBoolean(raw_ret, bCloseByDefault);
};
