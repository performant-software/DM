goog.provide("atb.util.StyleUtil");

/**
 * @fileoverview provides some style helper functions.
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");

goog.require('goog.dom.DomHelper');
goog.require('goog.math.Coordinate');
goog.require('goog.positioning.ClientPosition');

/**
 * @namespace Provides some style-related functionality.
**/
//atb.util.StyleUtil = atb.util.StyleUtil; //this line is a hack to allow jsdoc to "find" this 'module'(namespace)...




/**
 * modify by delta value
 *
 * inspired by some sillyness in MSIE7's styles...
**/
atb.util.StyleUtil.modifyStyleCoordinate = function(currentValue, deltaValue, opt_units)
{
	var curNum = currentValue;

	if (typeof(currentValue) == "string")
	{
		currentValue = currentValue.toLowerCase();
		if(currentValue.trim)
		{
			//OI... msie doesn't seem to have a string trim method =/ :
			currentValue=currentValue.trim();
		}
		//TODO: ignore/strip whitespace...???!?
		
		var re = /px$/;
		if (currentValue.match(re))
		{
			currentValue = currentValue.substr(0,currentValue.length - 2);
		}
		curNum = parseFloat(currentValue);//hack
	}
	
	var ret = curNum + deltaValue;
	
	return ret;
};






//"static" method:
/**
 * a method to load a css stylesheet from a url. Only loads that once. (will load it again possibly if its embedded in the html rather than invoked via this, though, unsure if browsers would even care...)
 *
 * TODO: replace me with a stock version (There has to be one somewhere in all of the included libraries...)
 *
 * @deprecated Probably want to use includeStyleSheetOnceFromRoot instead.
 * 
 * @param {string} cssPath The path to the css (either an absolute uri or relative the current page url)
 *
 * @public
**/
atb.util.StyleUtil.includeStyleSheetOnce = function(cssPath)
{
	//debugPrint("including stylesheet: "+cssPath);//HACK
	
	//Q: is there a better implementation out there... probably...???
	
	var set = atb.util.StyleUtil.includedStyleSheets_;
	if (atb.util.ReferenceUtil.isBadReferenceValue(set[cssPath]))
	{
		set[cssPath] ={
			cssPath: cssPath
		};
		
		//inspired by:
		//http://stackoverflow.com/questions/574944/how-to-load-up-css-files-using-javascript
		var tag = document.createElement("link");
		tag.rel = "stylesheet";
		tag.type="text/css";
		tag.href=cssPath;
		var headTag = document.getElementsByTagName('head')[0];
		headTag.appendChild(tag);//lol!
	}
	else
	{
		//do nothing - already was added...!?!...?
	}
};



/**
 * Provides a probably more sane way to load a style sheet than includeStyleSheetOnce, by allowing us to detect and handle the lack of a known cssRoot by the caller...
 *
 * @public
**/
atb.util.StyleUtil.includeStyleSheetOnceFromRoot = function(cssRoot, cssPath)
{
	cssRoot = atb.util.ReferenceUtil.applyDefaultValue(cssRoot, atb.util.StyleUtil.DEFAULT_CSS_ROOT);
	//cssPath = "" + cssRoot +"/"+ cssPath;	// "/" -- Nah... use below instead:
	cssPath = "" + cssRoot + cssPath;
	return atb.util.StyleUtil.includeStyleSheetOnce(cssPath);
	
};



/**
 * Storage for includeStyleSheetOnce. keeps track of already loaded stylesheets.
 * @field
 * @static
 * @private
**/
atb.util.StyleUtil.includedStyleSheets_ = {};



/**
 * A constant storing a default css root directory, to use if we haven't been told to search elsewhere.
 * @field
 * @static
**/
atb.util.StyleUtil.DEFAULT_CSS_ROOT = "http://ada.drew.edu/anno/css/";

atb.util.StyleUtil.CURSOR_SIZE = 16;

atb.util.StyleUtil.maintainPopupPositionWithinWindow = function (initialPosition, div, domHelper) {
    var xCoord = initialPosition.x;
    var yCoord = initialPosition.y;
    
    var farXcoord = xCoord + jQuery(div).width();
    var farYcoord = yCoord + jQuery(div).height();
    
    var windowWidth = jQuery(domHelper.getWindow()).width();
    var windowHeight = jQuery(domHelper.getWindow()).height();
    
    var PADDING = 5;
    
    if (windowWidth < farXcoord + PADDING) {
        var xOverrun = farXcoord - windowWidth;
        xCoord -= xOverrun + 5;
    }
    if (windowHeight < farYcoord + PADDING) {
        var yOverrun = farYcoord - windowHeight;
        yCoord -= yOverrun + 5;
    }
    
    if (xCoord < PADDING) {
        xCoord = PADDING;
    }
    if (yCoord < PADDING) {
        yCoord = PADDING;
    }
    
    if (xCoord < 0) {
        xCoord = 0;
    }
    if (yCoord < 0) {
        yCoord = 0;
    }
    
    return new goog.math.Coordinate(xCoord, yCoord);
};

atb.util.StyleUtil.computeCenteredBottomClientPosition = function (div, opt_domHelper) {
    var domHelper = opt_domHelper || new goog.dom.DomHelper();
    
    var windowWidth = jQuery(domHelper.getWindow()).width();
    var windowHeight = jQuery(domHelper.getWindow()).height();
    
    var divWidth = jQuery(div).outerWidth();
    var divHeight = jQuery(div).outerHeight();
    
    var coord = new goog.math.Coordinate((windowWidth/2) - (divWidth/2), windowHeight - divHeight);
    
    return new goog.positioning.ClientPosition(coord);
};