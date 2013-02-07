goog.provide("atb.debug.DebugFilter");

/**
 * @fileOverview Provides a mechanism to simultaneously allow for a large number of 
 *    debug output statements to be left "live" in code, while limitting their effects 
 *    based on a what category of message they are.
 *
 * @author John O'Meara
**/

goog.require("atb.debug.DebugTools");
goog.require("atb.util.Set");

/**
 * Creates a new DebugFilter object.
 *
 * @public
 * @class
**/
atb.debug.DebugFilter = function()
{
	this.enableDebugCats = new atb.util.Set();
	this.enableDebugCats.add(atb.debug.DebugFilter.CAT_ERROR);
	this.enableDebugCats.add(atb.debug.DebugFilter.CAT_WARNING)
	//normally disabled by default, these are:
	//this.enableDebugCats.add(atb.DataStore.CAT_NOTICE);
	//this.enableDebugCats.add(atb.DataStore.CAT_TRACE);
	//this.enableDebugCats.add(atb.debug.DebugFilter.CAT_TODO);//lolnew!
	//this.enableDebugCats.add(atb.debug.DebugFilter.CAT_TRACE_VIEWOBJECT);//hacknew2!
};



/**
 * adds a category to the list of enabled message categories.
 * 
 * @param {string} cat The category to enable.
 * 
 * @public
**/
atb.debug.DebugFilter.prototype.addCat = function(cat)
{
	this.enableDebugCats.add(cat);
	//atb.debug.DebugFilter.prototype.
};



/**
 * removes a category to the list of enabled message categories.
 * 
 * @param {string} cat The category to disable.
 * 
 * @public
**/
atb.debug.DebugFilter.prototype.removeCat = function(cat)
{
	this.enableDebugCats.remove(cat);
};



//TODO: add a setcats method...?

/**
 * clears the list of enabled categories
 * 
 * @param {string} cat The category to enable.
 * 
 * @public
**/
atb.debug.DebugFilter.prototype.removeAllCats = function()
{
	this.enableDebugCats = new atb.util.Set();//lolhack!
};



/**
 * attempts to display a debug message.
 *
 * @public
**/
atb.debug.DebugFilter.prototype.debugMessage = function(cat, msg)
{
	if (this.enableDebugCats.has(cat))
	{
		if ((msg === "&nbsp;")||(msg===""))
		{
			debugPrint("&nbsp;");
		}
		else
		{
			//debugPrint("<i><font color='blue'>"+cat+"</font></i>: "+msg);
			//debugPrint(""+formatCategoryCaption(cat)+": "+msg);
			debugPrint(""+this.formatCategoryCaption(cat)+": "+msg);
		}
	}
};


atb.debug.DebugFilter.prototype.debugDumpObject = function(cat, obj)
{
	if (this.enableDebugCats.has(cat))
	{
		//debugPrint("<i>"+cat+"</i>: ");
		debugPrintObject(obj);
		debugPrint("&nbsp;");
	}
};

atb.debug.DebugFilter.prototype.debugViewObject = function(cat, obj, opt_caption)
{//lsta
	if (this.enableDebugCats.has(cat))
	{
		var caption;
		if (!atb.util.ReferenceUtil.isBadReferenceValue(opt_caption))
		{
			caption = opt_caption;
		}
		else
		{
			caption = this.formatCategoryCaption(cat);//lolhack!
		}
		debugViewObject(obj, caption);
	}
};

atb.debug.DebugFilter.prototype.debugNewline = function(cat)
{
	//this.debugPrint(cat, "&nbsp");
	this.debugMessage(cat, "&nbsp");
};

atb.debug.DebugFilter.prototype.formatCategoryCaption = function(cat)
{
	return "<i><font color='blue'>" + cat + "</font></i>";
};//^lostat..?

atb.debug.DebugFilter.CAT_WARNING = "warning";
atb.debug.DebugFilter.CAT_ERROR = "error";
atb.debug.DebugFilter.CAT_NOTICE = "notice";
atb.debug.DebugFilter.CAT_TRACE = "trace";
atb.debug.DebugFilter.CAT_TODO = "todo";//lolnew!
atb.debug.DebugFilter.CAT_TRACE_VIEWOBJECT = "trace&viewobjects";//+viewobject")//llnewacjl!