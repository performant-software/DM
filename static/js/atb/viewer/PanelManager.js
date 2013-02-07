//TODO: maybe refactor other viewers into subpackages/etc...?
//or rename editors...?
goog.provide("atb.viewer.PanelManager");

/**
 * @fileoverview This represents the "singleton" of a given panel 
 * application. There can be more than one of them per page (in theory)
 * so its not a true singleton in the technical sense, but there are 
 * no predefined interactions BETWEEN panelManagers, so within a
 * given interaction group of panelContainers, its intended to serve as
 * a sort of singleton. Note also that odd things could happen with
 * keyfocus if more than one of these were on a page, so its recommended
 * that one tries to avoid that.
 *
 * @author John O'Meara
**/


goog.require("goog.structs.Map");
goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.StyleUtil");

goog.require('atb.util.OrderedSet');

goog.require('goog.array');

atb.viewer.PanelManager = function(set_clientApp) {
	this.clientApp = set_clientApp;
	
	this.panelList = [];
	this.panelMap = new goog.structs.Map();
	this.activePanel = null;
	this.bRegisteredGlobalHandlers = false;
	this.defaultAuxKeyboardHandler = null;//lolfor unhandled keystuff...appbaselol..?!
    
    this.viewerThumbnails = new atb.util.OrderedSet(null, function (element) {
                                                        if (goog.isFunction(element.getUid)) {
                                                            return element.getUid();
                                                        }
                                                        else {
                                                            return goog.getUid(element);
                                                        }
                                                    });
    this.openedViewers = new atb.util.OrderedSet(null, function (element) {
                                                        if (goog.isFunction(element.getUid)) {
                                                            return element.getUid();
                                                        }
                                                        else {
                                                            return goog.getUid(element);
                                                        }
                                                    });
};

atb.viewer.PanelManager.prototype.addPanelSlot = function(newPanelContainer)
{
	newPanelContainer.setPanelManager(this);//lol!
	this.panelList.push(newPanelContainer);

	var panelSlotName  = newPanelContainer.getPanelContainerName();
	if (!atb.util.ReferenceUtil.isBadReferenceValue(panelSlotName))
	{
		this.panelMap.set(panelSlotName, newPanelContainer);
	}
	
	//hack - auto-default to first panel:
	if (this.activePanel === null)
	{
		this.activePanel = newPanelContainer;//lolhack!
	}
};

atb.viewer.PanelManager.prototype.removePanelSlotByName = function (panelName) {
	goog.array.remove(this.panelList, this.getPanelNamed(panelName));//Need to do this BEFORE removing it from the named list!
    this.panelMap.remove(panelName);
    
    //goog.array.remove(this.panelList, this.getPanelNamed(panelName));
};

atb.viewer.PanelManager.prototype.removePanelSlot = function (panelContainer) {
    this.panelMap.remove(panelContainer.getPanelContainerName());
    
    goog.array.remove(this.panelList, panelContainer);
};

atb.viewer.PanelManager.prototype.setActivePanel = function(panelContainerNameOrPanelContainer)
{
	var panelObj = panelContainerNameOrPanelContainer;
	if (typeof(panelContainerNameOrPanelContainer)=="string")//Will this actually work correctly...???
	{
		panelObj = this.panelMap.get(panelContainerNameOrPanelContainer);
	}
	else
	{
	}
	
	//TODO: double check that sanity of the panelObj variable's value here... both for validity and ownership by this manager...??!?
	this.activePanel = panelObj;
};

atb.viewer.PanelManager.prototype.getActivePanel = function()
{
	return this.activePanel;
};

atb.viewer.PanelManager.prototype.registerGlobalHandlers = function()
{
	if (this.bRegisteredGlobalHandlers)
	{
		return;
	}
	this.bRegisteredGlobalHandlers = true;
	
	
	this.registerKeyboardHandlers_();
};


atb.viewer.PanelManager.prototype.onHandleKeyUp_ = function(keyEvent)
{
	var UNHANDLED = true;////??
	var HANDLED = false;//hackol
	
	var activePanel = this.getActivePanel();
	if (activePanel !== null)
	{
		if (activePanel.handleKeyUp(keyEvent))
		{
			return HANDLED;
		}
	}
	var auxKeyHandler = this.defaultAuxKeyboardHandler;
	if (auxKeyHandler !== null)
	{
		if (auxKeyHandler(keyEvent))
		{
			return HANDLED;
		}
	}
	return UNHANDLED;
};

atb.viewer.PanelManager.prototype.registerKeyboardHandlers_ =function()
{
	if (!this.bRegisteredKeyEvents)
	{
		this.bRegisteredKeyEvents = true;
		
		var self = this;
		jQuery(document).keyup(
			function(keyEvent)
			{
				return self.onHandleKeyUp_(keyEvent);
			}
		);
	}
};

