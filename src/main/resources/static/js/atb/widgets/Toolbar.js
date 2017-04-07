goog.provide("atb.widgets.Toolbar");

/**
 * @fileoverview atb.widgets.Toolbar provides a "toolbar" implementation of atb.widgets.IMenu, based around the google closure library's goog.ui.Toolbar.
 *
 * @author John O'Meara
**/

goog.require('goog.events');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.editor.ToolbarFactory');
goog.require('goog.ui.editor.DefaultToolbar');

goog.require("atb.util.ReferenceUtil");
goog.require("atb.widgets.IMenu");

goog.require("atb.util.Map");

/**
 * provides a toolbar-based implementation of IMenu.
 *  this primarily uses google closure's goog.ui.toolbar and related stuff behind the scenes for its implementation
 *@constructor
 * @extends {atb.widgets.IMenu}
**/
atb.widgets.Toolbar = function(set_targetDiv, opt_initialMenuItems)
{
	goog.asserts.assert(!atb.util.ReferenceUtil.isBadReferenceValue(set_targetDiv), "null targetDiv given!");

	//Call superclass's constructor:
	atb.widgets.IMenu.call(this);
	//, set_targetDiv);

	this.baseDiv = set_targetDiv;

	this.buttonGroups = [];

	var emptyButtons = [];
	this.toolbarEntries = [];

	this.buttonsByName = new atb.util.Map();


	//this.myToolbar = this._makeToolbarHelper( this.baseDiv, true);
	//debugPrint(""+goog.ui.Container.Orientation.VERTICAL);
	this.myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar( emptyButtons, this.baseDiv );
	//debugViewObject(this.myToolbar);
	//this.myToolbar.setOrientation(goog.ui.Container.Orientation.VERTICAL);//HACK
	this.baseDiv.style.display = "none";

	opt_initialMenuItems = atb.util.ReferenceUtil.applyDefaultValue(opt_initialMenuItems, []);
	this.addItems(opt_initialMenuItems);

};

goog.inherits(atb.widgets.Toolbar, atb.widgets.IMenu);

/**
 * @inheritDoc
**/
atb.widgets.Toolbar.prototype._onShowMenu = function()
{
	this._onRepaint();
	//orlolupaatelol..?^

	//toolbarEntries
	this.baseDiv.style.left = ""+this.x+"px";
	this.baseDiv.style.top = ""+this.y+"px";
	this.baseDiv.style.display = "block";//hack
};

/**
 * @inheritDoc
**/
atb.widgets.Toolbar.prototype._onHideMenu = function()
{
	jQuery(this.baseDiv).hide();
};

/**
 * @inheritDoc
**/
atb.widgets.Toolbar.prototype._onRepaint = function()
{
	//TODO: implement this in radial menu...?
	for(var i=0, l = this.toolbarEntries.length; i<l; i++)
	{
		var entry = this.toolbarEntries[i];
		var menuItem = entry.menuItem;
		var button = entry.button;

		if (menuItem.isEnabled())
		{
			button.setEnabled(true);
		}
		else
		{
			button.setEnabled(false);
		}

		//button.setEnabled(false);
		//debugPrint("!!");
	}
	//var style = this.baseDiv.style;
	//hack - fix some style bugs...?:
	var style = this.myToolbar.getElement().style;
	//style.padding = "0px";
	//style.paddingLeft = "auto";
	//style.paddingLeft = "auto";
	style.marginTop = "auto";
	style.marginBottom ="auto";
	style.height="auto";
	jQuery(this.myToolbar.getElement()).addClass("goog-toolbar-taller");
};

