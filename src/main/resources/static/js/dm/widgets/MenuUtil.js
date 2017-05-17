goog.provide("dm.widgets.MenuUtil");

/**
 * @fileoverview Various utility functions for working with menu/toolbar/etc classes.
 *
 * @author John O'Meara
**/

goog.require("dm.util.ReferenceUtil");
goog.require('goog.asserts');
goog.require("dm.widgets.MenuItem");
goog.require("dm.util.LangUtil");

/**
 * a helper function to generate a dom-generator for "styled" menu buttons:
 * @param {string} divStyleClass The button style to apply to the dom elements.
 * @return {function(dm.widgets.MenuItem, ?HTMLElement=): HTMLElement}
**/
//dm.widgets.MenuUtil.createDefaultDomGenerator = function(divStyleClass)
//dm.widgets.MenuUtil.createDefaultDomGenerator = dm.widgets.MenuUtil.createAddStyleGeneratorGenerator;

dm.widgets.MenuUtil.createAddStyleGeneratorGenerator = function(divStyleClass)
{
	/**
	 * @param {dm.widgets.MenuItem} menuItem The menuItem.
	 * @param {HtmlElement=} opt_div An optional div to modify, possibly instead of the source div.
	 * @return {HtmlElement} The result of this generator invocation.
	**/
	return function(menuItem, opt_div)
	{
		if (dm.util.ReferenceUtil.isBadReferenceValue(opt_div))
		{
			opt_div = document.createElement("div");
		}
		jQuery(opt_div).addClass(divStyleClass);
		return opt_div;
	};
};

dm.widgets.MenuUtil.createDefaultDomGenerator = dm.widgets.MenuUtil.createAddStyleGeneratorGenerator;



dm.widgets.MenuUtil.createAddContentGeneratorGenerator = function(divContent)
{
	/**
	 * @param {dm.widgets.MenuItem} menuItem The menuItem.
	 * @param {HtmlElement=} opt_div An optional div to modify, possibly instead of the source div.
	 * @return {HtmlElement} The result of this generator invocation.
	**/
	return function(menuItem, opt_div)
	{
		if (dm.util.ReferenceUtil.isBadReferenceValue(opt_div))
		{
			opt_div = document.createElement("div");
		}
		//jQuery(opt_div).addClass(divStyleClass);
		opt_div.innerHTML = divContent;
		return opt_div;
	};
};

dm.widgets.MenuUtil.doNothingDomGenerator = function(menuItem, opt_div)
{
	if (dm.util.ReferenceUtil.isBadReferenceValue(opt_div))
	{
		opt_div = document.createElement("div");
	}
	return opt_div;
};

//dm.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator = function()//visualInfo)
dm.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator = function(visualInfo)
{
	//return function(visualInfo)
	//{
		var addStyleGenerator = dm.widgets.MenuUtil.doNothingDomGenerator;
		if (!dm.util.ReferenceUtil.isBadReferenceValue(visualInfo.icon))
		{
			//debugPrint("stylegen");
			addStyleGenerator = dm.widgets.MenuUtil.createAddStyleGeneratorGenerator(visualInfo.icon);
		}
		else
		{
			//debugPrint("NO stylegen");
		}
		var addContentGenerator = dm.widgets.MenuUtil.doNothingDomGenerator;
		if (!dm.util.ReferenceUtil.isBadReferenceValue(visualInfo.content))
		{
			//debugPrint("contentgen");
			addContentGenerator = dm.widgets.MenuUtil.createAddContentGeneratorGenerator(visualInfo.content);
		}
		else
		{
			//debugPrint("NO contentgen");
		}
		
		var retGenerator = dm.widgets.MenuUtil.concatDomGenerators(
			addStyleGenerator,
			addContentGenerator
		);
		return retGenerator;
		//return function
	//};
	//dm.widgets.MenuUtil.createAddStyleGeneratorGenerator(visualInfo.icon);
	//dm.widgets.MenuUtil.concatDomGenerators
};


