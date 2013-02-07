goog.provide('atb.viewer.ColorOpacityField');

goog.require('goog.events');
goog.require('goog.ui.Component.EventType');
goog.require('goog.ui.HsvaPalette');

goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.positioning.ClientPosition');
goog.require('goog.positioning.Corner');
goog.require('goog.positioning.AnchoredViewportPosition');
goog.require('goog.ui.Popup');

goog.require("atb.util.ReferenceUtil");//lol
goog.require("atb.util.StyleUtil");
/**
 * something that allows one to edit both a color and an opacity.
 *
**/
atb.viewer.ColorOpacityField = function(opt_color_opacity_field_options)
{
	this.floatingDiv=document.createElement("div");
	//this.options = atb.util.ReferenceUtil.
	this.options = atb.util.ReferenceUtil.mergeOptions(opt_color_opacity_field_options,
	{
		cssRoot: null
	});
	//atb.util.ReferenceUtil.mergeOptions
	//atb.util.StyleUtil.includeStyleSheetOnceFromRoot(this.options.cssRoot, 
	atb.util.StyleUtil.includeStyleSheetOnceFromRoot("", "http://closure-library.googlecode.com/svn/trunk/closure/goog/css/hsvapalette.css");//lolHACK...!
	//<link rel="stylesheet" href="http://closure-library.googlecode.com/svn/trunk/closure/goog/css/hsvapalette.css" type="text/css" media="all" />
	//loldisable alpha...?
	this.bRenderedOnce = false;
	//goog.ui.HsvaPalette(opt_domHelper, opt_color, opt_alpha, opt_class) 
	this.colorWidget = new goog.ui.HsvaPalette(null, null, null, 'goog-hsva-palette-sm');
	this.popup = new goog.ui.Popup();
	this.popup.setElement(this.colorWidget.getElement());
	
	this.activeUsage = null;
	
	var self=this;
	
	goog.events.listen(this.popup, goog.ui.PopupBase.EventType.HIDE, function(event)
	{
		self.ifUsage(function(usage)
		{
			self.activeUsage = null;
			usage.finish(usage);
		});
	});
	
	goog.events.listen(this.colorWidget, goog.ui.Component.EventType.ACTION, function(event)
	{
		self.ifUsage(function(usage)
		{
			//handleUpdateHelperCallback(usage, event);
			self.handleUpdateHelperCallback(usage, event);
		});
	});
};

atb.viewer.ColorOpacityField.prototype.ifUsage=function(callback)
{
	var usage = this.activeUsage;
	if (atb.util.ReferenceUtil.isBadReferenceValue(usage))
	{
		var str = ""+callback;
		debugPrint(str);//hack
		//^lolhack
		
		//somehow reached in msie:
		debugPrint("ifusage, but null activeUsage!");
		//alert(callback);
		return false;
	}
	else
	{
		return callback(usage);
	}
};

atb.viewer.ColorOpacityField.prototype.setWidgetColorAndOpacity = function(rgb, alpha)
{
	//alert(this.colorWidget.setColor);
	//this.colorWidget.setColor(rgb);
	//this.colorWidget.setAlpha(alpha);//hack
	////this.colorWidget.setColorAlphaHelper(rgb,alpha);//lolhack
	this.colorWidget.setColorAlphaHelper_(rgb,alpha);//lolhack
};
atb.viewer.ColorOpacityField.prototype.setWidgetColorRGBA = function(colorHex)
{
	//this.colorWidget.setColorRgbaHex(colorHex);
	this.colorWidget.setColorRgbaHex(colorHex);
};

atb.viewer.ColorOpacityField.prototype.handleUpdateHelperCallback = function(usage, event)
{
	var widget = event.target;
	var rawColor =widget.getColorRgbaHex();
	var rgb =widget.getColor();
	var opacity = widget.getAlpha();
	
	var rgbAndOpacity = {
		color: rgb,
		opacity: opacity
	};
	
	var params = {
		raw_rgba: rawColor,
		//alphaHex: rgbAndOpacity["opacity_hex"],
		color: rgbAndOpacity["color"],
		opacity: rgbAndOpacity["opacity"],
		usage: usage,
		event: event,
		editor: this
	};
	usage.update(params);
	/*usage.update({
		raw_rgba: rawColor,
		color: rgbAndOpacity["color"],
		opacity: rgbAndOpacity["opacity"],
		usage: usage,
		event: event,
		editor: this
	});*/
};

