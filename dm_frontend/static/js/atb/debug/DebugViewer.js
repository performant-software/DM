goog.provide("atb.debug.DebugViewer");

/**
 * @fileoverview Provides a nice easy way to view the contents of an object.
 *
 * @author John O'Meara
**/

goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require("jquery.jQuery");
goog.require("atb.debug.AbstractDebugPanel");
goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.LangUtil");
goog.require("atb.util.Set");

atb.debug.DebugViewer = function(opt_set_targetDiv)
{
	atb.debug.AbstractDebugPanel.call(this);
	
	this.bShowFunctions = true;
	//lolonly functions...?
	this.bOnlyShowFunctions = false;
	
	this.bAutoSortKeys = true;
	this.bOrderFunctionsLast = true;
	
	this.fakeParent = null;
	
	opt_set_targetDiv = atb.util.ReferenceUtil.applyDefaultValue(opt_set_targetDiv, null);
	if (opt_set_targetDiv === null)
	{
		this.rootDiv = this.generateContainerStuffHack("Debug Viewer", true, true);
		opt_set_targetDiv = document.createElement("div");
		this.rootDiv.appendChild(opt_set_targetDiv);
	}
	else
	{
		this.rootDiv = opt_set_targetDiv;
	}
	jQuery(this.rootDiv).addClass("debugViewer");
	
	this.targetDiv = opt_set_targetDiv;
	this.targetDiv.style.textAlign = "left";
	this.target = {};
	this.docRoot = document.createElement("div");
	this.targetDiv.appendChild(this.docRoot);
	
	this.postRedisplay();
};
goog.inherits(atb.debug.DebugViewer, atb.debug.AbstractDebugPanel);



atb.debug.DebugViewer.prototype.render = function(toDiv)
{ 
	atb.debug.AbstractDebugPanel.prototype.render.call(this, toDiv);
	
	jQuery(toDiv).addClass("debugViewer");
};



atb.debug.DebugViewer.prototype.getRootDiv = function()
{
	return this.rootDiv;
};



atb.debug.DebugViewer.prototype.clear = function()
{
	this.viewObject({});//HACK
};



atb.debug.DebugViewer.prototype.displayValue = function(value, opt_caption)
{
	opt_caption = atb.util.ReferenceUtil.applyDefaultValue(opt_caption, null);
	
	if (opt_caption !== null)
	{
		this.viewLabeledObject(opt_caption, value);
	}
	else
	{
		this.viewLabeledObject("Viewing Object: ", value);
	}
};




//////////////////////////////// specific methods: //////////////////////////////

//refreshview...
atb.debug.DebugViewer.prototype.refresh=function()
{//^new...
	var tmp = this.target;
	this.viewObject({});
	this.viewObject(tmp);//lol... hack!
};

atb.debug.DebugViewer.prototype.viewLabeledObject = function(set_label, set_targetObject)
{
	var obj = {};
	obj[""+set_label] = set_targetObject;
	this.viewObject(obj);
	
};



atb.debug.DebugViewer.prototype.viewObject = function(set_targetObject)
{
	this.docRoot.innerHTML = "";
	this.target = set_targetObject;
	
	var space = "&nbsp;";
	var tab = space+space+space+space+space;
	
	var keysInfo = this.enumerateKeys_(this.target);
	
	this._expandValues(this.docRoot, this.target, keysInfo, tab, false);
};



atb.debug.DebugViewer.prototype.setShowFunctions = function(set_showFunctions)
{
	this.bShowFunctions = !!set_showFunctions;
	this.updateView(null);
};



atb.debug.DebugViewer.prototype.updateView = function(opt_fromNode)
{
	var fromNode = atb.util.ReferenceUtil.applyDefaultValue(opt_fromNode, this.docRoot);
	opt_fromNode=  this.docRoot;
	
	var jqEntries = jQuery("."+this.cssClassEntryTypeFunction);
	if (this.bShowFunctions)
	{
		jqEntries.show();
	}
	else
	{
		jqEntries.hide();
	}
	
	if (this.bOnlyShowFunctions)
	{
		jQuery("."+this.cssClassEntryTypeNonFunction).hide();
	}
};



