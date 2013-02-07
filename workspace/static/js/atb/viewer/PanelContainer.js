goog.provide("atb.viewer.PanelContainer");

/**
 * @fileoverview A container for viewer/editor/ect panels
 * these are managed by a PanelManager. Each represents a slot
 * in which some kind of panel can be shown.
 *
 * @author John O'Meara
**/

//TODO: track down a possible but with titles when/after saving editor/markereditors...?

goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugUtil");

goog.require("atb.widgets.IMenu");
goog.require("atb.widgets.MenuItem");
goog.require("atb.widgets.Toolbar");
goog.require("atb.widgets.VerticalToolbar");
goog.require("atb.widgets.MenuUtil");

goog.require('goog.dom');
goog.require("atb.viewer.UndoStack");//lolhack

goog.require("atb.util.StyleUtil");//.includeStyleSheetOnce

goog.require('goog.editor.Field');
goog.require('goog.events');
goog.require('jquery.jQuery');
goog.require("atb.viewer.ResourceListViewer");
goog.require("atb.ClientApp");
goog.require('goog.dom.DomHelper');

goog.require('atb.events.ViewerHasEnteredBackground');

atb.viewer.PanelContainer = function(set_panelName, opt_usingTag, opt_tabDiv, opt_extraMenuDefs, opt_document, opt_windowScaler)
{
	this.panelName = set_panelName;
	
	this.toolbarWidth = 36;

	this.tabTextCharsMax = 65;

    this.domHelper = new goog.dom.DomHelper(opt_document || window.document);
	
	opt_usingTag = atb.util.ReferenceUtil.applyDefaultValue(opt_usingTag, null);
	opt_extraMenuDefs = atb.util.ReferenceUtil.applyDefaultValue(opt_extraMenuDefs, {});
	
	if (opt_usingTag === null) {
		opt_usingTag = this.domHelper.createElement("div");
		this.domHelper.getDocument().body.appendChild(opt_usingTag);//hack
	};
	
	this.tabDiv = atb.util.ReferenceUtil.applyDefaultValue(opt_tabDiv, null);
	if (this.tabDiv !== null) {
		this.tabDiv = this.domHelper.getElement(this.tabDiv);
	}
    
	this.windowScaler = atb.util.ReferenceUtil.applyDefaultValue(opt_windowScaler, null);
	
	this.rootDiv = opt_usingTag;

    this.tabIsEditable = false;
	
	this.mnuForwardButton = null;
	this.mnuBackButton = null;
	
	this.panelManager = null;
	this.viewer = null;
	
	this.bSetToolbarHangingEnabled = false;
	this.bAlignStubLeft = true;//lolhack!
	
	//function(target, saveStateFunc, loadStateFunc):
	//hack, just for now: save the object references directly...lol!
	var saveHistoryFunc = function(targetPanelContainer)
	{
		return targetPanelContainer.viewer;//hack
	};
	var loadHistoryFunc = function(targetPanelContainer, oldState) {
		targetPanelContainer.setViewer_impl(oldState);//hack
	};
	this.history = new atb.viewer.UndoStack(this, saveHistoryFunc, loadHistoryFunc);
	
	this.bToolbarVisible = true;//hack
	
	
	this.baseDiv = this.domHelper.createElement("div");
	this.toolbarDivParent = this.domHelper.createElement("div");//the container for both parts of the "toolbar div"
	this.toolbarDiv = this.domHelper.createElement("div");//the traditional div for the vertical toolbar
	this.toolbarHoverHint = this.domHelper.createElement("div");//a div used to do the hover-show-magick-ery..
	
	this.tag = this.domHelper.createElement("div");
	
	var jqTag = jQuery(this.tag);
	jqTag.addClass("atb-panelcontainer-inner");
	jQuery(this.baseDiv).addClass("atb-panelcontainer-outer");
	
	this.toolbarDivParent.appendChild(this.toolbarHoverHint)
	this.toolbarDivParent.appendChild(this.toolbarDiv);
	
	this.baseDiv.appendChild(this.toolbarDivParent);
	this.baseDiv.appendChild(this.tag);
	
	this.rootDiv.appendChild(this.baseDiv);
	
	
	//toolbar hack:
	var menu_options = {
		cssRoot: this.getStyleRoot()
	};
	this.toolbar = new atb.widgets.VerticalToolbar( this.toolbarDiv, this.generatePanelToolbarItems(opt_extraMenuDefs));
	this.toolbar.setVisible(true);
	this.toolbar.setActivePane( this ); //HACK
	
	this.setToolbarVisible(true);

	this.setToolbarInsetLeft();//lolhack!

};

