goog.provide("atb.debug.AbstractDebugPanel");

goog.require("atb.util.LangUtil");
goog.require("jquery.jQuery");

atb.debug.AbstractDebugPanel = function()
{
	//this.dummyOldParent = null;
	
	
	//alert("containerDiv.parentNode[0]="+containerDiv.parentNode);
	//appendChild sets a parentNode (in MSIE), so lets preempt it with something that we can know is a "bad" parent:
	//if (this.dummyOldParent === null)
	//{
	this.dummyOldParent = document.createElement("div");//used as a fake parent for MSIE for containerDivs that are just created, since otherwise msie seems to give them a rubbish parent...
	//}
	

	this.bVisible = false;
	this.bMinimized = false;
	
	this.realParent = document.createElement("div");
	
	//appendChild sets a parentNode (in MSIE), so lets preempt it with something that we can know is a "bad" parent:
	////this.dummyOldParent.appendChild(this.dummyOldParent);//hack
	this.dummyOldParent.appendChild(this.realParent);//HACK////this.realDiv);//hack
	
	
	//alert(this.realParent.parentNode);//null, as expected, in msie as well
};

atb.debug.AbstractDebugPanel.prototype.minimize = function()
{
	this.setMinimized(true);
};

atb.debug.AbstractDebugPanel.prototype.restore = function()
{
	this.setMinimized(false);
};


atb.debug.AbstractDebugPanel.prototype.show = function()
{
	this.setVisible(true);
};

atb.debug.AbstractDebugPanel.prototype.hide = function()
{
	this.setVisible(false);
};

atb.debug.AbstractDebugPanel.prototype.postRedisplay = function()
{
	this.render(this.getRootDiv());
};
atb.debug.AbstractDebugPanel.prototype.isMinimized = function()
{
	return this.bMinimized;
};

atb.debug.AbstractDebugPanel.prototype.isVisible = function()
{
	return this.bVisible;
};
atb.debug.AbstractDebugPanel.prototype.setMinimized = function(bMinimized)
{
	bMinimized = !!bMinimized;
	var bChanged = (this.bMinimized !== bMinimized);
	this.bMinimized = bMinimized;
	
	if (bMinimized)
	{
		this.onMinimized(bChanged);
	}
	else
	{
		this.onRestored(bChanged);
	}
	
	this.postRedisplay();
	//CssClassMinimized
}


atb.debug.AbstractDebugPanel.prototype.setVisible = function(bVisible)
{
	bVisible = !!bVisible;
	var bChanged = (this.bVisible !== bVisible);
	
	this.bVisible = bVisible;
	if (this.bVisible)
	{
		this.onShow(bChanged);
	}
	else
	{
		this.onHide(bChanged);
	}
	
	//var usingRootDiv = this.getRootDiv();
	//var jqRoot = jQuery(usingRootDiv);
	
	
	if (this.bVisible)
	{
		//if (usingRootDiv.parentNode === null)
		this.fixParentsHack();
		//jqRoot.show();
	}
	else
	{
		//jqRoot.hide();
	}
	
	this.postRedisplay();
	//atb.util.LangUtil.forceBoolean(bVisible, false
};

atb.debug.AbstractDebugPanel.prototype.fixParentsHack = function()
{
	var usingRootDiv = this.getRootDiv();
	if (usingRootDiv.parentNode !== this.realParent)
	{
		var oldParent = usingRootDiv.parentNode;
		if ((oldParent !== null) && (oldParent !== this.dummyOldParent)) //HACK
		{
			oldParent.replaceChild(this.realParent, usingRootDiv);
		}
		else
		{
			//HACK://moved below!:
			//document.body.appendChild(this.realParent);
		}
		this.realParent.appendChild(usingRootDiv);
	}
	
	if ((this.realParent.parentNode === null) || (oldParent === this.dummyOldParent))
	{
		document.body.appendChild(this.realParent);
	}
};