atb.debug.DebugViewer.prototype.enumerateKeys_ = function(forValue)
{
	var keySequence = [];
	for(k in forValue)
	{
		keySequence.push(k);
	}
	
	if (this.bAutoSortKeys)
	{
		keySequence = keySequence.sort();
	}
	
	var i, l;
	var sequences = [];
	
	var seq;
	
	var badKeys = new atb.util.Set();
	
	if (!this.bOrderFunctionsLast)
	{
		sequences.push(keySequence);
	}
	else
	{
		seq = keySequence; 
		var nonFuncSeq = [];
		var afterKeySequence = [];
		
		sequences.push(nonFuncSeq);
		sequences.push(afterKeySequence);
		for(i=0, l =seq.length; i<l; i++)
		{
			var k;
			k = seq[i];
			var bItemIsFunction;
			bItemIsFunction = false;
			try
			{
				if (typeof(forValue[k]) == "function")
				{
					bItemIsFunction = true;
				}
			}
			catch(err)
			{
				badKeys.add(k);
			}
			
			if(bItemIsFunction)
			{
				afterKeySequence.push(k);
			}
			else
			{
				nonFuncSeq.push(k);
			}
		}
	}
	
	var finalKeySequence = [];
	for(var seqI = 0, seqL = sequences.length; seqI<seqL; seqI++)
	{
		seq = sequences[seqI];
		for(i=0, l =seq.length; i<l; i++)
		{
			var k = seq[i];
			finalKeySequence.push(k);
		}
	}
	var ret = 
	{
		badKeys: badKeys,
		keySequence: finalKeySequence
	};
	
	return ret;
};



atb.debug.DebugViewer.prototype._expandValues = function(parentTag, forValue, keysInfo, indent, opt_bForceError)
{
	opt_bForceError = atb.util.LangUtil.forceBoolean(opt_bForceError, false);
	
	
	var keys = keysInfo.keySequence;
	var badKeys = keysInfo.badKeys;
	var tab = "";
	
	var nullMessage = "(no children)";
	
	if (!opt_bForceError)
	{
		for(i=0, l =keys.length; i<l; i++)
		{
			var k = keys[i];
			
			var bLastChild = ((i+1) >= l);
			
			if (!badKeys.has(k))
			{
				var v = forValue[k];
				this._addEntry(parentTag, k, v, indent, bLastChild, false, "", false);
			}
			else 
			{
				var myErr = "(Unspecified problem evaluating property)";
				try
				{
					var testV = forValue[k];//Note: should cause an error -- we're Expecting it to do so...
				}
				catch(err)
				{
					myErr = err;
				}
				
				myErr = "" +myErr;
				myErr = "<span style='margin-left: auto; margin-right: 0px; width: 80%; display: block;'><small><i><font color='#ff0000'><span style='text-align: left; display: block;'>"+myErr+"</span></font></i></small></span>";
				
				var errorEntry = {
					//"(Error evaluating property)"
					error: ""+myErr
					
				};
				
				this._addEntry(parentTag, k, errorEntry, indent, bLastChild, true, "<i><font color='#ff0000'>(Error)</font></i>", false);
			}
		}
	}
	else
	{
		nullMessage = "" + forValue["error"];
	}
	
	if ((keys.length < 1) || opt_bForceError)
	{
		//note: ((keys.length < 1)===true) is no longer expected to occur...
		
		this._addEntry(parentTag, null, nullMessage, indent, true, false, "", opt_bForceError);//HACK!!!
	}
};



