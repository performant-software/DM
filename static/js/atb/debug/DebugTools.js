//alert("!!");
goog.provide("atb.debug.DebugTools");

goog.require("atb.util.ReferenceUtil");
goog.require('atb.debug.DebugConsole');
goog.require("atb.debug.DebugViewer");
goog.require("atb.debug.DebugUtil");

goog.require("atb.util.StyleUtil");

//var debugConsole = null;
//var debugViewer = null;
//var bAutoCreatedConsole = false;
//var bAutoCreatedDebugViewer = false;

atb.debug.DebugTools = function(){};
//atb.debug.DebugTools.bDisableDebugTools = false;
atb.debug.DebugTools.bDisableDebugTools = true;

atb.debug.DebugTools.debugConsole = null;
atb.debug.DebugTools.debugViewer = null;
atb.debug.DebugTools.bAutoCreatedConsole = false;
atb.debug.DebugTools.bAutoCreatedDebugViewer = false;
atb.debug.DebugTools.isDisabled = function()
{
	return atb.debug.DebugTools.bDisableDebugTools;
};
//function includeDefaultDebugStylesheet(opt_cssRoot)
function debug_includeDefaultDebugStylesheet(opt_cssRoot)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	var cssRoot = atb.util.ReferenceUtil.applyDefaultValue(opt_cssRoot, null); 
	//^Note: null will force styleutil to pick the default...
	
	//<link rel="stylesheet" href="../css/atb/debug/DebugDefaults.css" type="text/css" />
	atb.util.StyleUtil.includeStyleSheetOnceFromRoot(cssRoot, "/atb/debug/DebugDefaults.css");
};
//^Lol
//function debugPrintObject(obj)
function debugPrintObject(obj, opt_filterFunc, opt_maxDepth)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	autoInitDebugConsole();
	//debugConsole.debugPrintObject(obj);
	atb.debug.DebugTools.debugConsole.debugPrintObject(obj, opt_filterFunc, opt_maxDepth);
}

function debugPrint(str)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	autoInitDebugConsole();
	atb.debug.DebugTools.debugConsole.debugPrint(str);
}

function clearDebugConsole()
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	autoInitDebugConsole();
	atb.debug.DebugTools.debugConsole.clearDebugConsole();
}

function debugViewObject(obj, opt_caption)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	//opt_caption =
	var caption = atb.util.ReferenceUtil.applyDefaultValue(opt_caption,"Viewing Object");
	autoInitDebugConsole();
	//debugViewer.viewObject(obj);
	//var caption = "Viewing Object";//Hack
	atb.debug.DebugTools.debugViewer.viewLabeledObject(caption, obj);
}

/*function debugView(caption, obj)
{
	autoInitDebugConsole();
	debugViewer.viewLabeledObject(caption, obj);
}*/
//funct
//initDebugConsole()

function _initDebugConsoleObject(idDebugConsole)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	idDebugConsole = atb.util.ReferenceUtil.applyDefaultValue(idDebugConsole, null);
	var ndDebugConsole = null;//default to null. - ie, autocreate it...lol!
	//if (idDebugConsole !== null)
	//if (!(idDebugViewer === null))
	if (!(idDebugConsole === null))
	{
		ndDebugConsole = document.getElementById(idDebugConsole);
		//atb.debug.DebugUtil.debugAssertion( !(ndDebugConsole===null), "null debug console node for specified id..." );
		atb.debug.DebugUtil.debugAssertion( !(ndDebugConsole===null), "null debug console node for specified id... id='"+idDebugConsole+"'" );
		//^paranoia...lol!
	}
	
	//opt_usingDiv = atb.util.ReferenceUtil.applyDefaultValue(opt_usingDiv, null);
	//var idDebugConsole = "dbgText";
	//var ndDebugConsole = document.getElementById(idDebugConsole);
	atb.debug.DebugTools.debugConsole = new atb.debug.DebugConsole(ndDebugConsole);
	
	//debugConsole.show();
}

function _initDebugViewerObject(idDebugViewer)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	idDebugViewer = atb.util.ReferenceUtil.applyDefaultValue(idDebugViewer, null);
	var ndDebugViewer = null;//default to null. - ie, autocreate it...lol!
	//if (idDebugViewer !== null)
	if (!(idDebugViewer === null))
	{
		ndDebugViewer = document.getElementById(idDebugViewer);
		atb.debug.DebugUtil.debugAssertion( !(ndDebugViewer===null), "null debug viewer node for specified id... id='"+idDebugViewer+"'" );
		//^paranoia...lol!
	}
	
	//var idDebugViewer = "debugViewer";
	//var ndDebugViewer = document.getElementById(idDebugViewer);
	atb.debug.DebugTools.debugViewer = new atb.debug.DebugViewer(ndDebugViewer);
}