atb.viewer.ColorOpacityField.prototype.showNowHelper=function(usage)
{
	var undef;
	if ((usage==undef)||(usage == null))
	{
		debugPrint("bad usage: "+usage);
		return;
	}
	
	var self= this;//hack
	
	
	/*if (!self.bRenderedOnce)
	{
		self.bRenderedOnce = true;
		self.colorWidget.render();
		/////self.colorWidget.getElement().style.backgroundColor = "#ffFFff";//hack
		
		//LOL:
		//self.colorWidget.getElement().style.backgroundColor = "#9f9f9f";//hack
		
		self.colorWidget.getElement().style.backgroundColor = "#9f9f9f";//hack
		//^LOLOK...^hacol
	}*/
	
	self.activeUsage = usage;
	
	var popup = self.popup;//hack
	var widget = self.colorWidget;
	
	popup.setVisible(false);
	/*
	var menuCorner = goog.positioning.Corner.TOP_LEFT;//hack
	popup.setPinnedCorner(menuCorner);
	
	//var margin = new goog.math.Box(-33,0,0,0);//1,1,1,1);
	var margin = new goog.math.Box(-407,0,0,0);//HACK!?!...
	//var margin = new goog.math.Box(0,0,0,0);//HACK TEST
	popup.setMargin(margin);
	
	//var buttonCorner = goog.positioning.Corner.TOP_LEFT;//hack
	popup.setPosition(new goog.positioning.AnchoredViewportPosition(usage.inputTag, buttonCorner));
	
	*/
	////var buttonCorner = goog.positioning.Corner.TOP_LEFT;//hack
	////popup.setPosition(new goog.positioning.AnchoredViewportPosition(usage.inputTag, buttonCorner));
	//popup.setPosition(new goog.positioning.ViewportPosition(0, 0));//HACK
	////begin a new hack:
	//var jqHack = jQuery(usage.inputTag);
	//var offs = jqHack.offset();
	//popup.setPosition(new goog.positioning.ViewportPosition(offs.left, offs.top));//HACK
	
	//popup.setElement(widget.getElement());
	
	////popup.setElement(widget.getElement());
	//widget.decorate(
	//widget.decorate(usage.inputTag);//HACK
	//alert(""+widget.decorate);
	//alert(""+widget.canDecorate);
	
	
	
	//var parentNd = usage.inputTag.parentNode;
	//alert(""+parentNd);
	/*
	widget.canDecorate = function(){return true;};//HACK!!!
	var parentNd = usage.inputTag.parentNode.parentNode;
	widget.decorate(parentNd);//HACK
	*/
	//popup.setElement(widget.getElement());
	
	//popup.setPosition(new goog.positioning.ViewportPosition(0, 0));//HACK
	//var floatingDiv = this.floatingDiv;
	//usage.inputTag.parentNode.parentNode.parentNode.parentNode
	if (!self.bRenderedOnce)
	{
		self.bRenderedOnce = true;
		//self.colorWidget.exitDocument();//HACK
		
		//self.colorWidget.render(usage.inputTag.parentNode.parentNode.parentNode);
		////self.colorWidget.render(usage.inputTag.parentNode.parentNode.parentNode.parentNode.parentNode);
		//self.colorWidget.render(usage.inputTag.parentNode.parentNode.parentNode.parentNode);
		//self.colorWidget.render(usage.inputTag.parentNode.parentNode.parentNode.parentNode);
		self.colorWidget.render(this.floatingDiv);
		//self.colorWidget.render(usage.inputTag.parentNode.parentNode);
		//self.colorWidget.render(usage.inputTag.parentNode);
		//self.colorWidget.render(usage.inputTag);
		/////self.colorWidget.getElement().style.backgroundColor = "#ffFFff";//hack
		
		//LOL:
		//self.colorWidget.getElement().style.backgroundColor = "#9f9f9f";//hack
		
		self.colorWidget.getElement().style.backgroundColor = "#9f9f9f";//hack
		//^LOLOK...^hacol
	}
	popup.setElement(widget.getElement());
	//popup.setPosition(new goog.positioning.ViewportPosition(0, 0));//HACK
	//popup.setPosition(new goog.positioning.AnchoredViewportPosition(usage.inputTag.parentNode.parentNode, buttonCorner));
	//popup.get
	var elem = this.floatingDiv;//	//widget.getElement();
	//elem.get
	//debugViewObject(elem);
	elem.style.position = "absolute";//"relative";//absolute";
	//elem.style.left = 0;//"150px";
	//elem.style.top=0;
	var x=0,y=0;
	//far pjQuery(usage.inputTag).position();
	//var pos = jQuery(usage.inputTag).position();
	var pos = jQuery(usage.inputTag).position();
	//offset();
	if (pos!==null)
	{
		x=pos.left;
		y=pos.top;
	}
	elem.style.left =""+x+"px";// x;
	elem.style.top =""+y+"px";//0;// y;
	//^LOL
	debugPrint("("+x+", "+y+")");
	//elem.style.left =""+0+"px";// x;
	//elem.style.top =""+10+"px";//0;// y;
	elem.style.display = "block";
	//elem.style.float = "left";//hack
	//HACK:
	usage.inputTag.parentNode.parentNode.appendChild(elem);//	///hack
	//usage.inputTag.parentNode.parentNode.parentNode.parentNode.appendChild(elem);//	///hack
	
	//debugViewObject(widget);//HACK
	
	//popup.attachTo(document.body);//HACK
	popup.setVisible(true);
};