atb.debug.DebugViewer.prototype._addEntry = function(parentTag, key, forValue, indent, bLastChild, bValueIsError, errObject, bIsErrorMessageBody)
{
	var bNullKey = (key === null);
	
	key = atb.util.ReferenceUtil.applyDefaultValue(key, "");//hack
	bValueIsError = atb.util.LangUtil.forceBoolean(bValueIsError, false);
	bIsErrorMessageBody = atb.util.LangUtil.forceBoolean(bIsErrorMessageBody, false);
	
	var expandValue = forValue;//use this for expanding children
	
	
	
	var bCanExpandNode = false;
	var bFunction= false;
	if(typeof(forValue) == "object")
	{
		var c = ""+forValue;//hack
		if (typeof(forValue)==="string")
		{
			//bString = true;
		}
		else
		{
			bCanExpandNode = true;//hack
		}
	}
	else if (typeof(forValue) == "function")
	{
		bCanExpandNode = true;
		
		expandValue = {
			"(src)": ""+forValue
		};
		//forValue = "[function]";//hack
		forValue = "" + forValue;
		var str = "";
		//lol:
		//for(var i=0, l=forValue.length(); i<l; i++)
		
		//for(var i=0, l=forValue.length(); i<l; i++)
		for(var i=0, l=forValue.length; i<l; i++)
		{
			var ch = forValue[i];
			if (ch == "{")
			{
				break;
			}
			
			str += ch;
		}
		//str += "/* ... */ }";
		forValue = str;
		
		bFunction = true;
	}
	
	
	if (bValueIsError)
	{
		forValue = "" + errObject;
	}
	
	var valueKeysInfo = null;
	if (bCanExpandNode)
	{
		valueKeysInfo = this.enumerateKeys_(expandValue);
		if (valueKeysInfo.keySequence.length < 1)
		{
			bCanExpandNode = false;
		}
	}
	
	
	
	
	var thisIndent;
	var childIndent;
	var cleanChildIndent;
	
	var no_pipe = "&nbsp;&nbsp;"+"&nbsp;&nbsp;&nbsp;";
	var pipe = "&nbsp;&nbsp;"+"|"+"&nbsp;&nbsp;";
	var tick = "&nbsp;&nbsp;"+"|-"+"&nbsp;";
	var tick_last = "&nbsp;&nbsp;"+"\\-"+"&nbsp;";
	
	var bDebugTree = false;
	
	var nc="";
	var nt="";
	var yc="";
	var yt="";
	
	var nx="";
	var yx="";
	
	if (bDebugTree)
	{
		nc+="nc";
		nt+="nt";
		nx+="nx";
		yc+="yc";
		yt+="yt";
		yx+="yx";
		
		var cap = ((bLastChild) ? "l" : "n");
		nc+=cap;
		nt+=cap;
		nx+=cap;
		yc+=cap;
		yt+=cap;
		yx+=cap;
		
		
		//indent += "<span style='color: #ff0000; display: none;'>";
		indent += "<span style='color: #ff0000;'>";
		var pp = "</span>";
		
		pipe = "" + pp + pipe;
		no_pipe = "" + pp + no_pipe;
		tick = "" + pp + tick;
		tick_last = "" + pp +tick_last;
	}
	
	if (!bCanExpandNode)
	{
		cleanChildIndent = indent + nx + no_pipe;
		if (bLastChild)
		{
			childIndent = cleanChildIndent;
			thisIndent  = indent + nt + tick_last;
		}
		else
		{
			childIndent = indent + nc + pipe;
			thisIndent  = indent + nt + tick;
		}
	}
	else
	{
		cleanChildIndent = indent + yx + no_pipe;
		if (bLastChild)
		{
			childIndent = cleanChildIndent;
		}
		else
		{
			childIndent = indent + yc + pipe;
		}
		thisIndent  = indent + yt;
	}
	
	if (bIsErrorMessageBody)
	{
		thisIndent = "";
	}
	else if (bNullKey)
	{
		thisIndent = indent + "" + no_pipe;
		forValue = "<i>" + forValue + "</i>";//hack
	}
	
	
	var keyColor = "#000000";
	
	var self = this;							
	var growCaption =  "[+]";
	var shrinkCaption =  "["+self.SHRINK_CHAR+"]";
	var bAlreadyExpanded = false;
	
	//build the entry html:
	var entryNode =document.createElement("div");
		if (bFunction)
		{
			keyColor = "#00ff00";
			jQuery(entryNode).addClass(this.cssClassEntryTypeFunction);
		}
		else
		{
			if (!bCanExpandNode)
			{
				//lol:only do this for 'leaf' nodes:
				jQuery(entryNode).addClass(this.cssClassEntryTypeNonFunction);
			}//^LOL
		}
		
		//this will be where we put the "minimized" value text:
		var valueNode = document.createElement("span");
			//valueNode.innerHTML = ""+forValue;
			
			//strip out '<' characters...:
			var stripped_forValue = "";
			str_forValue = ""+ forValue;
			for(var i=0, l = str_forValue.length; i<l; i++)
			{
				var ch = str_forValue[i];
				if (ch == "<")
				{
					ch = "&lt;";
				}
				stripped_forValue += ch;
			}
			valueNode.innerHTML = ""+stripped_forValue;
			
			valueNode.style.color = "#6f6f6f";
	
		//this will be our value node:
		var captionNode= document.createElement("span");
		
		//add our first two children:
		entryNode.appendChild(captionNode);
		entryNode.appendChild(valueNode);
	
		
		//now back to the caption captionNode:	
			var captionBody = document.createElement("span");
				var indentSpan = document.createElement("span");
					indentSpan.innerHTML = "" + thisIndent;
					captionBody.appendChild(indentSpan);
					
				if (!bNullKey)
				{
					var captionLeftPart = (bCanExpandNode)?null:captionBody;			
						if (captionLeftPart === null)
						{
							captionLeftPart = document.createElement("a");
							captionLeftPart.style.color = "#0000ff"; // blue
							
							captionBody.appendChild(captionLeftPart);
						}
						
						var shrinkGrowCaptionTag = document.createElement("span");
							shrinkGrowCaptionTag.innerHTML = "";
							
							if (bCanExpandNode)
							{
								var childrenTag = document.createElement("div");
								
								var clickListenerFunc = atb.debug.DebugViewer.makeLinkToggleExpansionGenerator(
									shrinkGrowCaptionTag,
									valueNode,
									childrenTag,
									
									shrinkCaption, 
									growCaption, 
									bAlreadyExpanded, 
									
									function(minimizedTag, maximizedTag)
									{
										entryNode.appendChild(maximizedTag);
										self._expandValues(maximizedTag, expandValue, valueKeysInfo, childIndent, bValueIsError);
									}
								);
								jQuery(captionLeftPart).click(function(){clickListenerFunc(true);});
								clickListenerFunc(false);
							}
							
						
						var keyCaptionTag = document.createElement("span");
							keyCaptionTag.innerHTML = ""+key;
							keyCaptionTag.style.color = keyColor;
							
						captionLeftPart.appendChild(shrinkGrowCaptionTag);
						captionLeftPart.appendChild(keyCaptionTag);
					
					var afterCaptionSpan = document.createElement("span");
						afterCaptionSpan.innerHTML = ": ";
							
					captionBody.appendChild(afterCaptionSpan);
				}//end if (!bNullKey)
			
			captionNode.appendChild(captionBody);
		//end captionNode
		
	parentTag.appendChild(entryNode);
	
	this.updateView(entryNode);
};



