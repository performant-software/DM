goog.provide('atb.viewer.SimpleMarkerEditor');

goog.require('atb.viewer.MarkerEditor');

goog.require("atb.widgets.MenuItem");
goog.require("atb.widgets.Toolbar");
goog.require("atb.widgets.MenuUtil");

goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugUtil");
goog.require("atb.widgets.MenuActionEvent");//HACK
goog.require("atb.widgets.IMenu");//HACK
goog.require("atb.widgets.VerticalToolbar");

/**
 * This class provides an implementation of a number of MarkerEditor features "controls" 
 *   as requested by the first milestone.
 *
 * These features are built atop the functionality provided by MarkerEditor.
 *
 * @param set_toolbarDiv - the div id to use as a toolbar
**/
atb.viewer.SimpleMarkerEditor = function(
	set_clientApp,
	opt_argument_radialMenuConfigs,
    opt_annoBodyId,
	opt_domHelper
){
	atb.viewer.MarkerEditor.call(this, set_clientApp, opt_domHelper);

        this.annoBodyId = opt_annoBodyId;

	//hack added based on resourceviewer:
	//end hack
	
	var toolbarDiv = this.createElement("div");
	jQuery(toolbarDiv).addClass("atb-markereditor-toolbar");
	
	this.toolbarDiv = toolbarDiv;
	this.keyUpHandlers = [];
	
	this.defaultStyles = [];//lolhack--new
	this.menus = [];
	this.contextMenuGenerators = [];
	
	//this.allCommands = [];
	this.allMenuItemsByName = {};//hack
    
    this.radialMenuConfigs = atb.util.ReferenceUtil.applyDefaultValue(opt_argument_radialMenuConfigs, []);
};

goog.inherits(atb.viewer.SimpleMarkerEditor, atb.viewer.MarkerEditor);

atb.viewer.SimpleMarkerEditor.prototype.render = function () {
    if (this.rootDiv != null)
        return;

    atb.viewer.MarkerEditor.prototype.render.call(this);
    
    this.initMenus();
	
	for(var i=0, l = this.radialMenuConfigs.length; i<l; i++)
	{
		var menuAugmentation = this.radialMenuConfigs[i];
		var menuName = menuAugmentation.menuName;
		var moreItems = menuAugmentation.items;
		var menu = this.menus[menuName];
		if (atb.util.ReferenceUtil.isBadReferenceValue(menu))
		{
			//alert(""+opt_argument_radialMenuConfigs);
			//debugViewObject(opt_argument_radialMenuConfigs);
			atb.debug.DebugUtil.debugAssertion(false, "can't augment unknown menu: '"+menuName+"'");
			//debugViewObject(opt_argument_radialMenuConfigs);
			
			continue;
		}
		
		menu.addItems(moreItems);
	}
};


atb.viewer.SimpleMarkerEditor.prototype.putMenu=function(menuName, menu)
{
	this.menus[menuName] = menu;
	return menu;
};

/**
 * creates my toolbar.
 *
 * this particular implementations will add several button types to it.
**/
atb.viewer.SimpleMarkerEditor.prototype.initMenus = function()
{
	var thisEditor = this;
	
	var div = this.toolbarDiv;
	
	var toolbar = new atb.widgets.Toolbar(
			div, 
			this.evaluateMenuItemDefsHelper(this.defaultPrimaryToolbarDefs)
		);
	toolbar.setContext(this);
	this.putMenu(
		atb.viewer.SimpleMarkerEditor.MenuNames.mnuToolbar,
		toolbar
	).show();
	
    var domHelper = this.getCurrentPanelContainer().getDomHelper();
    this.popupDiv = domHelper.createElement('div');
	jQuery(this.popupDiv).addClass("atb-ui-viewer-simplemarkereditor-popupdiv");
    domHelper.getDocument().body.appendChild(this.popupDiv);
	
	var self = this;
	
	this.contextMenuGenerators[atb.viewer.SimpleMarkerEditor.MenuNames.mnuTestContextMenu] = 
		function (tag) {
			return new atb.widgets.Toolbar(
				tag,
				self.evaluateMenuItemDefsHelper(self.defaultTestMenuDefs)
            );
		};
	
	
};

atb.viewer.SimpleMarkerEditor.prototype.createContextMenu = function (menuName, tag) {
	var menuGenerator = this.contextMenuGenerators[menuName];
	return menuGenerator(tag);
};
	

