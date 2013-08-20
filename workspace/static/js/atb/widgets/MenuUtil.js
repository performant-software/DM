goog.provide("atb.widgets.MenuUtil");

/**
 * @fileoverview Various utility functions for working with menu/toolbar/etc classes.
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");
goog.require('goog.asserts');
goog.require("atb.widgets.MenuItem");
goog.require("atb.util.LangUtil");

/**
 * a helper function to generate a dom-generator for "styled" menu buttons:
 * @param {string} divStyleClass The button style to apply to the dom elements.
 * @return {function(atb.widgets.MenuItem, ?HTMLElement=): HTMLElement}
**/
//atb.widgets.MenuUtil.createDefaultDomGenerator = function(divStyleClass)
//atb.widgets.MenuUtil.createDefaultDomGenerator = atb.widgets.MenuUtil.createAddStyleGeneratorGenerator;

atb.widgets.MenuUtil.createAddStyleGeneratorGenerator = function(divStyleClass)
{
	/**
	 * @param {atb.widgets.MenuItem} menuItem The menuItem.
	 * @param {HtmlElement=} opt_div An optional div to modify, possibly instead of the source div.
	 * @return {HtmlElement} The result of this generator invocation.
	**/
	return function(menuItem, opt_div)
	{
		if (atb.util.ReferenceUtil.isBadReferenceValue(opt_div))
		{
			opt_div = document.createElement("div");
		}
		jQuery(opt_div).addClass(divStyleClass);
		return opt_div;
	};
};

atb.widgets.MenuUtil.createDefaultDomGenerator = atb.widgets.MenuUtil.createAddStyleGeneratorGenerator;



atb.widgets.MenuUtil.createAddContentGeneratorGenerator = function(divContent)
{
	/**
	 * @param {atb.widgets.MenuItem} menuItem The menuItem.
	 * @param {HtmlElement=} opt_div An optional div to modify, possibly instead of the source div.
	 * @return {HtmlElement} The result of this generator invocation.
	**/
	return function(menuItem, opt_div)
	{
		if (atb.util.ReferenceUtil.isBadReferenceValue(opt_div))
		{
			opt_div = document.createElement("div");
		}
		//jQuery(opt_div).addClass(divStyleClass);
		opt_div.innerHTML = divContent;
		return opt_div;
	};
};

atb.widgets.MenuUtil.doNothingDomGenerator = function(menuItem, opt_div)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(opt_div))
	{
		opt_div = document.createElement("div");
	}
	return opt_div;
};

//atb.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator = function()//visualInfo)
atb.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator = function(visualInfo)
{
	//return function(visualInfo)
	//{
		var addStyleGenerator = atb.widgets.MenuUtil.doNothingDomGenerator;
		if (!atb.util.ReferenceUtil.isBadReferenceValue(visualInfo.icon))
		{
			//debugPrint("stylegen");
			addStyleGenerator = atb.widgets.MenuUtil.createAddStyleGeneratorGenerator(visualInfo.icon);
		}
		else
		{
			//debugPrint("NO stylegen");
		}
		var addContentGenerator = atb.widgets.MenuUtil.doNothingDomGenerator;
		if (!atb.util.ReferenceUtil.isBadReferenceValue(visualInfo.content))
		{
			//debugPrint("contentgen");
			addContentGenerator = atb.widgets.MenuUtil.createAddContentGeneratorGenerator(visualInfo.content);
		}
		else
		{
			//debugPrint("NO contentgen");
		}
		
		var retGenerator = atb.widgets.MenuUtil.concatDomGenerators(
			addStyleGenerator,
			addContentGenerator
		);
		return retGenerator;
		//return function
	//};
	//atb.widgets.MenuUtil.createAddStyleGeneratorGenerator(visualInfo.icon);
	//atb.widgets.MenuUtil.concatDomGenerators
};