//copied from panelcontainer:
//dm.widgets.MenuItem.prototype.decodeMenuItem = function(menuItemDef, opt_menuItemDefDefaults, opt_customDomGenerator)
dm.widgets.MenuUtil.decodeMenuItem = function(menuItemDef, opt_menuItemDefDefaults, opt_customDomGeneratorGenerator)
{
	
	if (menuItemDef instanceof dm.widgets.MenuItem)
	{
		return menuItemDef; //already a menuitem (Q: do we want to somehow 'copy' it...???)
	}
	
	var domGeneratorGenerator = dm.util.ReferenceUtil.applyDefaultValue(
		opt_customDomGeneratorGenerator,
		dm.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator//createDefaultVisualInfoDomGeneratorGenerator	//dm.widgets.MenuUtil.createDefaultDomGenerator
	);
	
	opt_menuItemDefDefaults = dm.util.ReferenceUtil.applyDefaultValue(opt_menuItemDefDefaults, null);
	if (opt_menuItemDefDefaults !== null)
	{
		menuItemDef = dm.util.ReferenceUtil.mergeOptions(menuItemDef, opt_menuItemDefDefaults);
	}
	
	////var bEnabled = dm.util.ReferenceUtil.applyDefaultValue(menuItemDef, true);
	var bEnabled = dm.util.ReferenceUtil.applyDefaultValue(menuItemDef.bEnabled, true);
	var tooltip = dm.util.ReferenceUtil.applyDefaultValue(menuItemDef.tooltip, null);
	var buttonGroup = dm.util.ReferenceUtil.applyDefaultValue(menuItemDef.buttonGroup, null);
	var actionHandler = dm.util.ReferenceUtil.applyDefaultValue(
		menuItemDef.action, 
		dm.util.ReferenceUtil.applyDefaultValue(
			menuItemDef.actionHandler, 
			null
		)
	);
	var custom_options = dm.util.ReferenceUtil.applyDefaultValue(menuItemDef.custom, null);
	
	goog.asserts.assert(actionHandler!=null, "[dm.widgets.MenuUtil.decodeMenuItem]: null actionhandler for menuitemdef! name="+menuItemDef.name);
	
	var visualInfo =  dm.util.ReferenceUtil.applyDefaultValue(menuItemDef.visual, null);
	if (visualInfo === null)
	{
		if (!dm.util.ReferenceUtil.isBadReferenceValue(menuItemDef.icon))
		{
			visualInfo = {
				//content: null,//caption: null,
				icon: menuItemDef.icon
			};
		}
	}
	visualInfo = dm.util.ReferenceUtil.mergeOptions(
		visualInfo, 
		{
			icon: null,
			//caption: null
			content: null
		}
	);
	//alert(""+domGeneratorGenerator(visualInfo));
	//debugViewObject(visualInfo);//icon:null,content:"cancel";//lolok,..?!
	var domGenerator = domGeneratorGenerator(visualInfo);
	//alert(""+domGenerator);
	//custom_options
	//var custom_options = dm.util.ReferenceUtil.applyDefaultValue(,null);
	//{});
	var ret = new dm.widgets.MenuItem(
		menuItemDef.name,
		//domGeneratorGenerator(menuItemDef.icon),
		domGenerator,//domGeneratorGenerator(visualInfo),
		actionHandler,
		tooltip,
		buttonGroup,
		bEnabled,
		custom_options
	);
	return ret;
};

/*
dm.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(addStyle, currentDomGeneratorGenerator)
{
	//var usingTheDomGeneratorGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;
	//"atb-panelcontainer-button";
	
	var alsoAddStyle = addStyle;
	//we can cache this generator here, no need to generate one for every call to the returned generator-generator:
	var styleFuncA = dm.widgets.MenuUtil.createDefaultDomGenerator;
	
	
	//usingTheDomGeneratorGenerator(alsoAddStyle);
	
	var domGeneratorGenerator =function(defaultStyle)
	{
		//since we can't make assumptions about the returned generator, we need to be cautious and generate it once per-generator generation:
		var styleFuncB = currentDomGeneratorGenerator(defaultStyle);
		
		//return the generator which uses the two generator functions:
		return function(menuItem, opt_div)
		{
			opt_div = styleFuncA(menuItem, opt_div);
			opt_div = styleFuncB(menuItem, opt_div);
			return opt_div;
		};
	};
	return domGeneratorGenerator;
};
*/

//dm.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond)
//lolmore general-ish... maybe we could add the ability to precache a generator...?
/*
//this probably wants to be named more generally if we want it:...?
dm.widgets.MenuUtil.createCachedDomGeneratorGenerator = function(domGeneratorFunc)
{
	return function(unused_args)
	{
		return domGeneratorFunc;
	};
};
*/

//dm.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
//dm.widgets.MenuUtil.catDomGeneratorGenerators = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
dm.widgets.MenuUtil.concatDomGeneratorGenerators = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
{
	//var domGeneratorGenerator =function(argsFirst, argsSecond)
	var bCopyArgsFirstToArgsSecond = dm.util.ReferenceUtil.applyDefaultValue(opt_bCopyArgsFirstToArgsSecond, true);//by default, behave like a single generator-generator!
	bCopyArgsFirstToArgsSecond = !!bCopyArgsFirstToArgsSecond;
	
	return function(argsFirst, argsSecond)
	{
		//alert(""+argsFirst);
		argsFirst = dm.util.ReferenceUtil.applyDefaultValue(argsFirst, []);//hack
		
		if (bCopyArgsFirstToArgsSecond)
		{
			//copy only if we didn't pass in second args anyways (or should we warn in that case...?)
			argsSecond = dm.util.ReferenceUtil.applyDefaultValue(argsSecond, argsFirst);
		}
		//since we can't make assumptions about the returned generator, we need to be cautious and generate it once per-generator generation:
		var styleFuncFirst = domGeneratorGeneratorFirst.apply(this, argsFirst);
		var styleFuncSecond = domGeneratorGeneratorSecond.apply(this, argsSecond);
		
		//return the generator which uses the two generator functions:
		/*
		return function(menuItem, opt_div)
		{
			opt_div = styleFuncFirst(menuItem, opt_div);
			opt_div = styleFuncSecond(menuItem, opt_div);
			return opt_div;
		};*/
		return dm.widgets.MenuUtil.concatDomGenerators(
			styleFuncFirst,
			styleFuncSecond
		);
	};
	//return domGeneratorGenerator;
};