atb.viewer.SimpleMarkerEditor.prototype.undo = function()
{
	atb.viewer.MarkerEditor.prototype.undo.call(this);
	this.resetCurrentTool();
};


atb.viewer.SimpleMarkerEditor.prototype.redo = function()
{
	atb.viewer.MarkerEditor.prototype.redo.call(this);
	this.resetCurrentTool();
};


atb.viewer.SimpleMarkerEditor.prototype.evaluateMenuItemDefsHelper = function(itemDefs)
{
	/*
	name: "drawPoint",
			tooltip: "Draw Point",
			icon: "atb-markereditor-button atb-markereditor-button-addpoint",
			group: myToolGroup,
			action: function(actionEvent)
	*/
	var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	var thisEditor = this;
	
	var ret = [];
	for(var i = 0, l = itemDefs.length;  i < l;  i++)
	{
		var itemDef = itemDefs[i];
		
		var itemName = itemDef.name;
		var itemDivGenerator = createButtonGenerator(itemDef.icon);
		
		var itemActionGenerator = function(handler)
		{
			return function(actionEvent)
			{//this allows us to invoke the method in the scope of this simplemarkereditor:(which allows defs to be more of a initializer value...!
				return handler.call(thisEditor, actionEvent);
			};
		};
		var itemAction =itemActionGenerator(itemDef.action);
		var itemGroup = atb.util.ReferenceUtil.applyDefaultValue(itemDef.group, null);
		var itemTooltip = atb.util.ReferenceUtil.applyDefaultValue(itemDef.tooltip, null);
                var bEnabled = atb.util.ReferenceUtil.applyDefaultValue(itemDef.bEnabled, null);
		
		var menuItem;
		//atb.debug.DebugUtil.debugAssertion(atb.util.ReferenceUtil.isBadReferenceValue(this.allMenuItemsByName[itemName]), "menuItem with itemName already existed in this viewer! itemName= '"+itemName+"'");
		//^lol
		var customOptions = {};//hack
		//customOptions["bToggleButtonHack"]= atb.util.LangUtil.forceBoolean(itemDefs["bToggleButtonHack"],false);//HACK
		customOptions["bToggleButtonHack"]= atb.util.LangUtil.forceBoolean(itemDef["bToggleButtonHack"],false);//HACK
		//false;
		//if (
		//bToggleButtonHack
		
		menuItem = new atb.widgets.MenuItem(
			itemName,
			itemDivGenerator,
			itemAction,
			itemTooltip,
			itemGroup,
                        bEnabled,
			customOptions
		);
		
		//lol...whatofduplicates...??
		//this.allMenuItemsByName[itemName] = menuItem;
		var arr = atb.util.ReferenceUtil.applyDefaultValue(this.allMenuItemsByName[itemName], []);
		arr.push(menuItem);
		//= menuItem;
		this.allMenuItemsByName[itemName] = arr;
		//^lolduiplicatfixedlol...?
		
		ret.push(menuItem);
	}
	return ret;
};

/**
 * restores the "hand" tool, IE, revert to dragging the map
**/
atb.viewer.SimpleMarkerEditor.prototype.onHandTool = function ()
{
	this.deactivateCurrentTool();
};


atb.viewer.SimpleMarkerEditor.MenuNames = 
{
	mnuToolbar: "toolbarMenu",
	mnuTestContextMenu: "testMenu"
};


atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup = "mainToolGroup";

atb.viewer.SimpleMarkerEditor.standardToolsDefinitions = 
{
	handTool: 
		{
			// Create a "restore hand tool" button
			name: 'handTool', 
			tooltip: 'Mouse Pan', 
			icon: 'atb-markereditor-button atb-markereditor-button-pan',
			group: atb.viewer.SimpleMarkerEditor.defaultPrimaryToolbarToolGroup,
			action: function( actionEvent )
			{
				this.onHandTool();
			}
		},
	undoCommand: 
		{
			//- Undo
			name: 'undo', 
			tooltip: 'Undo', 
			icon: 'atb-markereditor-button atb-markereditor-button-undo',
			group: null,
			action: function( actionEvent )
			{
				this.undo();
				/*
				this.undo();
				this.resetCurrentTool();
				*/
			},
			keyUpMatch: function(keyEvent)
			{
				//var bCtrlDown = keyEvent.
				var kc = keyEvent.keyCode;
				var bCtrlDown = (keyEvent.ctrlKey===true);
				return (bCtrlDown && (kc == 90));//ctrl+z
			}
		},
		
	redoCommand:
		{
			//- Redo
			name: 'redo', 
			tooltip: 'Redo', 
			icon: 'atb-markereditor-button atb-markereditor-button-redo',
			group: null,
			action: function (actionEvent)
			{
				/*
				this.redo();
				this.resetCurrentTool();
				*/
				this.redo();
			},
			//keyBinding: function(keyEvent)
			keyUpMatch: function(keyEvent)
			{
				//var bCtrlDown = keyEvent.
				var kc = keyEvent.keyCode;
				var bCtrlDown = (keyEvent.ctrlKey===true);
				return (bCtrlDown && (kc == 89));//ctrl+y
			}
		},
		
			
	closePopupAndDeslect: 
		{
			name: "closePopupAndDeselect",
			icon: "atb-markereditor-button atb-markereditor-button-save",
			action: function(actionEvent)
			{
				this.dismissMenu(actionEvent.getMenu());
				this.clearSelection();
			}
		}
};