atb.viewer.PanelContainer.prototype.setToolbarInsetLeft = function()
{
	this.locateToolbarHanging(0,0, true, false);
};

atb.viewer.PanelContainer.prototype.setToolbarHangingLeft = function()
{
	var atX = 0;
	var atY = 0;
	this.locateToolbarHanging(atX,atY, true, true);
};

atb.viewer.PanelContainer.prototype.setToolbarHangingRight = function()
{
	var atX = 0; //this.rootDiv.offsetWidth;
	var atY = 0;
	this.locateToolbarHanging(atX,atY, false, true);
};

atb.viewer.PanelContainer.prototype.locateToolbarHanging=function(atX,atY, bAlignLeft, set_bSetHangingEnabled)
{//^Lolhack!
	
	set_bSetHangingEnabled = !!set_bSetHangingEnabled;
	bAlignLeft = !!bAlignLeft;
	
	this.bAlignStubLeft = bAlignLeft;
	
	if (set_bSetHangingEnabled)
	{
	}
	
	//at least its a fair big cleaner than before, already!:
	var jqTag = jQuery(this.tag);

	var style = this.toolbarDivParent.style;
	
	//style.position = "relative";
	//style.position = "absolute";

	//style.top = ""+atY+"px";
	if (bAlignLeft)
	{
        //style.left = ""+atX+"px";
        //style.right = null;
        this.toolbarDivParent.className = "atb-verticaltoolbar-wrapper-left";
	}
	else
	{
       // style.left = null;
        //style.right = ""+atX+"px";
        this.toolbarDivParent.className = "atb-verticaltoolbar-wrapper-right";
	}

	//this.bSetHangingEnabled = set_bSetHangingEnabled;
	this.bSetToolbarHangingEnabled = set_bSetHangingEnabled;
	
	if (this.bSetToolbarHangingEnabled)
	{
		//var noToolbarClass = "atb-panelcontainer-inner-when-toolbar-not-visible";
		//var yesToolbarClass = "atb-panelcontainer-inner-when-toolbar-visible";
		
		jqTag.removeClass(atb.viewer.PanelContainer.insetToolbarVisibleCssClassName);//yesToolbarClass);
		jqTag.addClass(atb.viewer.PanelContainer.insetToolbarNotVisibleCssClassName);//noToolbarClass);//hacklol!
	}
	else
	{
		this.setToolbarVisible(this.isToolbarVisible());//lolhack!
	}
};

atb.viewer.PanelContainer.insetToolbarNotVisibleCssClassName = "atb-panelcontainer-inner-when-toolbar-not-visible";
atb.viewer.PanelContainer.insetToolbarVisibleCssClassName= "atb-panelcontainer-inner-when-toolbar-visible";
	