//copied from panelcontainer:
//atb.widgets.MenuItem.prototype.decodeMenuItem = function(menuItemDef, opt_menuItemDefDefaults, opt_customDomGenerator)
atb.widgets.MenuUtil.decodeMenuItem = function(menuItemDef, opt_menuItemDefDefaults, opt_customDomGeneratorGenerator)
{
	
	if (menuItemDef instanceof atb.widgets.MenuItem)
	{
		return menuItemDef; //already a menuitem (Q: do we want to somehow 'copy' it...???)
	}
	
	var domGeneratorGenerator = atb.util.ReferenceUtil.applyDefaultValue(
		opt_customDomGeneratorGenerator,
		atb.widgets.MenuUtil.createDefaultVisualInfoDomGeneratorGenerator//createDefaultVisualInfoDomGeneratorGenerator	//atb.widgets.MenuUtil.createDefaultDomGenerator
	);
	
	opt_menuItemDefDefaults = atb.util.ReferenceUtil.applyDefaultValue(opt_menuItemDefDefaults, null);
	if (opt_menuItemDefDefaults !== null)
	{
		menuItemDef = atb.util.ReferenceUtil.mergeOptions(menuItemDef, opt_menuItemDefDefaults);
	}
	
	////var bEnabled = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef, true);
	var bEnabled = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.bEnabled, true);
	var tooltip = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.tooltip, null);
	var buttonGroup = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.buttonGroup, null);
	var actionHandler = atb.util.ReferenceUtil.applyDefaultValue(
		menuItemDef.action, 
		atb.util.ReferenceUtil.applyDefaultValue(
			menuItemDef.actionHandler, 
			null
		)
	);
	var custom_options = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.custom, null);
	
	goog.asserts.assert(actionHandler!=null, "[atb.widgets.MenuUtil.decodeMenuItem]: null actionhandler for menuitemdef! name="+menuItemDef.name);
	
	var visualInfo =  atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.visual, null);
	if (visualInfo === null)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(menuItemDef.icon))
		{
			visualInfo = {
				//content: null,//caption: null,
				icon: menuItemDef.icon
			};
		}
	}
	visualInfo = atb.util.ReferenceUtil.mergeOptions(
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
	//var custom_options = atb.util.ReferenceUtil.applyDefaultValue(,null);
	//{});
	var ret = new atb.widgets.MenuItem(
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
atb.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(addStyle, currentDomGeneratorGenerator)
{
	//var usingTheDomGeneratorGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	//"atb-panelcontainer-button";
	
	var alsoAddStyle = addStyle;
	//we can cache this generator here, no need to generate one for every call to the returned generator-generator:
	var styleFuncA = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	
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

//atb.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond)
//lolmore general-ish... maybe we could add the ability to precache a generator...?
/*
//this probably wants to be named more generally if we want it:...?
atb.widgets.MenuUtil.createCachedDomGeneratorGenerator = function(domGeneratorFunc)
{
	return function(unused_args)
	{
		return domGeneratorFunc;
	};
};
*/

//atb.widgets.MenuUtil.appendAnotherStyleToDomGeneratorGenerator = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
//atb.widgets.MenuUtil.catDomGeneratorGenerators = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
atb.widgets.MenuUtil.concatDomGeneratorGenerators = function(domGeneratorGeneratorFirst, domGeneratorGeneratorSecond, opt_bCopyArgsFirstToArgsSecond)
{
	//var domGeneratorGenerator =function(argsFirst, argsSecond)
	var bCopyArgsFirstToArgsSecond = atb.util.ReferenceUtil.applyDefaultValue(opt_bCopyArgsFirstToArgsSecond, true);//by default, behave like a single generator-generator!
	bCopyArgsFirstToArgsSecond = !!bCopyArgsFirstToArgsSecond;
	
	return function(argsFirst, argsSecond)
	{
		//alert(""+argsFirst);
		argsFirst = atb.util.ReferenceUtil.applyDefaultValue(argsFirst, []);//hack
		
		if (bCopyArgsFirstToArgsSecond)
		{
			//copy only if we didn't pass in second args anyways (or should we warn in that case...?)
			argsSecond = atb.util.ReferenceUtil.applyDefaultValue(argsSecond, argsFirst);
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
		return atb.widgets.MenuUtil.concatDomGenerators(
			styleFuncFirst,
			styleFuncSecond
		);
	};
	//return domGeneratorGenerator;
};

atb.widgets.MenuUtil.concatDomGenerators = function(domGeneratorFirst, domGeneratorSecond)
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
atb.widgets.MenuUtil.decodeMenuItems = function(menuItemDefsArray)
{
	var ret = [];
	for(var i=0, l=menuItemDefsArray.length; i<l; i++)
	{
		ret.push(atb.widgets.MenuUtil.decodeMenuItem(menuItemDefsArray[i]));
	}
	return ret;
};
*/

//atb.util.LangUtil.callForEachOrSingular
atb.widgets.MenuUtil.decodeMenuItems = function(menuItemDefsArray)
{
	//return atb.util.LangUtil.callForEachOrSingular(atb.widgets.MenuUtil, atb.widgets.MenuUtil.decodeMenuItem, menuItemDefsArray);
	
	//lol this:
	return atb.util.LangUtil.callForEachOrSingular(this, atb.widgets.MenuUtil.decodeMenuItem, menuItemDefsArray, atb.util.LangUtil.ALWAYS_RETURN_AN_ARRAY);
	//^always want to return an array, since caller most likely should expect it from the(this) function/method name!
};


	/*
	var ret = [];
	for(var i=0, l=menuItemDefsArray.length; i<l; i++)
	{
		ret.push(atb.widgets.MenuUtil.decodeMenuItem(menuItemDefsArray[i]));
	}
	return ret;
	*/
	//lolnull..?
//};
//multicall...?callforeachand return all...?
//atb.widgets.MenuUtil.decodeMenuItems 
/*
var usingTheDomGeneratorGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
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
			(!atb.util.ReferenceUtil.isBadReferenceValue(resultDiv)) &&
			(resultDiv !== buttonDiv) &&
			(resultDiv.parentNode === null)//!== buttonDiv)
		){
			buttonDiv.appendChild(resultDiv);
		}
		
		*/
//atb.widgets.MenuUtil.handleDomGeneratorProperly = function(givenDiv, givenGenerator)
atb.widgets.MenuUtil.handleDomGeneratorProperly = function(givenMenuItem, opt_givenDiv)
{
	var givenDiv = atb.util.ReferenceUtil.applyDefaultValue(opt_givenDiv, null);
	if (givenDiv === null)
	{
		givenDiv = document.createElement("div");
		// buttonTag;//HACK...lol!
	}
	//var buttonDiv =document.createElement("div");// buttonTag;//HACK...lol!
	//debugPrint("!!2");
	//atb.util.ReferenceUtil.applyDefaultValue(
	
	//var domGenerator = menuItem.getDomGenerator();
	var domGenerator = givenMenuItem.getDomGenerator();
	var resultDiv; 
	
	resultDiv = domGenerator(givenMenuItem, givenDiv);
	
	if (
		(!atb.util.ReferenceUtil.isBadReferenceValue(resultDiv)) &&
		(resultDiv !== givenDiv) &&
		(resultDiv.parentNode === null)
	){
		givenDiv.appendChild(resultDiv);
	}
	
	return givenDiv;
};