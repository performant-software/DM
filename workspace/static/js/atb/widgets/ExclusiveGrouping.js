goog.provide("atb.widgets.ExclusiveGrouping");

/**
 * provides a radio-button style exclusion primitive.
**/

goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugUtil");


atb.widgets.ExclusiveGrouping = function(set_groupName, set_itemUpdaterFunc, opt_setInitialValue, opt_initial_items)
{
	this.groupName = set_groupName;
	this.updateItemFunc = set_itemUpdaterFunc;
	this.items = atb.util.ReferenceUtil.applyDefaultValue(opt_initial_items, []);
	
	this.bAutoSelectFirstItem = false;
	this.selectedValue = null;
	
	if (opt_setInitialValue === true)
	{
		this.bAutoSelectFirstItem = true;
	}
	else
	{
		if (opt_setInitialValue === false)
		{
			opt_setInitialValue = null;//hack
		}
		this.selectedValue = atb.util.ReferenceUtil.applyDefaultValue(opt_setInitialValue, null);
	}
	
	if (this.bAutoSelectFirstItem)
	{
		if (this.items.length >0)
		{
			this.bAutoSelectFirstItem = false;
			this.selectedValue = this.items[0];//hack
		}
	}
	
	this.updateAll();//lolhack
};

//atb.widgets.ExclusiveGrouping.prototype.addItem(newItem)
atb.widgets.ExclusiveGrouping.prototype.addItem = function(newItem)
{
	if (this.bAutoSelectFirstItem)
	{
		this.bAutoSelectFirstItem = false;
		this.selectedValue = newItem;
	}
	
	this.items.push(newItem);
	this.updateAll();//hack
};

atb.widgets.ExclusiveGrouping.prototype.updateAll = function()//newItem)
{
//Q: do we care about consistency of groupings between different menus for a given menuitem...???lol...???
	//updateItemFunc(newItem, this.groupName, false);
	//for(var i=0, i<this.items.length; i++)
	for(var i=0, l=this.items.length; i<l; i++)
	{
		//updateItemFunc(newItem, this.groupName, false);
		var whichItem = this.items[i];
		var bItemActive = (whichItem === this.selectedValue);
		bItemActive = !!bItemActive;//lolparanoia!hack
		//	//!!
		
		//this.updateItemFunc(newItem, this.groupName, bItemActive);
		this.updateItemFunc(whichItem, this.groupName, bItemActive);
	}
};

atb.widgets.ExclusiveGrouping.prototype.select = function(set_selectedValue)
{
	this.selectedValue = set_selectedValue;
	this.updateAll();
};

atb.widgets.ExclusiveGrouping.prototype.isSelected = function(testSelection)
{
	//lolmultiselect.../????.hmm...??
	return (this.selectedValue === testSelection);
};