atb.viewer.PanelContainer.prototype.StandardMenuDefs = {
	historyBackButton: 
	{
		name: "historyBackButton",
		icon: "atb-panelcontainer-button-back",
		action: function(actionEvent)
				{
					var panelContainer = actionEvent.getPane();//HACK
					panelContainer.historyGoBack();	
				}
	},
	
	historyForwardButton: 
	{ 
		name: "historyForwardButton",
		icon: "atb-panelcontainer-button-forward",
		action: function(actionEvent)
				{
					var panelContainer = actionEvent.getPane();//HACK
					panelContainer.historyGoForward();
				}
	},

	loadStandardSimpleMarkerEditorHereButton:
	{
		name: "show_markereditor_here_button",
		icon: "atb-panelcontainer-button-markereditor",
		action: function(actionEvent)
				{
					var panelContainer = actionEvent.getPane();//HACK
					panelContainer.loadStandardSimpleMarkerEditor(panelContainer);
				}
	},
	
	loadTextEditorHereButton:
	{
		name: "show_texteditor_here_button",
		icon: "atb-panelcontainer-button-texteditor",
		action: function(actionEvent)
				{
					var panelContainer = actionEvent.getPane();//HACK
					panelContainer.loadTextEditor(panelContainer, 'Add text here');
				}
	},
	
	loadResourceListViewerHereButton:
	{
		name: "show_resource_list_viewer_here_button",
		icon: "atb-panelcontainer-button-resourcelistviewer",
		action: function(actionEvent)
				{
					var panelContainer = actionEvent.getPane();//HACK
					//alert("TODO: show a resource list viewer here!!!");
					var newPanelContent;
					newPanelContent = panelContainer.loadResourceListViewer(panelContainer);
					
					//HACK - load some data (lol... this is very counter-intuitive when there is no loaded data as to why its not working!):
					var panelApp = panelContainer.getPanelManager();
					var webService = panelApp.getWebService();
                    var username = panelApp.clientApp.username;
					panelContainer.viewer.loadSummaries([username]);
					//End hack
				}
	},
    
    loadRDFBrowserHereButton: {
        name: "show_rdf_browser_here_button",
        icon: "atb-panelcontainer-button-rdfbrowser",
        action: function(actionEvent) {
            var panelContainer = actionEvent.getPane();
            var newPanelContent = panelContainer.loadRDFBrowser(panelContainer);
        }
    }
};

atb.viewer.PanelContainer.prototype.generatePanelToolbarItems = function(extra_menu_defs)
{
	var ret = [];
	
	if (this.mnuBackButton===null)
	{
		this.mnuBackButton =this.decodeMenuItem(this.StandardMenuDefs.historyBackButton);
	}
	
	if (this.mnuForwardButton===null)
	{	
		this.mnuForwardButton =this.decodeMenuItem(this.StandardMenuDefs.historyForwardButton);
	}
	
	this.refreshHistoryButtons();
	ret = [
		this.mnuForwardButton,
		this.mnuBackButton,
        this.decodeMenuItem(this.StandardMenuDefs.loadRDFBrowserHereButton),
		//this.decodeMenuItem(this.StandardMenuDefs.loadStandardSimpleMarkerEditorHereButton),
		this.decodeMenuItem(this.StandardMenuDefs.loadTextEditorHereButton),
		this.decodeMenuItem(this.StandardMenuDefs.loadResourceListViewerHereButton)
	];
	//	//loadResourceListViewerHereButton
	//atb-panelcontainer-button-resourcelistviewer
	for (var i=0, l=extra_menu_defs.length; i<l; i++)
	{
		var extraMenuDef = extra_menu_defs[i];
		var extraMenuItem = this.decodeMenuItem(extraMenuDef);
		ret.push(extraMenuItem);//lol!
	}
	return ret;
};


atb.viewer.PanelContainer.prototype.getPanelManager = function()
{
	return this.panelManager;//lolforgot this method!
};

atb.viewer.PanelContainer.prototype.setPanelManager = function(set_panelManager)
{//^TO BE USED BY PANELMANAGER ONLY!!!
	atb.debug.DebugUtil.debugAssertion(set_panelManager !== null, "null panelmanager set!");//lol...what of clearing them later-on...?!?
	//atb.viewer.PanelContainer
	var bCond = (this.panelManager === null);// || (this.panelManager ===set_panelManager)//nah...lets just go with the first part after-all...!
	atb.debug.DebugUtil.debugAssertion( bCond, "Warning: changing panelmanagers for a panelcontainer!!!");
	
	this.panelManager = set_panelManager;
//lolfriendclasses...???/methods...?	
};