//setup(usage
atb.viewer.ColorOpacityField.prototype.attachToInput=function(inputTag, setupCallback, updateCallback, finishCallback)//, args)
{
	//inputtag should be an html (input?) element...!
	var self=this;
	var inputField = jQuery(inputTag);
	var usage = {
		inputField: inputField,
		inputTag: inputTag,
		setup: setupCallback,
		//finish: finishCallback,
		update: updateCallback,
		finish: finishCallback,
		editor: this
	};
	inputField.focus(function()
	{
		self.activeUsage = usage;//hack
		//usage.setup(usage);//.editor, usage);
		usage.editor.showNowHelper(usage);
		usage.setup(usage);//.editor, usage);
		/*
		//self.activeUsage = usage;//hack
		//usage.setup(usage);//.editor, usage);
		//usage.editor.showNowHelper(usage);
		//self.activeUsage = null;
		self.activeUsage = usage;//hack
		usage.setup(usage);//.editor, usage);
		//self.activeUsage = usage;//hack
		usage.editor.showNowHelper(usage);
		//self.activeUsage = usage;//hack
		*/
	});
	
};

//atb.viewer.ColorOpacityField.prototype.
	//this.inputDomNode = inputDomNode;
	//this.inputTag = inputDomNode;
	//this.inputField = jQuery( this.inputDomNode );
	
	
//};

//atb.viewer.ColorOpacityField.prototype.
/**
function testPalette()
{
	var inputDomNode = document.getElementById("testColorField");
	var inputTag = inputDomNode;
	var inputField = jQuery( inputDomNode );
	
	
	var setFieldColor = function(setColor)
	{
		inputField.val(setColor);
		inputTag.style.backgroundColor = setColor;
	};
	
	var linkColors = function(e)
	{
		var color =e.target.getColorRgbaHex();
		var rgbStr = color.substr(0,7);
		var alphaStr = color.substr(6,2);
		
		var alpha;
		eval("alpha = "+"0x"+alphaStr+";");//hack
		alpha = (alpha / 255.0);
		
		clearDebugConsole();
		//debugPrint("rgb: "+rgbStr+", alpha(hex): "+alphaStr);
		debugPrint("rgb: "+rgbStr+", alpha: "+alpha);
		
		setFieldColor(rgbStr);
	};

	var popup = new goog.ui.Popup();
	
	var pSmall = new goog.ui.HsvaPalette(null, null, null, 'goog-hsva-palette-sm');
	goog.events.listen(pSmall, goog.ui.Component.EventType.ACTION, linkColors);
	
	popup.setHideOnEscape(true);
	popup.setAutoHide(true);
	
	var bRenderedOnce = false;
	inputField.focus(function()
	{
		if (!bRenderedOnce)
		{
			bRenderedOnce = true;
			pSmall.render();
		}
		
		popup.setVisible(false);
		var margin = new goog.math.Box(-33,0,0,0);//1,1,1,1);
		var buttonCorner = goog.positioning.Corner.TOP_LEFT;//hack
		var menuCorner = goog.positioning.Corner.TOP_LEFT;//hack
		popup.setPinnedCorner(menuCorner);
		popup.setMargin(margin);
		popup.setPosition(new goog.positioning.AnchoredViewportPosition(inputTag, buttonCorner));
		popup.setElement(pSmall.getElement());
		popup.setVisible(true);
	});
	
	goog.events.listen(window, goog.events.EventType.RESIZE, function(e)
	{
      if (popup && popup.isVisible())
	  {
        popup.reposition();
      }
    });
	
	popup.setElement(pSmall.getElement());
	//pSmall.render();
	popup.setVisible(false);
	
}
	 **/ 

	  
	  
