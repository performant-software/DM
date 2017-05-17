goog.provide("dm.widgets.VerticalToolbar");

/**
 * @fileoverview dm.widgets.VerticalToolbar provides a Vertical "toolbar" implementation of dm.widgets.IMenu, based around the google closure library's goog.ui.Toolbar.
 *
 * @author John O'Meara
**/

//google closure framework requirements:
goog.require('goog.events');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.editor.ToolbarFactory');
goog.require('goog.ui.editor.DefaultToolbar');
goog.require('goog.ui.Container');
goog.require('goog.dom');
goog.require('goog.dom');

//misc requires:
goog.require("dm.util.ReferenceUtil");
goog.require("dm.util.StyleUtil");
goog.require("dm.widgets.IMenu");//LOL!
/**
 * provides a toolbar-based implementation of IMenu.
 *  this primarily uses google closure's goog.ui.toolbar and related stuff behind the scenes for its implementation
 *@constructor
 * @extends {dm.widgets.IMenu}
**/
dm.widgets.VerticalToolbar = function(set_targetDiv, opt_initialMenuItems, opt_menu_options)
{
	// atb-verticaltoolbar
	goog.asserts.assert(!dm.util.ReferenceUtil.isBadReferenceValue(set_targetDiv), "null targetDiv given!");
	
	//Call superclass's constructor:
	dm.widgets.IMenu.call(this);
	
	this.baseDiv = set_targetDiv;

	this.buttonGroups = [];
	
	var emptyButtons = [];
	this.toolbarEntries = [];
	
	
	//this.myToolbar = this._makeToolbarHelper( this.baseDiv, true);
	//this.myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar( emptyButtons, this.baseDiv );
	//this.myToolbar.setOrientation(goog.ui.Container.Orientation.VERTICAL);//HACK
	
	this.myToolbar = this.testHack(this.baseDiv, true);
	this.myToolbar.setFocusable(false);
	//this.myToolbar.
	//debugViewObject(this.myToolbar);
	this.baseDiv.style.display = "none";
	
	
	
	opt_initialMenuItems = dm.util.ReferenceUtil.applyDefaultValue(opt_initialMenuItems, []);
	this.addItems(opt_initialMenuItems);
	
	opt_menu_options = dm.util.ReferenceUtil.applyDefaultValue(opt_menu_options, {});
	this.menu_options = {
		cssRoot: null//dm.util.StyleUtil.DEFAULT_CSS_ROOT
	};
	for(var k in opt_menu_options)
	{
		var v =opt_menu_options[k];
		this.menu_options[k] = v;
	}
	//var cssPath = this.menu_options["cssRoot"];
	//	//"../css";//hack
	
	//dm.util.StyleUtil.includeStyleSheetOnce(cssPath + "/atb/widgets/VerticalToolbar.css");
	//dm.util.StyleUtil.includeStyleSheetOnceFromRoot(this.menu_options["cssRoot"], "/atb/widgets/VerticalToolbar.css");
	
	jQuery(this.baseDiv).addClass("atb-verticaltoolbar");
	//this.vc = this.testHack(usingDiv, true);
	
};

goog.inherits(dm.widgets.VerticalToolbar, dm.widgets.IMenu);

dm.widgets.VerticalToolbar.prototype.testHack = function(usingDiv, bVerticalToolbar)
{
// Programmatically create a vertical container.
    var vc = new goog.ui.Container();
    vc.setId('Vertical Container');
    //vc.render(goog.dom.getElement('vc'));
	vc.setOrientation(goog.ui.Container.Orientation.VERTICAL);
	vc.render(goog.dom.getElement(usingDiv));
	this.baseDiv.style.width = 32;//hack
	//this.baseDiv.style.
    return vc;
};

/**
 * @inheritDoc
**/
dm.widgets.VerticalToolbar.prototype._onShowMenu = function()
{
	this._onRepaint();
	//orlolupaatelol..?^
	
	//toolbarEntries
	
	//this.baseDiv.style.left = ""+this.x+"px";
	//this.baseDiv.style.top = ""+this.y+"px";
	//^orlolreusegeneraltooblarlol...?!
	this.baseDiv.style.display = "block";//hack
};