dm.widgets.MenuUtil.concatDomGenerators = function(domGeneratorFirst, domGeneratorSecond)
{
	return function(menuItem, opt_div)
	{
		opt_div = domGeneratorFirst(menuItem, opt_div);
		opt_div = domGeneratorSecond(menuItem, opt_div);
		
		//opt_div = styleFuncFirst(menuItem, opt_div);
		//opt_div = styleFuncSecond(menuItem, opt_div);
		return opt_div;
	};
};
//{

/*
dm.widgets.MenuUtil.decodeMenuItems = function(menuItemDefsArray)
{
	var ret = [];
	for(var i=0, l=menuItemDefsArray.length; i<l; i++)
	{
		ret.push(dm.widgets.MenuUtil.decodeMenuItem(menuItemDefsArray[i]));
	}
	return ret;
};
*/

//dm.util.LangUtil.callForEachOrSingular
dm.widgets.MenuUtil.decodeMenuItems = function(menuItemDefsArray)
{
	//return dm.util.LangUtil.callForEachOrSingular(dm.widgets.MenuUtil, dm.widgets.MenuUtil.decodeMenuItem, menuItemDefsArray);
	
	//lol this:
	return dm.util.LangUtil.callForEachOrSingular(this, dm.widgets.MenuUtil.decodeMenuItem, menuItemDefsArray, dm.util.LangUtil.ALWAYS_RETURN_AN_ARRAY);
	//^always want to return an array, since caller most likely should expect it from the(this) function/method name!
};


	/*
	var ret = [];
	for(var i=0, l=menuItemDefsArray.length; i<l; i++)
	{
		ret.push(dm.widgets.MenuUtil.decodeMenuItem(menuItemDefsArray[i]));
	}
	return ret;
	*/
	//lolnull..?
//};
//multicall...?callforeachand return all...?
//dm.widgets.MenuUtil.decodeMenuItems 
/*
var usingTheDomGeneratorGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;
	
	var alsoAddStyle = "atb-panelcontainer-button";
	var styleFuncA = usingTheDomGeneratorGenerator(alsoAddStyle);
	
	var domGeneratorGenerator =function(defaultStyle)
	{
		var styleFuncB = usingTheDomGeneratorGenerator(defaultStyle);
		return function(menuItem, opt_div)
		{
			opt_div = styleFuncA(menuItem, opt_div);
			opt_div = styleFuncB(menuItem, opt_div);
			return opt_div;
		};
	};
	
*/
/*
var buttonDiv =document.createElement("div");// buttonTag;//HACK...lol!
		//debugPrint("!!2");
		var domGenerator = menuItem.getDomGenerator();
		var resultDiv = domGenerator(menuItem, buttonDiv);
		if (
			(!dm.util.ReferenceUtil.isBadReferenceValue(resultDiv)) &&
			(resultDiv !== buttonDiv) &&
			(resultDiv.parentNode === null)//!== buttonDiv)
		){
			buttonDiv.appendChild(resultDiv);
		}
		
		*/
//dm.widgets.MenuUtil.handleDomGeneratorProperly = function(givenDiv, givenGenerator)
dm.widgets.MenuUtil.handleDomGeneratorProperly = function(givenMenuItem, opt_givenDiv)
{
	var givenDiv = dm.util.ReferenceUtil.applyDefaultValue(opt_givenDiv, null);
	if (givenDiv === null)
	{
		givenDiv = document.createElement("div");
		// buttonTag;//HACK...lol!
	}
	//var buttonDiv =document.createElement("div");// buttonTag;//HACK...lol!
	//debugPrint("!!2");
	//dm.util.ReferenceUtil.applyDefaultValue(
	
	//var domGenerator = menuItem.getDomGenerator();
	var domGenerator = givenMenuItem.getDomGenerator();
	var resultDiv; 
	
	resultDiv = domGenerator(givenMenuItem, givenDiv);
	
	if (
		(!dm.util.ReferenceUtil.isBadReferenceValue(resultDiv)) &&
		(resultDiv !== givenDiv) &&
		(resultDiv.parentNode === null)
	){
		givenDiv.appendChild(resultDiv);
	}
	
	return givenDiv;
};