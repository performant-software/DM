goog.provide("atb.widgets.ForegroundMenuDisplayer");

goog.require("atb.widgets.GlassPane");

goog.require("goog.events.EventType");

atb.widgets.ForegroundMenuDisplayer = function(menuCreatorFunc, opt_domHelper, opt_glassPaneOptions, opt_dismissCallback)
{
    this.glassPane = new atb.widgets.GlassPane(opt_domHelper, opt_glassPaneOptions);
	this.dismissCallback = atb.util.ReferenceUtil.applyDefaultValue(opt_dismissCallback, null);
	
	
	var menuParentCssClassName = "atb-ui-viewer-simplemarkereditor-popupdiv";//HACK
    
    this.menuParentDiv = this.glassPane.createChildWithClasses("div", [menuParentCssClassName]);
    
	this.menu = menuCreatorFunc(this.menuParentDiv);
	this.bDismissed = false;
	
	var jqGlass = jQuery(this.glassPane.getGlassPane());
	
	var self = this;
	jqGlass.focusout(function()
	{
		if (!self.bDismissed)
		{
			self.glassPane.requestFocus();
		}
	});
	
	
	var dismissMenu = function()
	{
		self.bDismissed = true;
		self.menu.hide();
		self.glassPane.hide();
		
		if (self.dismissCallback !== null)
		{
			self.dismissCallback();
		}
	};
	this.dismiss = dismissMenu;//HACK
	
	this.menu.addMenuItemListener(function(menuItem)
	{
		dismissMenu();
	});
	
	//this.glassPane.listenOnce(goog.events.EventType.CLICK, function(clickEvent)
	//this.glassPane.listenOnce(goog.events.EventType.MOUSEDOWN, function(mouseEvent)
	this.glassPane.listen(goog.events.EventType.MOUSEDOWN, function(mouseEvent)
	{
		dismissMenu();
	});
	
	
};

atb.widgets.ForegroundMenuDisplayer.prototype.getMenu = function()
{
	return this.menu;
};

atb.widgets.ForegroundMenuDisplayer.prototype.getGlassPane = function()
{
	return this.glassPane;
};

atb.widgets.ForegroundMenuDisplayer.prototype.show = function (){
    this.getGlassPane().show();
    this.getGlassPane().requestFocus();
};

atb.widgets.ForegroundMenuDisplayer.prototype.hide = function()
{
	this.getGlassPane().hide();
};