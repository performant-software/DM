goog.provide('atb.widgets.IMenu');

//TODO: refactor me into IMenu (an interface), and AbstractMenu (an abstract class containing most, if not all of this classes functonality)

/**
 * @fileoverview the idea here is to provide a generic wrapper class to encapsulate various types of popup menus. 
 * This is basically an abstract base class for menu widgets.
 *
 * @author John O'Meara
**/

goog.require("atb.widgets.MenuActionEvent");

/**
Menu Class:
- Instantiate with parameters: domElement, list of MenuItems (optional)
- addItem method (adds a MenuItem)
- setVisible method with parameter: true/false
- setPosition method with parameter: position
- setContext method with parameter: an object

Q: what about highlights/disabled item(s)...?
**/

/**
 * creates an IMenu.
 * @constructor
 * @protected
**/
atb.widgets.IMenu = function()
{
	/**
	 * The visibility state of this menu.
	 * @type{boolean}
	 * @private
	**/
	this.bVisible = false;
	
	/**
	 * Our x-coordinate.
	 * @type{number}
	 * @private
	**/
	this.x = 0;
	
	/**
	 * Our y-coordinate.
	 * @type{number}
	 * @private
	**/
	this.y = 0;
	
	/**
	 * Our menuItems.
	 * @type{Array.<atb.widgets.MenuItem>}
	 * @private
	**/
	this.items = [];
	
	/**
	 * Our context value.
	 * @type{?object}
	**/
	this.contextObject = null;
	
	//this.groups = [];
	
	this.activePane = null;//HACK--newlol!
	
	this.itemListeners = [];//new hack!
};

/*
//Too complex for now:
atb.widgets.IMenu.prototype.setActiveGroupItem=function(groupName, activeMenuItem)
{
	var groupInfo = this.groups[groupName];//or somehow handle undefined/null cases...?
	
	//var undef; if (undef){...?
	
	if(groupInfo)//hack...?
	{
		groupInfo.activeItem = activeMenuItem;
		for(var k in groupInfo.items)
		{
			var menuItem = groupInfo.items[k];
			if (menuItem == activeMenuItem)//or ==k...???
			{
				menuItem.setSelected(true);
			}
			else
			{
				menuItem.setSelected(false);
				//menuItem.setHighlighted(false);
				//or on switch item...???
			}
			//lol...?
		}
	}
	else
	{
	}
};
*/

/**
 * plural additem convience method.
 * @param {Array.<atb.widgets.MenuItem>} addTheseItems An array of menuItems to sequentially add to this menu.
**/
atb.widgets.IMenu.prototype.addItems = function(addTheseItems)
{
	for( var i = 0, l = addTheseItems.length;  i < l;  i++ )
	{
		this.addItem( addTheseItems[i] );
	}
};

/**
 * sets the current context value for this menu.
 * @param {object} set_contextObject The value to assign to this menu's context value.
**/
atb.widgets.IMenu.prototype.setContext = function(set_contextObject)
{
	this.contextObject = set_contextObject;
	//or on context changed...???
};

/**
 * returns the currently set context value.
 * @return {object} The current context value for this menu.
**/
atb.widgets.IMenu.prototype.getContext = function()
{
	return this.contextObject;
};

/**
 * adds a menuitem to the end of this menu.
 * @param {atb.widgets.MenuItem} menuItem The menuItem to be added.
**/
atb.widgets.IMenu.prototype.addItem = function(menuItem)
{
	var self = this;
	menuItem.addModifyListener(function(menuItemModifiedEvent)
	{
		if (self.isVisible())
		{
			self._onRepaint();//lolhack!
		}
	});
	this.items.push(menuItem);
	this._addMenuItem(menuItem);
};

/**
 * sets the location of a menu. This MIGHT not affect open menus.
 * @param {number} setX The x-Coordinate
 * @param {number} setY The y-Coordinate
**/
atb.widgets.IMenu.prototype.setLocation = function(setX, setY)
{
	this.x=setX;
	this.y=setY;
	this._onRepaint();
};

//Alias:
atb.widgets.IMenu.prototype.setPosition = atb.widgets.IMenu.prototype.setLocation;

/**
 * controls the visibility of the menu.
 * @param {boolean} bVisible - to show (true), or hide (false) the menu.
**/
atb.widgets.IMenu.prototype.setVisible = function(bVisible) {
	if (this.bVisible != bVisible)
	{
		this.bVisible = bVisible;
		if (bVisible)
		{
			this._onShowMenu();
		}
		else
		{
			this._onHideMenu();
		}
	}
};