atb.debug.DebugViewer.prototype.destroy = function()
{
	//TODO: reimplement this properly someday...?
	//	the original usage for this method, iirc, was to allow re-creating later a debugviewer on manually, after it had been auto-shown already...!
	
	
	this.clear();//this is probably not wanted for this real use-case of this...?
	
	//hack
	if (!(this.fakeParent === null))
	{
		this.fakeParent.parentNode.removeChild(this.fakeParent);
		this.fakeParent = null;
	}
}




/////////////////// Some "static" Utility Functions:





atb.debug.DebugViewer.refreshFuncGenerator = function(stateFunc, triggerFunc, renderFunc, customArgs)
{
	return function(bTrigger)
	{
		bTrigger = atb.util.LangUtil.forceBoolean(bTrigger, false);
		var state = stateFunc(customArgs);
		if (bTrigger)
		{
			triggerFunc(state);
		}
		
		renderFunc(state);
	};
};



atb.debug.DebugViewer.makeLinkToggleExpansionGenerator = function(captionTag, minimizedTag, maximizedTag, shrinkCaption, growCaption, bStartExpanded, opt_onExpandOnceFunc)
{
	var the_state = {
		modifyTag: captionTag,
		minimizedTag: atb.util.ReferenceUtil.applyDefaultValue(minimizedTag, null),
		maximizedTag: atb.util.ReferenceUtil.applyDefaultValue(maximizedTag, null),
		growCaption: growCaption,
		shrinkCaption: shrinkCaption,
		bExpanded: bStartExpanded,
		onExpandOnceFunc: atb.util.ReferenceUtil.applyDefaultValue(opt_onExpandOnceFunc, null),
		original_bExpanded_value: bStartExpanded
	};
	var stateFunc = function(customArgs)
	{
		return customArgs;
	};
	var triggerFunc = function(state)
	{
		state.bExpanded = !state.bExpanded;
	};
	var renderFunc = function(state)
	{
		if(state.bExpanded)
		{
			if (state.onExpandOnceFunc !== null)
			{
				state.onExpandOnceFunc(state.minimizedTag, state.maximizedTag);
				state.onExpandOnceFunc = null;
			}
			
			if (state.minimizedTag !== null)
			{
				state.minimizedTag.style.display = "none";
			}
			if (state.maximizedTag !== null)
			{
				state.maximizedTag.style.display = "block";
			}
		}
		else
		{
			if (state.minimizedTag !== null)
			{
				state.minimizedTag.style.display ="inline";
			}
			if (state.maximizedTag !== null)
			{
				state.maximizedTag.style.display = "none";
			}
		}
		
		var set_caption = ((state.bExpanded) ? state.shrinkCaption : state.growCaption);
		state.modifyTag.innerHTML = ""+ set_caption;
	};
	
	return atb.debug.DebugViewer.refreshFuncGenerator(stateFunc,triggerFunc,renderFunc, the_state);
};




////////////////////// Fields: ///////////////////////////


atb.debug.DebugViewer.prototype.cssClassEntryTypeFunction ="debug-viewer-entry-type-function";

atb.debug.DebugViewer.prototype.cssClassEntryTypeNonFunction = "debug-viewer-entry-type-non-function";
//not used, yet:
//atb.debug.DebugViewer.prototype.cssClassEntryTypeString ="debug-viewer-entry-type-string";