atb.viewer.PanelContainer.prototype.handleKeyUp = function(keyEvent)
{
	if (this.viewer !== null)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(this.viewer.handleKeyUp))
		{
			var ret;
			ret = this.viewer.handleKeyUp(keyEvent);//hack
			ret = atb.util.ReferenceUtil.applyDefaultValue(ret, true);//HACK--default to handled if nothing returned...!?!
			return ret;
		}
		else
		{
			//NOTE: still reached!
			/*
			debugPrint("Warning: panel object lacks a handleKeyUp( keyEvent ) method!");
			*/
		}
	}
	return false;
};

atb.viewer.PanelContainer.prototype.setViewer = function(set_viewer)
{
	//this.storeHistory("viewer set");//lol hack..?
	if (this.viewer === set_viewer)
	{
		debugPrint("the same!");
		return;
	}
	
	if (this.viewer !== null)
	{
		//debugPrint("saving viewer!");
		this.historyStore("viewer set");//lol hack..?
	}
	else
	{
		//debugPrint("null current viewer!");
	}

	return this.setViewer_impl(set_viewer);
};

//this doesn't invoke history, unlike setViewer:
atb.viewer.PanelContainer.prototype.setViewer_impl = function (set_viewer) {
    if (set_viewer === this.viewer) {
        return;//no change!
    }
    
    this.setTitle(' ');

    var clientApp = this.getPanelManager().getClientApp();

    var useChildContainer = this.tag;

    if (this.viewer !== null) {
        var unloadedEvent = new atb.events.ViewerHasEnteredBackground(this.viewer, this);
        this.viewer.dispatchEvent(unloadedEvent);
        clientApp.getEventDispatcher().dispatchEvent(unloadedEvent);
        
        var oldViewerNode = this.viewer.getElement();

        if (!atb.util.ReferenceUtil.isBadReferenceValue(oldViewerNode)) {
            if (oldViewerNode.parentNode === useChildContainer) {
                useChildContainer.removeChild( oldViewerNode );
            }
        }
        
        this.viewer.setPanelContainer(null);//HACK
    }

    this.viewer = set_viewer;
    if (set_viewer != null) {
        set_viewer.setPanelContainer(this);
        
        set_viewer.render();
        var childNode = set_viewer.getElement();
        if (!atb.util.ReferenceUtil.isBadReferenceValue(childNode))
        {
            useChildContainer.appendChild(childNode);
        }
        
        set_viewer.finishRender();
                    
        this.getPanelManager().setActivePanel(this);
        
        this.tryInvokeMethodWrapper_(this.viewer, "onPaneLoaded")();//HACK!
        
        this.getPanelManager().registerViewer(set_viewer);
    }

    if(!(atb.util.ReferenceUtil.isBadReferenceValue(this.windowScaler))) {
        this.windowScaler.scale();
    }
};

atb.viewer.PanelContainer.prototype.getViewer = function()
{
	return this.viewer;
};

atb.viewer.PanelContainer.prototype.getDomElement = function()
{
	return this.tag;
};

atb.viewer.PanelContainer.prototype.getPanelContainerName = function()
{
	return this.panelName;
};