atb.viewer.PanelManager.SEARCH_FIELD = 'headerSearch';

atb.viewer.PanelManager.prototype.registerSearchField = function () {
    //this.searchField = new atb.ui.AutoComplete.Search(this.webService, atb.viewer.PanelManager.SEARCH_FIELD);
};

atb.viewer.PanelManager.prototype.getPanelNamed = function(panelContainerName)
{
	var ret = this.panelMap.get(panelContainerName);
	ret = atb.util.ReferenceUtil.applyDefaultValue(ret, null);
	return ret;
};

atb.viewer.PanelManager.prototype.hasPanelNamed = function(panelContainerName)
{
	return (this.getPanelNamed(panelContainerName) !== null);
};

atb.viewer.PanelManager.prototype.getAllPanels = function()
{
	return this.panelList;
};

atb.viewer.PanelManager.prototype.getAnotherPanel = function(notThisPanelObject)
{
	var ret = null;
	var arr = this.getAllPanels();
        
        // First, try to return a blank panel
        for (var i in arr) {
            var panel = arr[i];
            
            if (! panel.getViewer()) {
                return panel;
            }
        }
        
        // Then, try not to return the active panel (the one with the newest viewer)
        for (var i in arr) {
            var panel = arr[i];
            
            if (panel !== this.activePanel && panel !== notThisPanelObject) {
                return panel;
            }
        }
        
        // Otherwise, just don't return notThisPanelObject
	for (var i =0, l = arr.length; i<l; i++)
	{
		var testPanel = arr[i];
		if (testPanel !== notThisPanelObject)
		{
			return testPanel;
		}
	}
	return null;
};

atb.viewer.PanelManager.prototype.getWebService = function()
{//^possibly/probably deprecated...
	//return this.webService;//lol!hack
	return this.clientApp.getWebService();
};

atb.viewer.PanelManager.prototype.getStyleRoot = function()
{//^probably deprecated...

	return this.clientApp.getStyleRoot();
	//return this.styleRoot;
};

atb.viewer.PanelManager.prototype.getClientApp = function()
{
	//Q: do we REALLY want to be returning these in this class... (maybe only pass it to our containers...?)
	return this.clientApp;
};

atb.viewer.PanelManager.prototype.withAppropriatePanel = function (findId, currentPanel, handler, opt_handlerScope, opt_locationMessage) {
    var allPanels = this.getAllPanels();
    handler = atb.Util.scopeAsyncHandler(handler, opt_handlerScope);
    
    var correctPanel;
    
    var swapPanels = (opt_locationMessage == atb.resource.ResourceSummary.HANDLER_MSG.swapPanels);
    var newWindow = (opt_locationMessage == atb.resource.ResourceSummary.HANDLER_MSG.newWindow);
    
    if (! swapPanels && ! newWindow) {
        for (var i=0, len=allPanels.length; i<len; i++) {
            var panel = allPanels[i];
            var viewer = panel.getViewer();
            
            if (viewer && (viewer.resourceId == findId)) {
                correctPanel = panel;
                break;
            }
        }
        
        if (! correctPanel) {
            correctPanel = currentPanel;
        }
        
        handler(correctPanel);
    }
    else if (swapPanels) {
        correctPanel = this.getAnotherPanel(currentPanel);
        handler(correctPanel);
    }
    else if (newWindow) {
        //this.openPopoutPanel(handler, opt_scope);
    }
    else {
        correctPanel = currentPanel;
        handler(correctPanel);
    }
};

atb.viewer.PanelManager.prototype.registerViewerThumbnail = function (thumbnail) {
    this.viewerThumbnails.add(thumbnail);
    
    this.clientApp.viewerThumbnailTimeline.setThumbnails(this.viewerThumbnails.getValues());
};

atb.viewer.PanelManager.prototype.unregisterViewerThumbnail = function (thumbnail) {
    this.viewerThumbnails.remove(thumbnail);
};

atb.viewer.PanelManager.prototype.registerViewer = function (viewer) {
    this.openedViewers.add(viewer);
};

/**
 * Returns whether a given viewer is visible in a panel container
 * @param viewer {atb.viewer.Viewer}
 * @param opt_compareByUid {boolean} true if viewers should be compared by calling their getUid() function, rather than by pointer
 * @return {boolean}
 */
atb.viewer.PanelManager.prototype.isViewerVisible = function (viewer, opt_compareByUid) {
    var equals;
    if (opt_compareByUid) {
        equals = function (a, b) {
            return a.getUid() == b.getUid();
        }
    }
    else {
        equals = function (a, b) {
            return a == b;
        }
    }
    
    for (var i=0; i<this.panelList.length; i++) {
        var panel = this.panelList[i];
        
        if (equals(viewer, panel.viewer)) {
            return true;
        }
    }
    
    return false;
};