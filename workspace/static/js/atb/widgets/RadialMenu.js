goog.provide("atb.widgets.RadialMenu");

/**
 * @fileoverview Provides an implementation of Radial menus consistent with atb.widgets.IMenu.
 *
 * @author John O'Meara
**/

goog.require("atb.widgets.IMenu");
goog.require("jquery.jQuery");
goog.require('jquery.plugins.radmenu');
goog.require("atb.util.ReferenceUtil");
goog.require("atb.widgets.ExclusiveGrouping");
goog.require("atb.util.StyleUtil");

/**
 * this provides an implementation for the IMenu class, which is based on a RadialMenu.
 * @param {?HTMLElement?} opt_set_targetDiv The div which shall contain this object (the element Will be modified). If null, or if omitted, we'll auto append our own div to the body tag.
 * @param {?Array.<atb.widgets.MenuItem>=} opt_add_menu_items An optional array of menu items to append to this menu.
 *
 * @constructor
 * @extends {atb.widgets.IMenu}
**/
atb.widgets.RadialMenu = function(opt_set_targetDiv, opt_add_menu_items, opt_menu_options)
{
	//this.tryInitMenuStylesOnce();//HACK
	
	atb.widgets.IMenu.call(this);//Call superclass's constructor
	
	////opt_menu_options =atb.util.ReferenceUtil.applyDefaultValue(opt_set_targetDiv, {});
	opt_menu_options =atb.util.ReferenceUtil.applyDefaultValue(opt_menu_options, {});
	var menu_options = {
		minSlices: 8,
		//minSlices: 2,
		radius: 80,
		//startingAngle: 90
		startingAngle: 0,
		cssRoot: atb.util.StyleUtil.DEFAULT_CSS_ROOT
	};
	for(k in opt_menu_options)
	{
		//lolcopy:
		menu_options[k] = opt_menu_options[k];
	}
	this.menu_options = menu_options;
	this.tryInitMenuStylesOnce();//HACK
	
	this.bAutoCreateRoot = false;
	opt_set_targetDiv  = atb.util.ReferenceUtil.applyDefaultValue(opt_set_targetDiv, null);
	opt_add_menu_items = atb.util.ReferenceUtil.applyDefaultValue(opt_add_menu_items, []);
	
	if (opt_set_targetDiv == null)
	{
		opt_set_targetDiv = document.createElement("div");
		this.bAutoCreateRoot = true;
		
		this.baseDiv = opt_set_targetDiv;
		this.rootDiv = opt_set_targetDiv;
	}
	else
	{
		this._realParent = opt_set_targetDiv;
		//opt_set_targetDiv = document.createElement("div");
		//this._realParent.appendChild(opt_set_targetDiv);
		
		this.rootDiv = this._realParent;
		this.baseDiv =  document.createElement("div");
		this._realParent.appendChild(this.baseDiv);
	}
	
	//this.baseDiv = opt_set_targetDiv;
	
	this.groups = [];//new atb.widgets.ExclusiveGrouping(
	this.allGroups = [];
	
	//modify our style:
	var style = this.baseDiv.style;
	style.position = "absolute";
	style.left=0;
	style.marginLeft=0;
	style.top = 0;
	style.marginTop = 0;
	
	this.targetDiv = document.createElement("div");
	this.baseDiv.appendChild(this.targetDiv);
	this.listTag = document.createElement("ul");
	jQuery(this.listTag).addClass("list");
	
	this.bAppendedListTag = false;
	this.bCreatedOnce = false;
	this.menuTags = [];
	this.itemsByIndex = [];
	this.bInitOnce = false;
	
	this.addItems(opt_add_menu_items);
};

goog.inherits(atb.widgets.RadialMenu, atb.widgets.IMenu);

atb.widgets.RadialMenu.hack_have_added_style_tag = false;
atb.widgets.RadialMenu.prototype.tryInitMenuStylesOnce = function()
{
	if (atb.widgets.RadialMenu.hack_have_added_style_tag)
	{
		return;
	}
	atb.widgets.RadialMenu.hack_have_added_style_tag = true;
	
	//var cssFilename = "../css/atb/widgets/RadialMenuDefaults.css";
	//var styleRoot =this.menu_options["cssRoot"]; //this.cssRoot;//"../css";//hack..
	//var cssFilename = styleRoot + "/atb/widgets/RadialMenuDefaults.css";
	//atb.util.StyleUtil.includeStyleSheetOnce(cssFilename);
};

atb.widgets.RadialMenu.prototype.findMatchingEntryInfo = function(findMenuItem)
{
	//kinda a hack =/:
	for(var i=0,l=this.itemsByIndex.length; i<l; i++)
	{
		var testEntry = this.itemsByIndex[i];
		if (testEntry.menuItem === findMenuItem)
		{
			return testEntry;
		}
	}
	goog.asserts.assert(false, "match not found for menuitem when looking for an entry!");
	//orlolraiseerror...??
	
	return null;//not found!
	
};