atb.viewer.SimpleMarkerEditor.prototype.defaultPrimaryToolbarDefs = [
	atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.handTool
];

atb.viewer.SimpleMarkerEditor.prototype.defaultTestMenuDefs = [
	atb.viewer.SimpleMarkerEditor.standardToolsDefinitions.closePopupAndDeslect
];




/*
//Q: is this still even unfixed...???

//unfixed error: (unsure of exactly whats causing it, seems to maybe be related to modifying via undo/redo the selection when editting...?)
Error: feature.layer is null
Source File: http://localhost/Drew/work/anno/anno/js/openlayers/OpenLayers.js
Line: 1829
*/

///////////////TODOS://///////////
//TODO: double-click to edit stuff...?
//TODO: a "complete shape" button for mobile editors-ie stuff like the nook color?
//we'll use a selection layer, so we can (hopefully) select the thing to delete...
	//Q: would a simple del key be better in conjunction with the edit commands...?
	//KB commands...???
//TODO: add a way to show which tool is "focused"...?
	//TODO: sepreate markers and points and stuff into a has-a relationship...
	//also have point-handles around for editability, not so much as for rendering per se,
	//also use style updates...lol...??
	//TODO:?=add an updateme mod...?
	//TODO: maybe autosave undo point...??lol...

	//Q: why do we set queryable on the buttons???[//what does it do??]
	
    //TODO: maybe pass these in as data at some point...???
	//or lol update hover text...??

	/*
TODO: add these command buttons:
 - Draw point
 - Draw polygon
 - Draw polygon
 - Delete marker
 - Edit marker 
 - Save
 - Undo
 - Redo
*/
/**
Images from:
[http://www.limitstate.com/geo-manual/opening_and_saving_projects.html#x28-243000]
[http://www.limitstate.com/geo-manual/specifying_problem_geometry.html]
NOTE: we probably can't actually use these, but...
**/
//TODO: clear selection (deselect) on undo/redo, if the selected is destroyed...but do we reselect if its re-created???
//More stuff todo...???
//Modified flags...?toolbar state?
//clearselection,oldselection...lol...?
//Edit marker styling/coloring modifications/etc...???
//TODO: kb controls...etc...?
//LOL selection bug...?

/*
	this.defaultButton.setChecked(true);
	this.onHandTool();//lol!
	*/
atb.viewer.SimpleMarkerEditor.prototype.getMenuItemsByName= function(itemName, opt_bAutoCreate)
{
	var arr = atb.util.ReferenceUtil.applyDefaultValue(this.allMenuItemsByName[itemName], null);
	opt_bAutoCreate = atb.util.ReferenceUtil.applyDefaultValue(opt_bAutoCreate, false);
	//ololbcreate:
	if (opt_bAutoCreate)
	{
		if (arr==null)
		{
			arr=[];
			this.allMenuItemsByName[itemName] = arr;//lolhack!
		}
	}
	return arr;
};