//atb.debug.AbstractDebugPanel.updateMinimizedCaptionFunc = function(tag, bMinimizedValue)
atb.debug.AbstractDebugPanel.helper_updateMinimizedCaptionFunction = function(tag, bMinimizedValue)
{
	var minimizedLabel = "[+]";//show the result of clicking with the +/-('s)...
	var restoredLabel = "["+atb.debug.AbstractDebugPanel.prototype.SHRINK_CHAR+"]";//"[-]";
	
	var useLabel;
	if (bMinimizedValue)
	{
		useLabel = minimizedLabel;
	}
	else
	{
		useLabel = restoredLabel;
	}
	tag.innerHTML = useLabel;
};

//atb.debug.AbstractDebugPanel.prototype.generateContainerStuffHack = function()
atb.debug.AbstractDebugPanel.prototype.generateContainerStuffHack = function(set_caption, opt_bEnableMinimizeLink, opt_bEnableClearLink)
{
	var bEnableMinimizeLink = atb.util.LangUtil.forceBoolean(opt_bEnableMinimizeLink, true);
	var bEnableClearLink = atb.util.LangUtil.forceBoolean(opt_bEnableClearLink, true);
	
	//var fakeParent = document.createElement("div");
	var containerDiv = document.createElement("div");
	//this.bContainerLacksAParent = true;
	
	//MSIE hack
	//appendChild sets a parentNode (in MSIE), so lets preempt it with something that we can know is a "bad" parent:
	this.dummyOldParent.appendChild(containerDiv);//HACK
	//END MSIE HACK
	
	var self =this;
	
	var titleDiv = document.createElement("div");
		jQuery(titleDiv).addClass("debugPanelTitle");
		
		
		var titleCaption = document.createElement("b");
			titleCaption.innerHTML =""+set_caption;// "Debug Viewer";
			
			
		var titleLineBreak = document.createElement("br");
		
		var toggleMinimizedLink = null;
		if (bEnableMinimizeLink)
		{
			toggleMinimizedLink = document.createElement("a");
			toggleMinimizedLink.setAttribute("href", "#");
			
			var refreshMinimizeLinkCaptionFunc = function()
			{
				//helper_updateMinimizedCaptionFunction
				//updateMinimizedCaptionFunc(toggleMinimizedLink, self.isMinimized());
				atb.debug.AbstractDebugPanel.helper_updateMinimizedCaptionFunction(
					toggleMinimizedLink, 
					self.isMinimized()
				);
			};
			
			jQuery(toggleMinimizedLink).click(function()
			{
				var newValue = !self.isMinimized();
				self.setMinimized(newValue);
				refreshMinimizeLinkCaptionFunc();
				//toggleMinimizedLink.
				return false;
			});
	
			refreshMinimizeLinkCaptionFunc();
		}
	
		//var clearLink = document.createElement("a");
		var clearLink = null;
		if (bEnableClearLink)
		{
			clearLink = document.createElement("a");
			clearLink.innerHTML = "[Clear]";
			clearLink.setAttribute("href", "#");
			
			jQuery(clearLink).click(function()
			{
				self.clear();
				return false;
			});
		}
		
		if (toggleMinimizedLink !== null)
		{
			titleDiv.appendChild(toggleMinimizedLink);
		}
		
		titleDiv.appendChild(titleCaption);
		
		if (clearLink !== null)
		{
			titleDiv.appendChild(clearLink);
		}
		
		titleDiv.appendChild(titleLineBreak);
		
		//jQuery(titleDiv).addClass("debugPanelTitle");
	/*
	var updateMinimizedCaptionFunc = function(tag, bMinimizedValue)
	{
		var minimizedLabel = "[+]";//show the result of clicking with the +/-('s)...
		var restoredLabel = "[-]";
		
		var useLabel;
		if (bMinimizedValue)
		{
			useLabel = minimizedLabel;
		}
		else
		{
			useLabel = restoredLabel;
		}
		tag.innerHTML = useLabel;
	};
	*/
	
	//var refreshMinimizeLinkCaptionFunc = function()
	
	
	
	
	
	//toggleMinimizedLink...?+
	
	//str += "<b>Debug Viewer:</b>";
	//str += "<br/>\n";
	//fakeParent.innerHTML = str;
	
	//opt_set_targetDiv = document.createElement("div");
	
	//containerDiv.parentNode.removeChild(containerDiv);//HACK for msie
	//containerDiv.parentNode = null;//HACK
	
	//alert("containerDiv.parentNode[1]="+containerDiv.parentNode);
	
	
	containerDiv.appendChild(titleDiv);
	/**
	WTF:
	alert("containerDiv.parentNode[2]="+containerDiv.parentNode);//null in msie, firefox, etc. ...
	containerDiv.appendChild(document.createElement("div"));
	alert("containerDiv.parentNode[3]="+containerDiv.parentNode);//becomes non-null in msie...!?
	*/
	
	//alert("containerDiv.parentNode[3]="+containerDiv.parentNode);//becomes non-null in msie...!?
	//containerDiv.appendChild(document.createElement("div"));//hack--testinglol!//sets a parent...wtf!
	return containerDiv;
	
	//opt_set_targetDiv = document.createElement("div");
	//containerDiv.appendChild(opt_set_targetDiv);
	//document.body.appendChild(fakeParent);//hack
	//this.bNoParent = 
	
	
};