//function testPalette()
//{
	/*
	var inputField = null;
	jQuery("input.testColorEditor",document.getElementById("testing")).each(
		function(index)
		{
			inputField = jQuery(this);
		}
	);
		//debugPrint(inputField);
	//var inputTag = inputField.context;//hack

	*/

	
	//pSmall.render();
	//pSmall.render();
	
	//pSmall.setVisible(false);
	//popup.render();
		
	
	/*
	var pSmall = new goog.ui.HsvaPalette(null, null, null, 'goog-hsva-palette-sm');
	pSmall.render();
	goog.events.listen(pSmall, goog.ui.Component.EventType.ACTION, linkColors);
	*/
	//^Lolokosuh
	
	//pSmall.render();
	
	//var targetDivID = "colorPickerTestTarget";
	//var targetDiv = document.getElementById(targetDivID);
	
	//var popup = new goog.ui.Popup(targetDiv);
	
///////////////////


	//this.jqInputColor = jQuery(this.inputColor);
	
	
	//q: what of null...?
	//this.jqInputOpacity = jQuery(this.inputOpacity);
	
	/*
	var self = this;
	var showPopupFunc = function()
	{
		if (!self.bRenderedOnce)
		{
			self.bRenderedOnce = true;
			self.colorWidget.render();
		}
		var popup = self.popup;//hack
		var pSmall = self.colorWidget;
		
		popup.setVisible(false);
		var margin = new goog.math.Box(-33,0,0,0);//1,1,1,1);
		var buttonCorner = goog.positioning.Corner.TOP_LEFT;//hack
		var menuCorner = goog.positioning.Corner.TOP_LEFT;//hack
		popup.setPinnedCorner(menuCorner);
		popup.setMargin(margin);
		popup.setPosition(new goog.positioning.AnchoredViewportPosition(inputTag, buttonCorner));
		popup.setElement(pSmall.getElement());
		popup.setVisible(true);
	};
	*/
	
		
//atb.viewer.ColorOpacityField = function(inputColor, inputOpacity, changeCallbackFunc)
//this.inputColor = inputColor;
	//this.inputOpacity = inputOpacity;
	//this.changeCallbackFunc; = 
	
	//this.jqInputColor.focus(showPopupFunc);
	
	//var handleUpdateFunc = function(e)
//atb.viewer.ColorOpacityField.prototype.handleUpdateHelperCallback = function(event)

//function handleOCF(ocf, colorID, opacityID)

//createColorOpacityEditorFieldResponses
//atb.viewer.ColorOpacityField.prototype.ifUsage=function(callback)

//hack:
atb.viewer.ColorOpacityField.createColorOpacityEditorFieldResponsesFromIDs= function(ocf, colorID, opacityID,userUpdateCallback)
{
	//var inputColor = document.getElementById("testColorField");
	//var inputOpacity =document.getElementById("testOpacityField");
	var inputColor = document.getElementById(colorID);
	var inputOpacity =document.getElementById(opacityID);

	
	//var undef;
	if (ocf==null)//((ocf == null)||(ocf == un
	{
		//var ocf = new atb.viewer.ColorOpacityField();
		ocf = new atb.viewer.ColorOpacityField();
	}
	return atb.viewer.ColorOpacityField.createColorOpacityEditorFieldResponses(ocf,inputColor,inputOpacity,userUpdateCallback);
	//return ocf;
}
//hack:
atb.viewer.ColorOpacityField.createColorOpacityEditorFieldResponses=function(ocf, inputColor, inputOpacity, userUpdateCallback)
{
	//orlolabort...?
	var undef;//undefined.
	if ((userUpdateCallback == null)||(userUpdateCallback == undef))
	{
		userUpdateCallback=function(){};
	}
	
	//var inputColor = document.getElementById("testColorField");
	//var inputOpacity =document.getElementById("testOpacityField");
	
	////var inputColor = document.getElementById(colorID);
	////var inputOpacity =document.getElementById(opacityID);
	
	var jqColor = jQuery(inputColor);
	var jqOpacity = jQuery(inputOpacity);
		
	var setupFunc=function(usage)
	{
		var rgb = jqColor.val();
		var alpha = jqOpacity.val();
		alpha = alpha / 100.0;
		//var color_rgba_hex= usage.editor.extractRGBAColor(rgb,alpha);
		//usage.editor.setWidgetColorRGBA(color_rgba_hex);
		usage.editor.setWidgetColorAndOpacity(rgb, alpha);
	};
	
	var updateFunc=function(params)
	{
		userUpdateCallback();
		jqColor.val(params.color);
		inputColor.style.backgroundColor = params.color;
		//jqOpacity.val(params.opacity);
		jqOpacity.val(params.opacity * 100.0);
		userUpdateCallback(false);
	};
	
	var finishFunc = function(usage)
	{
		userUpdateCallback(true);
	};
	
	ocf.attachToInput(inputColor, setupFunc,updateFunc,finishFunc);
	ocf.attachToInput(inputOpacity, setupFunc,updateFunc,finishFunc);
	return ocf;
}