atb.viewer.PanelContainer.prototype.setTitle = function (text)
{
	if(this.tabDiv !== null)
	{
        var textEdit = "";
        if(text != "") {
            // set title as real text in case we truncate
            // we'll pull from the title attribute from now on to get real title
            this.tabDiv.title = text

            // if window scaling is activated for the panel
            // then we can try the smart truncate from scaler
            if(this.windowScaler !== null) {
                textEdit = this.windowScaler.getTruncatedTitle(this.tabDiv, text);
            // otherwise we'll fall back on a default truncation
            } else if(text.length > this.tabTextCharsMax) {
                textEdit = text.substr(0, this.tabTextCharsMax) + "...";
            // and if not that we'll just use text as is
            } else {
                textEdit = text;
            }
        }
        this.tabDiv.innerHTML = textEdit;
	}
	else
	{
		debugPrint("PanelContainer::setTitle('"+text+"'): tabDiv is null!");
	}
    if (this.isInPopup()) {
        this.domHelper.getDocument().title = text;
    }
};

atb.viewer.PanelContainer.prototype.isInPopup = function () {
    return this.domHelper.getDocument() != window.document;
};

atb.viewer.PanelContainer.prototype.setTitleEditable = function (makeEditable) {
    if(makeEditable == this.tabIsEditable) {
        return;
    }

	//THIS does not actually work!:
    //if (!(this.viewer && this.viewer.onTitleChange)) {
	if (!(this.viewer && this.viewer.onTitleChanged)) {
        throw "Current viewer does not implement onTitleChanged(newTitle), or viewer is null";
    }

    //this.editableTitleField = new goog.editor.Field(this.tabDiv);

    if (makeEditable) {
        this.tabIsEditable = true;

        //this.editableTitleField.makeEditable();
		if (this.tabDiv !== null)
		{
			goog.events.listenOnce(this.tabDiv, goog.events.EventType.CLICK, this.replaceTabWithField_, false, this);
		}

    }
    else {
        //this.editableTitleField.makeUneditable();
		if (this.tabDiv !== null)
		{
			goog.events.unlisten(this.tabDiv, goog.events.EventType.CLICK, this.replaceTabWithField_, false, this);
		}

        this.tabIsEditable = false;
    }
};

atb.viewer.PanelContainer.prototype.unFocusTitle = function () {
    if(this.titleField) {
        this.replaceFieldWithTab_();
    }
};

atb.viewer.PanelContainer.prototype.replaceTabWithField_ = function ()
{
	if (this.tabDiv !==null)
	{
		var oldContent = jQuery(this.tabDiv).attr('title'); // use title in case text is truncated in tab
		oldContent = jQuery.trim(oldContent);
		jQuery(this.tabDiv).text('');

		this.titleField = goog.dom.createElement('input', {'type':'text', 'style':'display:none;'}, null);
		jQuery(this.tabDiv).append(this.titleField);

		this.titleField.value = oldContent;

		this.titleField.focus();

		goog.events.listen(this.titleField, goog.events.EventType.BLUR,
			this.replaceFieldWithTab_, false, this);

		goog.events.listen(this.titleField, goog.events.EventType.KEYDOWN, this.tabHandleInput_, false, this);
	}
	else
	{
		debugPrint("PanelContainer::replaceTabWithField_(): null this.tabDiv!");
	}
};

atb.viewer.PanelContainer.prototype.replaceFieldWithTab_ = function ()
{
	if (this.tabDiv !== null)
	{
		jQuery(this.titleField).hide();
		var newContent = this.titleField.value;
		this.titleField.value = '';

        this.setTitle(newContent); // call set title 

		goog.events.listenOnce(this.tabDiv, goog.events.EventType.CLICK, this.replaceTabWithField_, false, this);

		//this.viewer.onTitleChange
		//this.viewer.onTitleChange(newContent);//why not past tense..?
		this.viewer.onTitleChanged(newContent);//Note: changed this to PAST-tense
	}
	else
	{
		debugPrint("PanelContainer::replaceFieldWithTab_(): null this.tabDiv!");
	}
}

atb.viewer.PanelContainer.prototype.tabHandleInput_ = function (e) {
    if(e.keyCode == goog.events.KeyCodes.ENTER) {
        e.preventDefault();
        e.stopPropagation();

        this.replaceFieldWithTab_();
    }
};