atb.debug.AbstractDebugPanel.prototype.render = function(toDiv)
{
	var jqDiv = jQuery(toDiv);
	jqDiv.addClass("abstractDebugPanel");
	
	//var jqRealRoot = jQuery(this.realRoot);//HACKlol!
	if (this.bMinimized)
	{
		jqDiv.addClass(this.CssClassMinimized);
		//jqRealRoot.addClass(this.CssClassMinimized);
	}
	else
	{
		jqDiv.removeClass(this.CssClassMinimized);
		//jqRealRoot.removeClass(this.CssClassMinimized);
	}
	
	if (this.bVisible)
	{
		//if (usingRootDiv.parentNode === null)
		//this.fixParentsHack();
		//jqRoot.show();
		jqDiv.show();
	}
	else
	{
		jqDiv.hide();
		//jqRoot.hide();
	}
	/*var usingRootDiv = this.getRootDiv();
	var jqRoot = jQuery(usingRootDiv);
	
	
	if (this.bVisible)
	{
		//if (usingRootDiv.parentNode === null)
		//this.fixParentsHack();
		jqRoot.show();
	}
	else
	{
		jqRoot.hide();
	}*/
};

atb.debug.AbstractDebugPanel.prototype.onShow = function(bChanged)
{
	//can override me
};

atb.debug.AbstractDebugPanel.prototype.onHide = function(bChanged)
{
	//can override me
};


atb.debug.AbstractDebugPanel.prototype.onMinimized = function(bChanged)
{
	//can override me
};

atb.debug.AbstractDebugPanel.prototype.onRestored = function(bChanged)
{
	//can override me
};

////////////// Abstract Methods: ////////////////////

atb.debug.AbstractDebugPanel.prototype.getRootDiv = function()
{
	throw new Error("must implement atb.debug.AbstractDebugPanel::getRootDiv()");
	return null;
};

atb.debug.AbstractDebugPanel.prototype.clear = function()
{
	throw new Error("must implement atb.debug.AbstractDebugPanel::clear ()");
}

atb.debug.AbstractDebugPanel.prototype.displayValue = function(value, opt_caption)
{
	throw new Error("must implement atb.debug.AbstractDebugPanel::displayValue()");
};

////////////////////////////

atb.debug.AbstractDebugPanel.prototype.CssClassMinimized = "AbstractDebugPanel-minimized";
//atb.debug.AbstractDebugPanel.prototype.CssClassRestored = "AbstractDebugPanel-";

atb.debug.AbstractDebugPanel.prototype.SHRINK_CHAR = "&ndash;";