/**
 * @inheritDoc
**/
dm.widgets.VerticalToolbar.prototype._onHideMenu = function()
{
	this.baseDiv.style.display = "none";//hack
};

/**
 * @inheritDoc
**/
dm.widgets.VerticalToolbar.prototype._onRepaint = function()
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
};

/**
 * @inheritDoc
**/
dm.widgets.VerticalToolbar.prototype._addMenuItem = function(menuItem)
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
		if (!dm.util.ReferenceUtil.isBadReferenceValue(generated))
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
				newButton.setChecked(true);
				return;
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
				var group = self.buttonGroups[useButtonGroup];
				for(var i=0; i<group.length; i++)
				{
					var b = group[i];
					b.setChecked(false);
				}
				newButton.setChecked(true);
			}
		}
		//self.raiseMenuActionEvent(menuItem, event);
		self.raiseMenuActionEvent(menuItem);
	};
	
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
	this.myToolbar.addChildAt(newButton, 0, true);
	//this.vc.addChildAt(newButton, 0, true);
	
	
	
	
	//this.myToolbar
	//myToolbar.addChildAt(newButton, 0, true);
};

/*
//debugViewObject(newButton);:
 [+]renderer_: [object Object]
          [+]classByState_: [object Object]
                   1: goog-toolbar-button-disabled
                   2: goog-toolbar-button-hover
                   4: goog-toolbar-button-active
                   8: goog-toolbar-button-selected
                   16: goog-toolbar-button-checked
                   32: goog-toolbar-button-focused
                   64: goog-toolbar-button-open
				   
*/
//TODO: ?=maybe auto-size me...?lol....???



/*goog.array.forEach(
        ['Athos', 'Porthos', 'Aramis', 'd\'Artagnan'],
        function(item) {
          var c = new goog.ui.Control(item);
          c.setId(item);
          // For demo purposes, have controls dispatch transition events.
          c.setDispatchTransitionEvents(goog.ui.Component.State.ALL, true);
          vc.addChild(c, true);
        });
	*/
    //vc.addChildAt(new goog.ui.Separator(), 3, true);
   // vc.getChild('Porthos').setEnabled(false);
    
/*
dm.widgets.VerticalToolbar.prototype._makeToolbarHelper = function(usingDiv, bVerticalToolbar)
{
	bVerticalToolbar = !!bVerticalToolbar;
	var orientation = bVerticalToolbar ? goog.ui.Container.Orientation.VERTICAL : goog.ui.Container.Orientation.HORIZONTAL;
	orientation = goog.ui.Container.Orientation.VERTICAL ;//HACK
	
	//goog.ui.Container.Orientation.HORIZONTAL, 
	var elem = usingDiv; //HACK
	
	var domHelper = goog.dom.getDomHelper(elem);
	//var toolbar = new (goog.ui.Toolbar)(goog.ui.ToolbarRenderer.getInstance(), goog.ui.Container.Orientation.HORIZONTAL, domHelper);
	//var toolbar = new (goog.ui.Toolbar)(
	var renderer = new goog.ui.ToolbarRenderer.getInstance();
	//renderer.set
	//renderer.setOrientation(orientation);
	var toolbar = new goog.ui.Toolbar(
				//goog.ui.ToolbarRenderer.getInstance(), 
				renderer,
				orientation,
				//goog.ui.Container.Orientation.HORIZONTAL, 
				domHelper
		);
	//var isRightToLeft = opt_isRightToLeft || goog.style.isRightToLeft(elem);
	//debugAlertOnce(toolbar.setOrientation);
	//debugAlertOnce(toolbar.render);
	//debugAlertOnce(toolbar.createDom);
	//debugAlertOnce(toolbar.renderer_.createDom);
	
	var isRightToLeft = goog.style.isRightToLeft(elem);
	toolbar.setRightToLeft(isRightToLeft);
	toolbar.setFocusable(false);		
	toolbar.setOrientation(orientation);
	toolbar.render(elem);	
	return toolbar;
	
	
};
*/