atb.viewer.PanelContainer.prototype.historyStore = function(caption)
{
	//this.history.pushUndo(caption);//GAH!BAD!
	this.history.recordUndoAction(caption);
	
	this.refreshHistoryButtons();
};

atb.viewer.PanelContainer.prototype.historyGoBack = function()
{
    var clientApp = this.getPanelManager().getClientApp();
    var oldViewer = this.viewer;
    
	var ret;
	ret = this.history.undo();
	this.refreshHistoryButtons();
        
	return ret;
};

atb.viewer.PanelContainer.prototype.historyGoForward = function()
{
	//return this.history.redo();
	var ret;
	ret = this.history.redo();
	this.refreshHistoryButtons();
    
	return ret;
	//^Lolstalol!
};


atb.viewer.PanelContainer.prototype.isToolbarVisible = function()
{
	return this.bToolbarVisible;
};

atb.viewer.PanelContainer.prototype.setToolbarVisible = function(bShowToolbar)
{
	bShowToolbar = !!bShowToolbar;
	this.bToolbarVisible = bShowToolbar;
	//atb-panelcontainer-inner-when-toolbar-visible
	//atb-panelcontainer-inner-when-toolbar-not-visible
	var jqTag = jQuery(this.tag);
	var addClassNamed, removeClassNamed;
	//atb.viewer.PanelContainer.insetToolbarVisibleCssClassName
	//atb.viewer.PanelContainer.insetToolbarNotVisibleCssClassName
	if(this.bToolbarVisible)
	{
		addClassNamed    = atb.viewer.PanelContainer.insetToolbarVisibleCssClassName;
		removeClassNamed = atb.viewer.PanelContainer.insetToolbarNotVisibleCssClassName
	
		//jQuery(this.tag)
		//if (!this.bSetToolbarHangingEnabled)
		//{
		//jqTag.addClass("atb-panelcontainer-inner-when-toolbar-visible");
		//jqTag.removeClass("atb-panelcontainer-inner-when-toolbar-not-visible");
		
		//this.toolbar.show();
	}
	else
	{
		removeClassNamed = atb.viewer.PanelContainer.insetToolbarVisibleCssClassName;
		   addClassNamed = atb.viewer.PanelContainer.insetToolbarNotVisibleCssClassName
	
		//jqTag.addClass("atb-panelcontainer-inner-when-toolbar-not-visible");
		//jqTag.removeClass("atb-panelcontainer-inner-when-toolbar-visible");
		
		//this.toolbar.hide();
	}
	
	if (!this.bSetToolbarHangingEnabled)
	{
		//jqTag.addClass("atb-panelcontainer-inner-when-toolbar-visible");
		//jqTag.removeClass("atb-panelcontainer-inner-when-toolbar-not-visible");
		jqTag.addClass(addClassNamed);
		jqTag.removeClass(removeClassNamed);
	}
	else
	{
		//lol...remove both:
		jqTag.remove(addClassNamed);
		jqTag.removeClass(removeClassNamed);
	}
	
	this.toolbar.setVisible(this.bToolbarVisible);
	
	
	if (this.viewer)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(this.viewer.onRefresh))
		{
			this.viewer.onRefresh();//hack
		}
	}
		
		
	/*if (bShowToolbar)
	{
	}
	else
	{
	}*/
};

atb.viewer.PanelContainer.prototype.tryInvokeMethodWrapper_=function(obj, methodName)
{
	return function()//takes args and passes them magically to the wrapped function if it exists...!
	{
		var func = obj[methodName];
		if (!atb.util.ReferenceUtil.isBadReferenceValue(func))
		{
			return func.apply(obj, arguments);
		}
		else
		{
			return false;//hack
		}
		//atb.viewer.PanelContainer.prototype.getStyleRoot
	};
};

