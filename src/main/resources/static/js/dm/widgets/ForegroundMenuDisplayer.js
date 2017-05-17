goog.provide("dm.widgets.ForegroundMenuDisplayer");

goog.require("dm.widgets.GlassPane");

goog.require("goog.events.EventType");

dm.widgets.ForegroundMenuDisplayer = function(menuCreatorFunc, opt_domHelper, opt_glassPaneOptions, opt_dismissCallback)
{
    this.glassPane = new dm.widgets.GlassPane(opt_domHelper, opt_glassPaneOptions);
	this.dismissCallback = dm.util.ReferenceUtil.applyDefaultValue(opt_dismissCallback, null);
	
	
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

dm.widgets.ForegroundMenuDisplayer.prototype.getMenu = function()
{
	return this.menu;
};

dm.widgets.ForegroundMenuDisplayer.prototype.getGlassPane = function()
{
	return this.glassPane;
};

dm.widgets.ForegroundMenuDisplayer.prototype.show = function (){
    this.getGlassPane().show();
    this.getGlassPane().requestFocus();
};

dm.widgets.ForegroundMenuDisplayer.prototype.hide = function()
{
	this.getGlassPane().hide();
};