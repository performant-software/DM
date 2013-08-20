goog.provide("atb.widgets.GlassPane");
/**
 * @fileoverview This provides a div that sits in front of pretty much everything else.
 *    We can use it for "modal"-ish effects.
 *
 * @author John O'Meara 
**/
goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.LangUtil");
goog.require("goog.events");

//TODO: //lol@mergeoptions recursivelyidea...lol...?

/** 
 * @public
 * @constructor
 * @param {goog.dom.DomHelper?} opt_domHelper An optional dom helper. defaults to a new one wrapping document.
 * @param {object?} opt_options An optional set of options. Merged with the default options to control the vast majority of our behaviors.
**/
atb.widgets.GlassPane = function(opt_domHelper, opt_options)
{
	//initialize our dom helper field:
	this.bVisible = false;
	
	var domHelper = atb.util.ReferenceUtil.applyDefaultValue(opt_domHelper, null);//HACK
	if (domHelper === null)
	{
		domHelper = new goog.dom.DomHelper(document);
	}
	this.domHelper = domHelper;
	
	//initialize our options field:
	opt_options = atb.util.ReferenceUtil.applyDefaultValue(opt_options, {});
	opt_options = atb.util.ReferenceUtil.mergeOptions(opt_options, this.DefaultGlassPaneOptions);
	var options = opt_options;
	this.options = options;
	
	//prepare some values:
	var baseCssClassName = this.getOption_("baseCssClass");
	var prefixClasses = "" + baseCssClassName + " ";
	
	var zIndexHack = this.getOption_("baseZIndex");
	
	//some temporary variables for use in a moment:
	var optionsContext, div;
	
	//the glass div:
	optionsContext = "glassPane";
	this.glassPane = div = domHelper.createElement(this.getOption_(optionsContext, "nodeTagName"));
		jQuery(div).addClass(prefixClasses + this.getOption_(optionsContext, "cssClassName"));
		s = div.style;
		s.zIndex = parseFloat(""+zIndexHack) + parseFloat(""+this.getOption_(optionsContext, "deltaZIndex"));
		
		
		//this holds the visual effect of the glass:
		optionsContext = "glassPaneEffect";
		this.glassPaneEffect = div = domHelper.createElement(this.getOption_(optionsContext, "nodeTagName"));
			jQuery(div).addClass(prefixClasses + this.getOption_(optionsContext, "cssClassName"));
			s = div.style;
			s.zIndex = parseFloat(""+zIndexHack) + parseFloat(""+this.getOption_(optionsContext, "deltaZIndex"));
			s.opacity= this.getOption_(optionsContext, "initialOpacity");
			this.glassPane.appendChild(this.glassPaneEffect);
			
			
		//this holds any children we might have/acquire:
		optionsContext = "glassPaneChildContainer";
		this.glassPaneChildContainer = div = domHelper.createElement(this.getOption_(optionsContext, "nodeTagName"));
			jQuery(div).addClass(prefixClasses + this.getOption_(optionsContext, "cssClassName"));
			s = div.style;
			s.zIndex = parseFloat(""+zIndexHack) + parseFloat(""+this.getOption_(optionsContext, "deltaZIndex"));
			this.glassPane.appendChild(this.glassPaneChildContainer);
	
	
		//This was not part of the original design, and is currently just a hack to allow us to safely consume key events/etc...!
		this.dummyTextBox = div = domHelper.createElement("input");
			s = div.style;
			//HACK:
			s.position = "fixed";
			s.width = 10;
			s.height = 10;
			s.left = -100;
			s.top = -100;
			s.opacity = 0;
			
			this.glassPane.appendChild(div);
			jQuery(this.dummyTextBox).keyup(function(keyEvent)
			{
				keyEvent.preventDefault();
				keyEvent.stopPropagation();
				return false;
			});
};