/**
 * retrieves whether the menu is set to visible or not.
 * @return {boolean} The visibility state of this menu.
**/
atb.widgets.IMenu.prototype.isVisible = function()
{
	return this.bVisible;
};

/**
 * convience method to setVisible(true).
**/
atb.widgets.IMenu.prototype.show = function()
{
	this.setVisible(true);
};

/**
 * convience method to setVisible(false).
**/
atb.widgets.IMenu.prototype.hide = function()
{
	if (this.isVisible())
	{
		this.itemListeners = [];//HACK//HACK
	}
	this.setVisible(false);
	
};

/**
 * a convience form to show this menu with the specified context, and at the indicated coordinates.
 * @param {object} withContext Some application-defined value which has meaning to this menu's actionHandler methods.
 * @param {number} setX The x-Coordinate
 * @param {number} setY The y-Coordinate
**/
atb.widgets.IMenu.prototype.invokeMenu = function(withContext, atX, atY)
{
	//first hide the menu
	this.hide();
	
	//next, update the context object:
	this.setContext(withContext);
	
	//now update the location:
	this.setPosition(atX, atY);
	
	//finally, show the menu (possibly reshow it):
	this.show();
};

/**
 * convience method to hide the menu, then place then menu at (atX, atY), then show it.
 * @param {number} setX The x-Coordinate
 * @param {number} setY The y-Coordinate
**/
atb.widgets.IMenu.prototype.showMenuAt = function(atX, atY)
{
	this.hide();
	
	this.setPosition(atX,atY);
	
	this.show();
};

/**
 * Returns the current x-coordinate.
 * @return {number} The current x-coordinate.
**/
atb.widgets.IMenu.prototype.getX = function()
{
	return this.x;
};

/**
 * Returns the current y-coordinate.
 * @return {number} The current y-coordinate.
**/
atb.widgets.IMenu.prototype.getY = function()
{
	return this.y;
};

/**
 * The behavior to actually add a menuitem should be implemented in a subclass implementing this method.
 * @protected
**/
atb.widgets.IMenu.prototype._addMenuItem = function(menuItem)
{
	//TODO: override me
};

/**
 * The behavior to actually show a menu should be implemented in a subclass implementing this method.
 * @protected
**/
atb.widgets.IMenu.prototype._onShowMenu = function()
{
	//TODO: override me
};

/**
 * The behavior to actually hide a should be implemented in a subclass implementing this method.
 * @protected
**/
atb.widgets.IMenu.prototype._onHideMenu = function()
{
	//TODO: override me
};

/**
 * handler for when a menu item is to be repainted.
 * @protected
**/
atb.widgets.IMenu.prototype._onRepaint = function()
{
	//TODO: override me
};

/**
 * creates a menuActionEvent.
 * @protected
**/
atb.widgets.IMenu.prototype.createMenuActionEvent = function(menuItem)
{
	//return new atb.widgets.MenuActionEvent(this.getViewerHack(), this, menuItem, this.getContext());
	//return new atb.widgets.MenuActionEvent(this.setActivePane(), this, menuItem, this.getContext());
	return new atb.widgets.MenuActionEvent(
		////this.setActivePane(), //LOLFAIL!!!?A?A?!!
		this.getActivePane(),
		this, 
		menuItem, 
		this.getContext()
	);
};

/**
 * helper method to raise a menuActionEvent on the specified menuItem.
 * @protected
**/
atb.widgets.IMenu.prototype.raiseMenuActionEvent=function(menuItem)
{
	for(var i=0,l =this.itemListeners.length; i<l; i++)
	{
		this.itemListeners[i](menuItem);
	}
	
	//debugPrint("IMenu::raiseMenuActionEvent()");
	var actionHandlerFunc = menuItem.getActionHandler();
	var actionEvent = this.createMenuActionEvent(menuItem);
	actionHandlerFunc(actionEvent);
};	

//atb.widgets.IMenu.prototype.setViewerHack = function(set_viewer)
//atb.widgets.IMenu.prototype.setActivePane = function(set_viewer)
atb.widgets.IMenu.prototype.setActivePane = function(set_pane)
{
	//^LOLZ!
	//this.activeViewer = set_viewer;
	this.activePane = set_pane;
};//HACK

atb.widgets.IMenu.prototype.getActivePane = function()//getViewerHack = function()
{//hack-private:
	//return this.activeViewer;
	return this.activePane;
};

atb.widgets.IMenu.prototype.addMenuItemListener = function(listenerFunc)
{
	this.itemListeners.push(listenerFunc);
};