//function initDebugConsole()
function autoInitDebugConsole()
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	//var idDebugConsole = "dbgText";
	//var ndDebugConsole = document.getElementById(idDebugConsole);
	//debugConsole = new atb.debug.DebugConsole(ndDebugConsole);
	
	//var tagExists = function
	//if (!atb.debug.DebugTools.debugConsole)
	if (atb.debug.DebugTools.debugConsole === null)
	{
		//var defaultConsoleTagID = "debugConsoleText";
		//var defaultConsoleTagId = "debugConsoleText";
		var defaultConsoleTagId = "debugConsole";
		if(document.getElementById(defaultConsoleTagId))
		{
			_initDebugConsoleObject(defaultConsoleTagId);
		}
		else
		{
			//dbgText
			atb.debug.DebugTools.bAutoCreatedConsole = true;
			_initDebugConsoleObject();
			
			atb.debug.DebugTools.debugConsole.show();
		}
	}
	
	
	//if (!atb.debug.DebugTools.debugViewer)
	if (atb.debug.DebugTools.debugViewer === null)
	{
		var defaultViewerTagId = "debugViewer";
		if(document.getElementById(defaultViewerTagId))
		{
			_initDebugViewerObject(defaultViewerTagId);
		}
		else
		{
			atb.debug.DebugTools.bAutoCreatedDebugViewer = true;
			_initDebugViewerObject();
			
			atb.debug.DebugTools.debugViewer.show();
		}
	}
	
	//var idDebugViewer = "debugViewer";
	//var ndDebugViewer = document.getElementById(idDebugViewer);
	//debugViewer = new atb.debug.DebugViewer(ndDebugViewer);
}

function initDebugConsole(opt_idDebugConsole, opt_idDebugViewer)
{
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	if (!atb.util.ReferenceUtil.isBadReferenceValue(opt_idDebugConsole))
	{
		if (atb.debug.DebugTools.bAutoCreatedConsole)
		{
			if (debugConsole)
			{
				//debugConsole.destroyHack();
				atb.debug.DebugTools.debugConsole.destroy();
				atb.debug.DebugTools.bAutoCreatedConsole=false;
				atb.debug.DebugTools.debugConsole=null;
			}
		}
		_initDebugConsoleObject(opt_idDebugConsole);
	}
	
	if (!atb.util.ReferenceUtil.isBadReferenceValue(opt_idDebugViewer))
	{
		//if (bAutoCreatedConsole)
		if (atb.debug.DebugTools.bAutoCreatedDebugViewer)
		{
			if (atb.debug.DebugTools.debugViewer!==null)
			{
				atb.debug.DebugTools.debugViewer.destroy();//Hack();
				atb.debug.DebugTools.debugViewer = null;
				atb.debug.DebugTools.bAutoCreatedDebugViewer =false;
				//bAutoC//reate//dConsole=false;
				//debu//gConsole=null;
			}
			//^orlolmigrateover...??
		}
		_initDebugViewerObject(opt_idDebugViewer);
	}
}

function debugViewerSetAutoSortKeys(bSortThem)//bVal)//false)
{
	bSortThem = !!bSortThem;//hack
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	
	atb.debug.DebugTools.debugViewer.bAutoSortKeys=bSortThem;//false;
}
//alert("!!");
//initDebugConsole();

//if (atb.util.ReferenceUtil.isBadReferenceValue(console))
(function()
{
	/*
	//we might still want to define console.log...!:
	if (atb.debug.DebugTools.isDisabled())
	{
		return;
	}
	*/
	
	var theGlobalScope = this;
	var consoleRef = theGlobalScope["console"];
	if (atb.util.ReferenceUtil.isBadReferenceValue(consoleRef))
	{
		//hack to hopefully end those annoying console errors (or at least stem them):
		//autoInitDebugConsole();//hack
		
		//consoleRef = debugConsole;
		consoleRef = 
		{
			log: function(msg)
			{
				if (atb.debug.DebugTools.isDisabled())
				{
					return;
				}
				autoInitDebugConsole();
				//debugConsole.log(msg);
				
				atb.debug.DebugTools.debugConsole.log("<font color='blue'>(Log): <i>"+msg+"</i></font>");
			}
		};
		
		theGlobalScope["console"] = consoleRef;
	}
	
})(this);//pass in global scope...?
//this["console"] = atb.util.ReferenceUtil.applyDefaultValue(this["console"], debugConsole)