atb.viewer.ColorOpacityField.prototype.parseRGBAColor = function(color)
{
	
	var rgbStr = color.substr(0,7);
	//var alphaStr = color.substr(6,2);
	var alphaStr = color.substr(7,2);
	//debugPrint(alphaStr);
	var alpha;
	//eval("alpha = "+"0x"+alphaStr+";");//hack
	alpha = parseInt("0x"+alphaStr);
	//debugPrint(alpha);
	alpha = (alpha / 255.0);
	var ret = [];
	ret["opacity_hex"] = alphaStr;
	ret["color"] = rgbStr;
	ret["opacity"] = alpha;
	return ret;
};

atb.viewer.ColorOpacityField.prototype.extractRGBAColor = function(rgb, opacity)
{
	var alphaHex = this.convertOpacityToHex(opacity);
	var ret = "" + rgb + alphaHex;
	return ret;
};

atb.viewer.ColorOpacityField.prototype.convertOpacityToHex = function(opacity)
{
	var a = opacity;
	a*=255.0;
	if (a<0)
	{
		a=0;
	}
	else if (a>=255.0)
	{
		a=255.0;
	}
	a = Math.floor(a);
	
	var toBinary=function(number)
	{
		//var origNumber=  number;
		
		var ret = "";
		var base = 1;//.0;
		//number must be a valid number and >=0...!
		number = Math.floor(number);
		//debugPrint("number: "+number);
		var numShifts = 1;
		while(base < number)
		{
			base *=2;
			numShifts++;
		}
		if (base > number)
		{
			base /=2;
			numShifts--;
		}
		//debugPrint(numShifts);
		
		while(numShifts>0)
		{
			var tok;
			if (number >= base)
			{
				number -= base;
				tok = "1";
				//debugPrint("digit found; base="+base+"; number-->"+number);
			}
			else
			{
				//debugPrint("omit digit: "+base);
				tok = "0";
			}
			ret = ret + tok;
			numShifts--;
			
			base /= 2;
		}
		//debugPrint("end number: "+number);//1
		//debugPrint("end base: "+base);//1
		if (ret=="")
		{
			ret="0";//hack
		}
		//debugPrint("bin string: "+ret);
		return ret;
	};
	var toHex = function(binary)
	{
		var str = binary;
		var len =str.length;
		var off = len % 4;
		if (off != 0)
		{
			//debugPrint(str);
			//debugPrint("len: "+len);
			//debugPrint("off:"+off);
			off = 4-off;
			while(off>0)
			{
				str = "0"+str;
				off--;
			}
		}
		//debugPrint("str:" +str);
		var ret = "";
		var mapping = [
			"0","1","2","3",
			"4","5","6","7",
			"8","9","A","B",
			"C","D","E","F"
		];
		for(i=0; i+3<str.length; i+=4)
		{
			var digitValue = 0;
			var base = 8;
			for(var j=0; j<4; j++)
			{
				var digit = str[i+j];
				if (digit == "1")
				{
					digitValue += base;
				}
				base /=2;
			}
			
			var outChar = mapping[digitValue];
			//debugPrint("digitValue["+ret.length+"] = "+outChar);
			ret+=outChar;
		}
		return ret;
	};
	var binaryStr = toBinary(a);
	var hexStr = toHex(binaryStr);
	
	while(hexStr.length < 2)
	{
		hexStr = "0"+hexStr;
	}
	
	var ret = hexStr;
	return ret;
};