/**
 * @inheritDoc
**/
atb.widgets.Toolbar.prototype._addMenuItem = function(menuItem)
{
	/*
		toolButtonId - must be unique per button
		tooltip - text to display on hover
		buttonCaption - text to display with the button. Doesn't work well in combination with an icon.
		buttonStyleClasses - classes of styles.
		buttonHandlerCallbackFunc - callback function invoked when the button is clicked.
	*/
	var toolButtonId = menuItem.getName();
	var tooltip = menuItem.getTooltip();
	var buttonCaption = "";
	var buttonStyleClasses = "";
	var useButtonGroup = menuItem.getButtonGroup();

	var self=this;
	//var myToolbar = this.myToolbar;

	var bToggleButton = false;
	if (useButtonGroup)
	{
		bToggleButton=true;
	}
	else
	{
		useButtonGroup = null;
	}

	if (menuItem.isToggleButton_hack())
	{
		bToggleButton = true;//HACl
	}

	var usingConstructor = ( bToggleButton ) ? goog.ui.editor.ToolbarFactory.makeToggleButton : goog.ui.editor.ToolbarFactory.makeButton;

	var newButton = usingConstructor(
		toolButtonId,
		tooltip,
		buttonCaption,
		buttonStyleClasses
	);

	//HACK:
	var element = newButton.getContent();

	var domGenerator = menuItem.getDomGenerator();
	var generated = domGenerator(menuItem, element);

	//Hack:
	if (generated != element)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(generated))
		{
			if (generated.parentNode !== element)
			{
				element.appendChild(generated);
			}
		}
	}


	newButton.queryable = true;//?????

	var handler = function(event)
	{
		if (bToggleButton)
		{
			var newState = newButton.isChecked();
			if (newState == false)
			{
				if (useButtonGroup!== null)
				{
					newButton.setChecked(true);
					return;
				}
				else
				{
					debugPrint("newState:false??");
				}
				/*
				//hack:
				if (self.defaultButton)
				{
					self.defaultButton.setChecked(true);//hack
					self.onHandTool();//lolhack
				}
				return;
				*/
			}
			else
			{
				//clear group:
				if (useButtonGroup !== null)
				{
					var group = self.buttonGroups[useButtonGroup];
					for(var i=0; i<group.length; i++)
					{
						var b = group[i];
						b.setChecked(false);
					}
				}
				newButton.setChecked(true);
			}
		}
		//self.raiseMenuActionEvent(menuItem, event);
		self.raiseMenuActionEvent(menuItem);
	};
	newButton._hack_buttonGroup = useButtonGroup;//HACK

	if(useButtonGroup!=null)
	{
		if (!self.buttonGroups[useButtonGroup])
		{
			self.buttonGroups[useButtonGroup] = [];
		}
		self.buttonGroups[useButtonGroup].push(newButton);
	}

	goog.events.listen(newButton, goog.ui.Component.EventType.ACTION, handler);

	//this.myToolbarButtons.push({
	this.toolbarEntries.push({
		menuItem: menuItem,
		button: newButton//,
	});

	/*if (!menuItem.isEnabled())
	{

	}*/

	newButton.setEnabled(menuItem.isEnabled());
	//myToolbar.addChildAt(newButton, 0, true);
	this.myToolbar.addChildAt(newButton, 0, true);
	this.buttonsByName.put(toolButtonId, newButton);
};

atb.widgets.Toolbar.prototype.setWidthHack = function(newWidth)
{
	this.baseDiv.style.width = ""+newWidth+"px";
};

atb.widgets.Toolbar.prototype.setMenuItemSelected_hack = function(menuItem, bSelected)
{
	//var button = this.buttonsByName.get(buttonName);
	var menuItemName = menuItem.getName();
	var button = this.buttonsByName.get(menuItemName);
	//^lolw..
	if (button === null)
	{
		return false;
	}
	else
	{
		/*
		var useButtonGroup =button._hack_buttonGroup;//HACK
		var group = this.buttonGroups[useButtonGroup];
		for(var i=0; i<group.length; i++)
		{
			var b = group[i];
			if (b !== button)
			{
				b.setChecked(false);
			}
		}
		*/
		button.setChecked(bSelected);
		return true;
	}
};

atb.widgets.Toolbar.prototype.isMenuItemSelected = function(menuItem)
{
	var menuItemName = menuItem.getName();
	var button = this.buttonsByName.get(menuItemName);
	if (button === null)
	{
		return false;//button not found!
	}
	else
	{
		return button.isChecked();//lolhacx!
	}
	//6Lolsst
};

atb.widgets.Toolbar.prototype.selectButtonByName = function(buttonName) //hack to allow us to set the active button visually
{
	var button = this.buttonsByName.get(buttonName);
	if (button === null)
	{
		return false;
	}
	else
	{
		var useButtonGroup =button._hack_buttonGroup;//HACK
		var group = this.buttonGroups[useButtonGroup];
		for(var i=0; i<group.length; i++)
		{
			var b = group[i];
			if (b !== button)
			{
				b.setChecked(false);
			}
		}

		button.setChecked(true);
		return true;
	}
};
