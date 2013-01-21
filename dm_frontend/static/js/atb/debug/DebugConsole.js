goog.provide("atb.debug.DebugConsole");

goog.require("atb.debug.AbstractDebugPanel");
goog.require("atb.util.ReferenceUtil");
goog.require("jquery.jQuery");

atb.debug.DebugConsole = function(opt_usingDiv)
{
	atb.debug.AbstractDebugPanel.call(this);
	
	this.currentDebugText = "";
	
	opt_usingDiv = atb.util.ReferenceUtil.applyDefaultValue(opt_usingDiv, null);
	
	if (opt_usingDiv === null)
	{
		this.rootDiv = this.generateContainerStuffHack("Debug Console", true, true);
		opt_usingDiv = document.createElement("div");
		this.rootDiv.appendChild(opt_usingDiv);
	}
	else
	{
		this.rootDiv = opt_usingDiv;
	}
	jQuery(this.rootDiv).addClass("debugConsole");
	
	this.div = opt_usingDiv;
	this.postRedisplay();
};

goog.inherits(atb.debug.DebugConsole, atb.debug.AbstractDebugPanel);

atb.debug.DebugConsole.prototype.destroy = function()
{
	clearDebugConsole();
	//TODO: maybe reimplement me...butmaybealso inabstractdebugpanel...???
	/*
	if (!(this.fakeParent === null))
	{
		this.fakeParent.parentNode.removeChild(this.fakeParent);
		this.fakeParent = null;
	}
	*/
};


atb.debug.DebugConsole.prototype.render = function(toDiv)
{ 
	atb.debug.AbstractDebugPanel.prototype.render.call(this, toDiv);
	
	jQuery(toDiv).addClass("debugConsole");
};

atb.debug.DebugConsole.prototype.getRootDiv = function()
{
	return this.rootDiv;
};

atb.debug.DebugConsole.prototype.clear = function()
{
	this.clearDebugConsole();
};

atb.debug.DebugConsole.prototype.displayValue = function(value, opt_caption)
{
	opt_caption = atb.util.ReferenceUtil.applyDefaultValue(opt_caption, null);
	
	var str = "";
	
	if (opt_caption !== null)
	{
		str += "<b>"+opt_caption+"</b>"+": ";
	}
	
	//hack:
	str += "" + value;
	
	this.debugPrint(str);
	
};




//////////////////////////////////// specific methods: ///////////////////////////



atb.debug.DebugConsole.prototype.debugPrintObject=function(obj, filterFunc, maxDepth)
{
	var lines = this.prettyPrint(obj, filterFunc, maxDepth);
	this.debugPrintLines(lines);
};

atb.debug.DebugConsole.prototype.debugSetText=function(str)
{
	str = "" + str;
	this.currentDebugText = str;
	
	if (this.div != null)
	{
		this.div.innerHTML = str;
	}
};

atb.debug.DebugConsole.prototype.getCurrentDebugText = function()
{
	return this.currentDebugText;
};

atb.debug.DebugConsole.prototype.debugPrint=function(str)
{
	this.currentDebugText += this.newLineHTML + str;
	if (this.div != null)
	{
		var nd = document.createElement("div");
		nd.innerHTML = str;
		this.div.appendChild(nd);
		
	}
};

atb.debug.DebugConsole.prototype.println = atb.debug.DebugConsole.prototype.debugPrint;

atb.debug.DebugConsole.prototype.clearDebugConsole = function()
{
	this.currentDebugText = "";
	if (this.div != null)
	{
		this.div.innerHTML = "";
		
	}
};

atb.debug.DebugConsole.prototype.prettyPrintHelper_array=function(obj, indent, lines, maxDepth, key, tab, childIndent,filterFunc)
{
	if (key != null)
	{
		lines.push(indent+""+this.quoteString(""+key)+": ");
	}
	lines.push(indent+"[");
	
	for(var i=0; i<obj.length; i++)
	{
		var valueElement = obj[i];
		var bAdded =false;
		bAdded = this.prettyPrintHelper(valueElement, childIndent, lines, maxDepth -1, null,filterFunc);
		if(bAdded)
		{
			if (i+1 < obj.length)
			{
				lines[lines.length-1] = "" + (lines[lines.length-1]) +", ";
			}
		}
	}
	lines.push(indent+"]");
};

atb.debug.DebugConsole.prototype.quoteString=function(str)
{
	return "&quot;"+str+"&quot;";
};