atb.viewer.PanelContainer.prototype.getStyleRoot = function()
{
	if (this.panelManager === null) {
		return atb.util.StyleUtil.DEFAULT_CSS_ROOT;
	}
	else {
		return this.panelManager.getStyleRoot();
	}
};

atb.viewer.PanelContainer.prototype.refreshHistoryButtons = function()
{
	if (this.mnuBackButton !== null)
	{
		this.mnuBackButton.setEnabled(this.history.canUndo());
	}
	if (this.mnuForwardButton !== null)
	{
		this.mnuForwardButton.setEnabled(this.history.canRedo());
	}
	//this.historyCanGoBack());
	//this.mnuBackButton.setEnabled(this.historyCanGoBack());
	//mnuForwardButton
	//mnuBackButton
}

atb.viewer.PanelContainer.prototype.loadStandardSimpleMarkerEditor = function(intoPanel)
{
	var panelContainer = intoPanel;//Container//hack
	var panelApp = panelContainer.getPanelManager();
	//var webService = panelApp.getWebService();//hack
	var clientApp = panelApp.getClientApp();
	
	//var augmentedMenuItems = [];
	//var partenerDiv = null;
	
	var markerEditor;
	//markerEditor = new atb.viewer.StandardSimpleMarkerEditor(clientApp);//, augmentedMenuItems);
	markerEditor = new atb.viewer.StandardSimpleMarkerEditor(clientApp,null,null,this.getDomHelper());//, augmentedMenuItems);
		//webService,
		//null,
		//augmentedMenuItems,
		//partenerDiv
	//);
	
	panelContainer.setViewer(markerEditor);
	
	var whichMapNumber = 1;//cotton map
	markerEditor.loadBackgroundImage(whichMapNumber);
	markerEditor.loadMarkersFromMapDocument("storage.php");
	return markerEditor;
};

atb.viewer.PanelContainer.prototype.loadTextEditor = function(intoPanel, withFillerText)
{
	withFillerText = atb.util.ReferenceUtil.applyDefaultValue(withFillerText, null);
	
	
	
	var panelContainer = intoPanel;//hack
	
	
	var panelApp = panelContainer.getPanelManager();
	//var webService = panelApp.getWebService();//hack
	//var styleRoot = panelContainer.getStyleRoot();//HACK!
	var clientApp = panelApp.getClientApp();
	//var partenerDiv2 = null; //HACK
	//var textEditor = new atb.viewer.Editor(webService, styleRoot, withFillerText, partenerDiv2);
	//var textEditor = new atb.viewer.Editor(this.getClientApp(), withFillerText)
	var textEditor = new atb.viewer.Editor(clientApp, withFillerText);
        textEditor.saveContents();
	panelContainer.setViewer(textEditor);
};

atb.viewer.PanelContainer.prototype.getDefaultFillerTextHack_ = function()
{
	var strLoremIpsumXMany = "Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. ";
	var fillerText = strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany;
	return fillerText;
};


/*
	new atb.widgets.MenuItem(
			"show_markereditor_here_button",
			domGeneratorGenerator("atb-panelcontainer-button-markereditor"),
			function(actionEvent)
			{
				var panelContainer = actionEvent.getPane();//HACK
				panelContainer.loadStandardSimpleMarkerEditor(panelContainer);
			}
		),
	*/