/**
 * provides an easy way to listen for a type of event on the effects pane.
 * @public
 * @param {string} eventName The name of the event type to handle. Based on the goog.events.listen event type(s).
 * @param {function} callback The callback to be called when the event fires.
**/
atb.widgets.GlassPane.prototype.listen = function(eventName, callback)
{
	goog.events.listen(this.glassPaneEffect, eventName, callback, false, this);//HACK
};

/**
 * provides an easy way to listen for a type of event ONCE on the effects pane. (think goog.events.listenOnce)
 * @public
 * @param {string} eventName The name of the event type to handle. Based on the goog.events.listenOnce event type(s).
 * @param {function} callback The callback to be called when the event fires.
**/
atb.widgets.GlassPane.prototype.listenOnce = function(eventName, callback)
{
	goog.events.listenOnce(this.glassPaneEffect, eventName, callback, false, this);//HACK
};

/**
 * @public
 * adds a node as a child
 * @param {domElement} domNode A DOM Element.
**/
atb.widgets.GlassPane.prototype.appendChild = function(domNode)
{
	this.glassPaneChildContainer.appendChild(domNode);
};

/**
 * @public
 * shows us.
**/
atb.widgets.GlassPane.prototype.show = function()
{
	this.bVisible = true;
	
	var bodyTag = this.getBodyTag_();
	bodyTag.appendChild(this.glassPane);//HACK
	//this.glassPaneEffect.requestFocus();
	//jQuery(this.glassPaneEffect).focus();
	
	this.doAnimation_("showAnim", null);
};


atb.widgets.GlassPane.prototype.isVisible = function()
{
	return this.bVisible;
};
atb.widgets.GlassPane.prototype.requestFocus = function()
{
	//jQuery(this.glassPaneEffect).focus();
	//this.glassPaneEffect.focus();
	//this.glassPaneEffect.setAttribute("tabIndex", 0);//hack
	/*
	window.setTimeout(function()
			{
				if (!self.bDismissed)
				{
					self.glassPane.requestFocus();
				}
			},1);
			
	*/
	//var self = thsi;
	var self = this;
	window.setTimeout(function()
	{
		//if (!self.bDismissed)
		if (self.isVisible())
		{
			self.dummyTextBox.focus();//HACK
		}
		//or lol at focus in on other,...todo be less annoying about url bar/etc...?!
		
	},1);
	/*
		{
			self.glassPane.requestFocus();
		}
	},1);
	*/
	this.dummyTextBox.focus();
	/*
	var self=this;
	jQuery(this.dummyTextBox).mouseout(function()
	{
		self.dummyTextBox.focus();//HACK
	});
	*/
};

//atb.widgets.GlassPane.prototype.getGlassEffectPane=function()
atb.widgets.GlassPane.prototype.getGlassPane = function()
{
	return this.glassPane;
};
atb.widgets.GlassPane.prototype.getGlassPaneEffect=function()
{
	return this.glassPaneEffect;
};
/**
 * @public
 * hides us.
**/
atb.widgets.GlassPane.prototype.hide = function()
{
	this.bVisible = false;//HACK
	
	var self=this;
	var finAnim = function()
	{
		var p = self.glassPane;
		if (p.parentNode !== null)
		{
			p.parentNode.removeChild(p);
		}
	};
	this.doAnimation_("hideAnim", finAnim);
};

/**
 * convience function to create and add a tag as a child of this's childContainer, with the optionally specified array of css class names...
**/
atb.widgets.GlassPane.prototype.createChildWithClasses = function(elementNodeName, opt_cssClasses)
{
	var cssClasses = atb.util.ReferenceUtil.applyDefaultValue(opt_cssClasses, null);
	//TODO: maybe handle single values gracefully as well as arrays...??!
	//if (opt_cssClasses
	
	//var elem = this.domHelper .
	var elem = this.domHelper.createElement(elementNodeName);//such as "div"
	var cssClassNames = "";
	for(var i=0, l=cssClasses.length; i<l; i++)
	{
		if (i > 0)
		{
			cssClassNames += " ";
		}
		cssClassNames+= ""+cssClasses[i];
	}
	jQuery(elem).addClass(cssClassNames);
	this.appendChild(elem);
	return elem;
};