atb.widgets.RadialMenu.prototype.findItemByName = function (name) {
    for(var x in this.items) {
        var item = this.items[x];

        if (item.itemName == name) {
            return item;
        }
    }
    return null;
};

atb.widgets.RadialMenu.prototype.getGroupManager = function(groupName)
{
	var group;
	
	var self = this;
	group = this.groups[groupName];
	if (atb.util.ReferenceUtil.isBadReferenceValue(group))
	{
		var updateItemFunc = function(whichItem, forGroupName, bItemActive)
		{
			var radMenu = jQuery(this.targetDiv);
			
			var items = self.findMenuItemTagsHack();
			
			var entryInfo = self.findMatchingEntryInfo(whichItem);
			var entryIndex = entryInfo.itemIndex;
			var tag = items.get(entryIndex);
			//var activeCssClass = radMenu.opts.activeItemClass;
			var activeCssClass = "active";//lolhack!
			//$m.opts.activeItemClass;
			if (bItemActive)
			{
				jQuery(tag).addClass(activeCssClass);
			}
			else
			{
				jQuery(tag).removeClass(activeCssClass);
			}
		};
		
		group = new atb.widgets.ExclusiveGrouping(groupName, updateItemFunc, true);
		
		this.groups[groupName] = group;
		this.allGroups.push(group);
	}
	return group;
};

/**
 * @inheritDoc
**/
atb.widgets.RadialMenu.prototype._onShowMenu = function()
{
	this.tryCreate();
	if (this.bAutoCreateRoot)
	{
		/*
		if (this.baseDiv.parentNode != document.body)
		{
			document.body.appendChild(this.baseDiv);
		}
		*/
		if (this.rootDiv.parentNode === null)
		{
			//or loluseparent...?
			document.body.appendChild(this.rootDiv);
		}
	}
	
	var self = this;
	jQuery(this.targetDiv).radmenu('show',
	function(items)
	{
		//or lolrecalculate...x,y=maybe a todo...????:
		self._onRepaint();
		items.show();
	});
};

/**
 * @inheritDoc
**/
atb.widgets.RadialMenu.prototype._onHideMenu = function()
{
	jQuery(this.targetDiv).radmenu('hide');
	
	//Hack - we need to destroy the menu, else items added later don't work properly...
	jQuery(this.targetDiv).radmenu('destroy');
	this.bCreatedOnce=false;//hack
	//end hack
	
	if (this.bAutoCreateRoot)
	{
		//if (this.baseDiv.parentNode == document.body)
		if (this.rootDiv.parentNode !== null)
		{
			//document.body.removeChild(this.baseDiv);
			this.rootDiv.parentNode.removeChild(this.rootDiv);
		}
	}
};

/**
 * @inheritDoc
**/
atb.widgets.RadialMenu.prototype._addMenuItem = function(menuItem)
{
	// Q: what would a remove event look like...could we even make it work with this messy menu stuff...???
	var menuItemName = menuItem.getName();
	var divGenerator = menuItem.getDomGenerator();
	//lolshowsubmenu...???
	
	var menuItemTag = divGenerator(menuItem);
	
	//var bItemEnabled = !!menuItem.isEnabled();
	
	var itemTag = document.createElement("li");
	jQuery(itemTag).addClass("item");
	itemTag.appendChild(menuItemTag);
	this.listTag.appendChild(itemTag);
	
	var menuItemIndex = this.itemsByIndex.length;
	var entryInfo = {
		name: menuItemName,
		menuItem: menuItem,
		domElement: itemTag,
		itemIndex: menuItemIndex
	};
	
	this.itemsByIndex.push(entryInfo);
	this.menuTags[menuItemName] = entryInfo;
	
	
	var groupName = menuItem.getGroupName();
	
	if (!atb.util.ReferenceUtil.isBadReferenceValue(groupName))
	{
		var group = this.getGroupManager(groupName);
		group.addItem(menuItem);
		//menuItem.
	}
	//var $m = getMenu(evt);
	//if( !$m.opts.onNext($m) ) return;
	//switchItems($m, $m.raditems().length-1, 0);
	//...
	
	
	//hack - if we don't do this, new items "stick" around without getting hidden properly (until the next show/hide):
	if (!this.isVisible())
	{
		jQuery(itemTag).hide();
	}
};

atb.widgets.RadialMenu.prototype.findMenuItemTagsHack = function()
{
	//more or less borrowed from the radmenu plugin's code...: =/
	var items = jQuery(this.targetDiv).find("."+$.radmenu.container.itemClz);//HACK
	return items;
};	