atb.viewer.PanelContainer.prototype.decodeMenuItem = function(menuItemDef)
{
	var usingTheDomGeneratorGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	var alsoAddStyle = "atb-panelcontainer-button";
	var styleFuncA = usingTheDomGeneratorGenerator(alsoAddStyle);
	
	var domGeneratorGenerator =function(defaultStyle)
	{
		var styleFuncB = usingTheDomGeneratorGenerator(defaultStyle);
		return function(menuItem, opt_div)
		{
			opt_div = styleFuncA(menuItem, opt_div);
			opt_div = styleFuncB(menuItem, opt_div);
			return opt_div;
		};
	};
	
	////var bEnabled = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef, true);
	var bEnabled = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.bEnabled, true);
	var tooltip = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.tooltip, null);
	var buttonGroup = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.buttonGroup, null);
	var actionHandler = atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.action, 
			atb.util.ReferenceUtil.applyDefaultValue(menuItemDef.actionHandler, null)
	);
	atb.debug.DebugUtil.debugAssertion(actionHandler!=null, "[panelcontainer]: null actionhandler for menuitemdef! name="+menuItemDef.name);
	
	//true;//hack
	
	var ret = new atb.widgets.MenuItem(
		menuItemDef.name,
		domGeneratorGenerator(menuItemDef.icon),//style class...lol!
		actionHandler,//menuItemDef.action,
		tooltip,
		buttonGroup,
		bEnabled
	);
	return ret;
};

atb.viewer.PanelContainer.prototype.loadResourceListViewer = function(intoPanel)
{
	var panelContainer = intoPanel;
	var panelApp = panelContainer.getPanelManager();
	var clientApp = panelApp.getClientApp();
	var newPanelContent;
    
	newPanelContent = new atb.viewer.Finder(clientApp);
	
	panelContainer.setViewer(newPanelContent);
	return newPanelContent;
};

atb.viewer.PanelContainer.prototype.loadRDFBrowser = function (intoPanel) {
    var panelContainer = intoPanel;
    var panelApp = panelContainer.getPanelManager();
    var clientApp = panelApp.getClientApp();
    
    var newPanelContent = new atb.viewer.RepoBrowser(clientApp);
    
    panelContainer.setViewer(newPanelContent);
    return newPanelContent;
};

atb.viewer.PanelContainer.prototype.setTabContents = atb.viewer.PanelContainer.prototype.setTitle;//HACK - too many things still refer to this by name!

atb.viewer.PanelContainer.prototype.disableToolbars = function()
{
	this.toolbar.setVisible(false);
};

atb.viewer.PanelContainer.prototype.autoHideToolbars = function()
{
	//bSetToolbarHangingEnabled
	if (!this.bSetToolbarHangingEnabled)
	{
		//this would probably be pretty ugly:
		debugPrint("autoHideToolbars doesn't work with inset toolbars!!!");
		return;
	}
	
	var self =this;
	
	this.toolbar.setVisible(false);
	
	var hint = "";

	hint += "<span>";
	hint += "+";
	hint += "</span>";
	var borderWidth = 1;

	this.toolbarHoverHint.innerHTML = hint;

	
	var style;
	style = this.toolbarHoverHint.style;
    var cssClasses = "";
	if (this.bAlignStubLeft)
	{
	}
	else
	{
	}

	var jqHoverObj = jQuery(this.toolbarHoverHint);
	//jqHoverObj.addClass("goog-toolbar");
	jqHoverObj.addClass("atb-verticaltoolbar-hint");

	//"goog-toolbar");
	jqHoverObj.hover(function()
	{
		jqHoverObj.hide();
		self.toolbar.setVisible(true);
		//debugPrint("SHOW");
	});
	
	//jQuery(this.toolbarDiv).mouseout(function()
	jQuery(this.toolbarDiv).mouseleave(function()//lol!-better than out!!!
	{
		jqHoverObj.show();
		self.toolbar.setVisible(false);
		//debugPrint("HIDE");
	});
};

atb.viewer.PanelContainer.prototype.getDomHelper = function () {
    return this.domHelper;
};

atb.viewer.PanelContainer.prototype.onNudgeContent = function()
{
	var func = null;
	try
	{
		func = this.viewer.onNudge;
	}
	catch(err)
	{
		func = null;
	}
	if (func !== null)
	{
		func.call(this.viewer);
	}
};

atb.viewer.PanelContainer.prototype.registerViewerThumbnail = function (thumbnail) {
    return this.panelManager.registerViewerThumbnail(thumbnail);
};