/**
 * @private
 * returns our body tag domElement.
**/
atb.widgets.GlassPane.prototype.getBodyTag_ = function()
{
	var bodyTag = this.domHelper.getDocument().body;
	return bodyTag;
};

/**
 * @private
 * performs the named css animation (name is a key into the options field).
 * @param {string} animName The animation name.
 * @param {function?} opt_complete_callback An optional callback to invoke upon the completion of the animation.
**/
atb.widgets.GlassPane.prototype.doAnimation_ = function(animName, opt_complete_callback)
{
	opt_complete_callback = atb.util.ReferenceUtil.applyDefaultValue(opt_complete_callback, null);
	
	var animInfo = this.getOption_(animName);
	
	var duration = atb.util.ReferenceUtil.applyDefaultValue(animInfo["duration"], 0);
	var easingMethod = atb.util.ReferenceUtil.applyDefaultValue(animInfo["easing"], null);
	
	if (!atb.util.LangUtil.forceBoolean(animInfo["bEnabled"], true))
	{
		duration = 0;//treat disabled animations as zero-duration animations (do them "instantly"-ish)
	}
	//Q: if we don't have a "toStyle", should we just abort the animation and skip to the end-result/callback...?
	//	... or maybe kill the duration...!?
	
	var toStyle = atb.util.ReferenceUtil.mergeOptions(animInfo["toStyle"], {});
	jQuery(this.glassPaneEffect).animate(toStyle, duration, easingMethod, opt_complete_callback);
};

/**
 * @private
 * takes a variable number of arguments and resolves that property path in our options settings object.
**/
atb.widgets.GlassPane.prototype.getOption_ = function(/* ... arguments*/)
{
	var args = [];
	for(var i=0, l=arguments.length; i<l; i++)
	{
		args.push(arguments[i]);
	}
	var ret = this.options;
	for(var i=0,l=args.length; i<l; i++)
	{
		var key = args[i];
		ret=ret[key];
	}
	return ret;
};



/**
 * all of our default settings:
**/
atb.widgets.GlassPane.prototype.DefaultGlassPaneOptions = {
	//Note: I think we need quotes here, else we risk property names changing, if we eventually compile with google closure and advance settings...!
	
	"baseZIndex": 999999999999,
	"baseCssClass": "atb-widgets-glasspane-common",
	
	"glassPane": {
		"cssClassName": "atb-widgets-glasspane-glassPane",
		"deltaZIndex": 0,
		"nodeTagName": "div"
	},
	
	"glassPaneEffect": {
		"cssClassName": "atb-widgets-glasspane-glassPaneEffect",
		"deltaZIndex": +1,
		"nodeTagName": "div",
		
		"initialOpacity": 0
	},
	
	"glassPaneChildContainer": {
		"cssClassName": "atb-widgets-glasspane-glassPaneChildContainer",
		"deltaZIndex": +2,
		"nodeTagName": "div"
	},
	
	"showAnim": {
		"bEnabled": false,//true,
		"duration": 150, //milliseconds?
		"easing": null, //use jquery builtin default easing function 
		"toStyle": {
			"opacity": 0.00//0.15	//15% opacity
		}
	},
	
	"hideAnim": {
		"bEnabled": false,
		"duration": 150,
		"easing": null, //use jquery builtin default easing function
		"toStyle": {
			"opacity": 0.00 //0% opacity
		}
	}
};



/*
//originally, i thought we might need this to position popup menus by having this be a child of stuff, but that turned out to be unneeded...
atb.widgets.GlassPane.prototype.getChildContainer = function()
{
	return this.glassPaneChildContainer;
};
*/