atb.debug.DebugConsole.prototype.prettyPrintHelper_object=function(obj, indent, lines, maxDepth, key, tab, childIndent, filterFunc)
{
	if (key != null)
	{
		lines.push(indent+""+this.quoteString(""+key)+": ");
	}
	lines.push(indent + "{");
	
	var bFirst=true;
	var bAdded=false;
	for(var key in obj)
	{
		if (bFirst)
		{
			bFirst=false;
		}
		else
		{
			if (bAdded)
			{
				lines[lines.length-1] = "" + (lines[lines.length-1]) +", ";
			}
			bAdded=false;
		}
		var value = obj[key];	
		bAdded = this.prettyPrintHelper(value,childIndent, lines,maxDepth-1,key,filterFunc);
		
	}
	lines.push(indent + "}");
};

atb.debug.DebugConsole.prototype.prettyPrintHelper=function(obj, indent, lines, maxDepth, key, filterFunc)
{
	//or lol pass depth to filterfunc...???
	if (!filterFunc(key,obj))
	{
		return false;
	}
	
	if (lines.length >500)//HACK
	{
		lines.push("TOO MANY ITEMS!");
		return false;
	}
	//debugPrint("key: "+key);
	if (maxDepth < 1)
	{
		var str = "("+obj+")";
		if (key != null)
		{
			//lines.push(indent+""+key+": ");
			lines.push(indent+""+this.quoteString(""+key)+": "+str);
		}
		else
		{
			lines.push(indent+str);
		}
		return false;
	}
	
	var tab = "&nbsp;&nbsp;&nbsp;";
	
	var childIndent = indent + tab;
	
	var bPrimitive = true;
	
	var bQuote = false;
	
	var typeId = typeof(obj);
	var strPre = "";
	var strPost ="";
	var bNewline = false;
	if (typeId == typeof("string"))
	{
		bPrimitive=true;
		bQuote = true;
	}
	else if (typeId == typeof(function(){}))
	{
		//function!
		bPrimitive=true;
		bQuote=false;
		strPre = "<span style='color: rgb(0,0,128);'>";
		strPost = "</span>";
		bNewline=true;
	}
	else if (obj instanceof Array)
	{
		this.prettyPrintHelper_array(obj, indent, lines, maxDepth, key, tab, childIndent,filterFunc);
		bPrimitive=false;
	}
	else if (obj instanceof Object)
	{
		this.prettyPrintHelper_object(obj, indent, lines, maxDepth, key, tab, childIndent,filterFunc);
		bPrimitive=false;
	}
	else
	{
	}
	
	if (bPrimitive)
	{
		var str;
		str = ""+obj;
		if (bQuote)
		{
			str= this.quoteString(""+str);
		}
		str=strPre+str+strPost;//hack
		
		if (key != null)
		{
			if (bNewline)
			{
				lines.push(indent+""+this.quoteString(""+key)+": ");
				lines.push(indent+tab+""+ str);
			}
			else
			{
				lines.push(indent+""+this.quoteString(""+key)+": " + str);
			}
		}
		else
		{
			lines.push(indent+str);
		}
	}
	return true;
};

atb.debug.DebugConsole.prototype.prettyPrint=function(obj, filterFunc, maxDepth)
{
	filterFunc = atb.util.ReferenceUtil.applyDefaultValue(filterFunc, null);
	if (filterFunc === null)
	{
		filterFunc = function(k,v){return true;};
	}
	
	maxDepth = atb.util.ReferenceUtil.applyDefaultValue(maxDepth, this.defaultMaxPrettyPrintDepth);
	
	var lines = [];
	
	this.prettyPrintHelper(obj, "", lines, maxDepth, null,filterFunc);
	return lines;
};

atb.debug.DebugConsole.prototype.debugPrintLines=function(lines)
{
	//this.debugPrint("debugPrintLines{");
	for(var i=0; i<lines.length; i++)
	{
		var line = lines[i];
		this.debugPrint(line);
	}
	//this.debugPrint("}debugPrintLines");
};

atb.debug.DebugConsole.prototype.log = function(msg)
{
  	this.debugPrint(""+msg);//HACK
};


/////// Fields: ///////
atb.debug.DebugConsole.prototype.newLineHTML = "<br/>\r\n";
atb.debug.DebugConsole.prototype.defaultMaxPrettyPrintDepth = 7;//hack