//atb.viewer.StandardSimpleMarkerEditor.prototype.onUndoStackChanged = function()
atb.viewer.SimpleMarkerEditor.prototype.onUndoStackChanged = function()
{
	//allMenuItemsByName
	var menuItems = null;
	var bSetEnabledTo = false;
	
	//menuItems = this.getMenuItemsByName("undo", false);
	var findTheseNames = ["undo", "redo"];
	var useTheseValues = [this.canUndo(), this.canRedo()];
	//^orlolcaptions...lolz...??
	//TODO: ?= setcaptions../..lol..?
	
	for(var j=0, lenj = findTheseNames.length; j<lenj; j++)
	{
		//menuItems = this.getMenuItemsByName(findMenuItemNames[j], false);
		menuItems = this.getMenuItemsByName(findTheseNames[j], false);
		//var useValue = useTheseValues[j];//lolhack!
		var useValue = !!useTheseValues[j];//lolhack!
		if (menuItems !== null)
		{
			for(var i=0, l = menuItems.length; i<l; i++)
			{
				var menuItem = menuItems[i];
				menuItem.setEnabled(useValue);//lol!
				//getMenuItemsByName
			}
		}
	}
};

atb.viewer.SimpleMarkerEditor.prototype.handleKeyUp = function(keyEvent)
{
	var ret = true;//unhandled event
	
	//for(var i=0, l = this.keyHandlers.length; i<l; i++)
	//keyUpHandlers
	for(var i=0, l = this.keyUpHandlers.length; i<l; i++)
	{
		//var kh = this.keyHandlers[i];
		var kh = this.keyUpHandlers[i];
		if (kh.test(keyEvent))
		{
			//kh.invoke(keyEvent);
			//kh.invoke.call(this, keyEvent);
			//debugViewObject(this);
			//kh.invoke.call(this, keyEvent);
			kh.invoke.call(this, keyEvent);
			ret=false;
			break;
		}
	}
	return ret;
};

//atb.viewer.SimpleMarkerEditor.prototype.registerKeyHandler=function(filterFunc, actionFunc)
atb.viewer.SimpleMarkerEditor.prototype.registerKeyUpHandler=function(filterFunc, actionFunc)
{
	var entry = 
	{
		test: filterFunc,
		invoke: actionFunc
	};
	//this.keyHandlers.push(entry);//lol!
	this.keyUpHandlers.push(entry);
};

//atb.viewer.SimpleMarkerEditor.prototype.registerKeyHandlerFromDef=function(itemDef)
atb.viewer.SimpleMarkerEditor.prototype.registerKeyUpHandlerFromDef=function(itemDef)
{//^Hack
	//keyUpMatch: function(keyEvent)
	//action: function( actionEvent )
	var rawActionHandler = itemDef.action;
	var rawFilterFunc = atb.util.ReferenceUtil.applyDefaultValue(itemDef.keyUpMatch, null);
	if (rawFilterFunc == null)
	{
		rawFilterFunc = function(){return true;};//hack
	}
	//var dummyMenu = new IMenu();//lolhack!
	var dummyMenu = new atb.widgets.IMenu();//lolhack!
	var menuItem = this.evaluateMenuItemDefsHelper([itemDef])[0];//lolhack!
		
	//^orlolfalse...???
	var actionAdapter = function(keyEvent)
	{
		var actionEvent = new atb.widgets.MenuActionEvent(dummyMenu, menuItem, keyEvent);
		//rawActionHandler(actionEvent);//lolhack!
		rawActionHandler.call(this, actionEvent);//lolhack!
		//menuItem.
		//{
		//}
		//);//new M
	};
	//lolkeyuplol..?
	//this.registerKeyHandler(
	this.registerKeyUpHandler(rawFilterFunc, actionAdapter);//lol!
};

atb.viewer.SimpleMarkerEditor.prototype.renderHelper = function(parentDiv)
{
	//HACK:
	//createElement_
	//var fakeToolbarParent = document.createElement("div");
	
	//Hack:
	if (this.mapDiv === null)
	{
		throw new Error("null mapdiv!");
	}
	var jqMapDiv = jQuery(this.mapDiv);
	jqMapDiv.addClass("atb-markereditor-pane");
	
	
	var fakeToolbarParent = this.createElement("div");//createElement_("div");
	jQuery(fakeToolbarParent).addClass("atb-markereditor-base-div");
	fakeToolbarParent.appendChild(this.toolbarDiv);
	
	//parentDiv.appendChild(this.toolbarDiv);
	parentDiv.appendChild(fakeToolbarParent);
	//atb.viewer.SimpleMarkerEditor.prototype.call(this, parentDiv);
	//atb.viewer.MarkerEditor.prototype.call(this, parentDiv);
	
	//todo:onlydooncelol..?
	jQuery(parentDiv).addClass("atb-markereditor-root-div");
	atb.viewer.MarkerEditor.prototype.renderHelper.call(this, parentDiv);
	//parentDiv.appendChild(this.mapDiv);
};