/**
 * @inheritDoc
**/
atb.widgets.RadialMenu.prototype._onRepaint = function()
{	
	//orlolobjecnotassocarsaylol..???
	
	//TODO: implement this in radial menu...?
	//or lolrecalculate...x,y=maybe a todo...????:
	var self = this;//lolz!
	
	
	var items;
	items = this.findMenuItemTagsHack();
	
	var style= self.targetDiv.style;
	//style.position = "absolute";
	style.position = "relative";
	style.left = self.x + "px";
	style.top  = self.y + "px";
	//orloldeferupdateslol.z...?

	var i, l;
	for (i=0, l = this.allGroups.length; i<l; i++)
	{
		//try
		//{
			var group = this.allGroups[i];
			group.updateAll();//lolhack
		//}
		//catch(err)
		//{
		//	debugPrint("Error in allGroups["+i+"]");
		//}
	}
	
	for (i=0,l = items.length; i<l; i++)
	{
		var tag = items.get(i);
		var itemEntry =self.itemsByIndex[i];
		var menuItem=itemEntry.menuItem;
		var bItemEnabled = !!menuItem.isEnabled();
		var jqTag = jQuery(tag);
		if (bItemEnabled)
		{
			jqTag.removeClass("disabled");
		}
		else
		{
			jqTag.addClass("disabled");
		}
		//jqTag.mouseDown(function(mouseEvent)
		jqTag.mousedown(function(mouseEvent)
		{
			mouseEvent.stopPropagation();
			mouseEvent.preventDefault();
			return false;
		});
		jqTag.mouseup(function(mouseEvent)
		{
			mouseEvent.stopPropagation();
			return false;
		});
		
		//HACK - stuff for padding hacks:
			//lol...do we really want to repeat this so often potentially...???:
		
		tag.style.left = atb.util.StyleUtil.modifyStyleCoordinate(tag.style.left, 10, "px");
		tag.style.top = atb.util.StyleUtil.modifyStyleCoordinate(tag.style.top, 10, "px");
		tag.style.padding = 0;//lolhack
	}
	
};





/**
 * A helper method to try and "create" the menu.
 * @private
**/
atb.widgets.RadialMenu.prototype.tryCreate = function()
{
	if (this.bCreatedOnce)
	{
		return;
	}
	this.bCreatedOnce = true;
	
	var self = this;
	
	var jqTargetDiv = jQuery(this.targetDiv);
	if (!this.bInitOnce)
	{
		this.bInitOnce=true;//hack
		jqTargetDiv.addClass("atb-radialmenu-container");//lolhack
	}
	
	if (!this.bAppendedListTag)
	{
		this.bAppendedListTag = true;
		this.targetDiv.appendChild(this.listTag);
	}
	//debugViewObject(this.menu_options);//lol!
	/*
	minSlices: 8
         radius: 80
		 //^...??
	*/
	jqTargetDiv.radmenu({
		//minSlices: 8,
		//radius: 80,
		minSlices: this.menu_options.minSlices,
		radius: this.menu_options.radius,
		angleOffset: -90 + this.menu_options.startingAngle,
		
		animSpeed:400,
		centerX: -12,//16,//8,//0,//-13,//-11,//-9,//0,//-18,//0,//half-item-size...?
		centerY: -12,//16,//0,//-13,//-11,//-9,//0,//-18,//0,
		/*centerX: -20,
		centerY: -20,
		*/
		selectEvent: "click",
		rotate: false,
		//angleOffset: -90,// + this.menu_options.startingAngle,
		onSelect: function($selected, selectIndex)
		{
			var entryInfo = self.itemsByIndex[selectIndex];
			var menuItem = entryInfo.menuItem;
			if (!menuItem.isEnabled())
			{
				return false;
			}
			
			var returnValue = true;
			
			var groupName = menuItem.getGroupName();//);//ButtonGroup();//lolZ!//loname
			
			returnValue = false; //DISABLE the built-in selection rules...lolhack!-abusing disabled's functionality...lol!
			if (!atb.util.ReferenceUtil.isBadReferenceValue(groupName))
			{
				var group = self.getGroupManager(groupName);
				if (group.isSelected(menuItem))
				{
					//already selected...lol!
					return false;
				}
				
				group.select(menuItem);
			}
			else
			{
				//not in a group...lol!
			}
			
			self.handleItem(entryInfo);
			
			return returnValue;
			////////////////////////
		}
	});//end make radmenu
	
};

/**
 * a method to handle clicking on an item. this gets forwarded to the provided handler.
 * @private
**/
atb.widgets.RadialMenu.prototype.handleItem = function(itemInfo)
{
	var menuItem = itemInfo.menuItem;
	this.raiseMenuActionEvent(menuItem);
	//or lol menuitemactionhandlerevent...or something lol...?
};

//[2:35:06 PM] Shannon Bradshaw: John TODO: Radial menu buttons should be dismissing or not dismissing. By default, dismissing.
//^Q: how do i actually REALLY want to implement that semantic??? hmmm.... ::postpones it for now::
//TODO: force onscreen, also params...?