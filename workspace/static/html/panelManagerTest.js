goog.require("atb.viewer.PanelManager");
goog.require("atb.viewer.PanelContainer");
//goog.require('atb.DMWebService');

goog.require("atb.viewer.StandardSimpleMarkerEditor");
//goog.require("goog.math.Size");

goog.require("atb.viewer.Editor");
goog.require("atb.widgets.MenuUtil");

goog.require("atb.ClientApp");

var app = null;

//TODO: kill the default content of the left/right panes probably and let the panels add the children of those tags themselves as they see fit, during their
//          tenure of their panelcontainer's tag...
//			maybe wrap them in another child tag that they "keep" owning and stops being a child when it moves...??

function initPanelManagerTestApp()
{
	var markerEditor;
	var textEditor;
	
	//var styleRoot = "../css/";//lolhack!--todo pass this to stuff like the style sheet loader...????!?
	var clientApp = new atb.ClientApp();
	
	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
	//var webService = new atb.DMWebService(webServiceURI);
	//var styleRoot = webService.getCssRoot();
	var app = clientApp.getPanelManager();
	var webService = clientApp.getWebService();
	
	//app = new atb.viewer.PanelManager();
	//app = new atb.viewer.PanelManager(webService);
	//app = new atb.viewer.PanelManager(webService, styleRoot);
	
	var leftTabId = "leftPane";
	var rightTabId = "rightPane";
	var leftContainer = new atb.viewer.PanelContainer("leftPane", document.getElementById(leftTabId));
	var rightContainer = new atb.viewer.PanelContainer("rightPane", document.getElementById(rightTabId));
	
	app.addPanelSlot(leftContainer);
	app.addPanelSlot(rightContainer);
	
	var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	var mnuOpenMarkerViewerInOtherPane = 
			new atb.widgets.MenuItem(
				"loadMarkerViewerIntoAnotherPane", 
				createButtonGenerator("atb-markereditor-button-redo"),
				function(actionEvent)
				{
					var pane = actionEvent.getPane();//hack...?!?
					//or lol pane as 'this'...?=todo...?maybelol..?gah!
					
					var menu =actionEvent.getMenu();
					
					var panelContainer =pane.getCurrentPanelContainer();
					//currentPanel;
					var panelManager = panelContainer.getPanelManager();
					var otherContainer = panelManager.getAnotherPanel(panelContainer);
					
					if (otherContainer === null) {alert("only one panel container!"); return;}
					var viewer = new atb.viewer.MarkerViewer(clientApp);
					//	webService						
						//, new goog.math.Size(460, 475)
					//);
					otherContainer.setViewer( viewer );
					
					var whichOtherMapNumber = 3;//another other map...
					viewer.loadBackgroundImage(whichOtherMapNumber);
		
					pane.dismissContextMenu(menu);
					
				}
			);
	
	//// Left Pane: ///////////////////////////////////////////////
		
		var augmentedMenuItems = [
			{
				//menuName: atb.viewer.SimpleMarkerEditor.MenuNames.mnuToolbar,
				menuName: "testMenu",//atb.viewer.SimpleMarkerEditor.MenuNames.mnuTestContextMenu,
				
				items: [
					mnuOpenMarkerViewerInOtherPane
				]
			}
		];
	
		//var panel =new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));
	
		
		//var partenerDiv = null;//hack
		/*
		markerEditor = new atb.viewer.StandardSimpleMarkerEditor(
			webService,
			null,
			augmentedMenuItems,
			partenerDiv
		);
		
		leftContainer.setViewer(markerEditor);
		
		
		var whichMapNumber = 1;//cotton map
		markerEditor.loadBackgroundImage(whichMapNumber);
		markerEditor.loadMarkersFromMapDocument("storage.php");
		*/
		var createMarkerEditor=function(container)
		{
			var markerEditor;
			markerEditor = new atb.viewer.StandardSimpleMarkerEditor(clientApp, augmentedMenuItems);
			//	webService,
			//	null,
			//	augmentedMenuItems,
			//	partenerDiv
			//);
			
			//leftContainer.setViewer(markerEditor);
			container.setViewer(markerEditor);
			
			
			var whichMapNumber = 1;//cotton map
			markerEditor.loadBackgroundImage(whichMapNumber);
			markerEditor.loadMarkersFromMapDocument("storage.php");
			return markerEditor;
		};
		markerEditor = createMarkerEditor(leftContainer);
		
	//// Right Pane: //////////////////////////////////
		var createTextEditor=function()
		{
			var strLoremIpsumXMany = "Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. ";
			var fillerText = strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany;
			var partenerDiv2 = null; //HACK
			//var textEditor = new atb.viewer.Editor(webService, styleRoot, fillerText, partenerDiv2);
			var textEditor = new atb.viewer.Editor(clientApp, fillerText);
			return textEditor
		};
		textEditor = createTextEditor();
		rightContainer.setViewer(textEditor);
		
	////////////////////////Menu items:///////
	//HACK:
		
	var domGeneratorGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	var newItems = [];
	/**
	var mnuItemCreateMarkerEditorHack =
		new atb.widgets.MenuItem(
			"loadMarkerEditorHere",
			domGeneratorGenerator("atb-markereditor-button-redo"),//lol!
			function(actionEvent)
			{
				var panelContainer = actionEvent.getPane();//HACK
				//^normally something else!
				//var newTextEditor = createTextEditor();
				//panelContainer.setViewer(newTextEditor);
				var markerEditor = createMarkerEditor(panelContainer);
				//or lolotherpanel...?
			}
		);
	var mnuItemCreateTextEditorHack =
		new atb.widgets.MenuItem(
			"loadEditorHere",
			domGeneratorGenerator("atb-markereditor-button-undo"),//lol!
			function(actionEvent)
			{
				var panelContainer = actionEvent.getPane();//HACK
				//^normally something else!
				var newTextEditor = createTextEditor();
				panelContainer.setViewer(newTextEditor);
			}
		);
	
	//var newItems = [mnuItemCreateMarkerEditorHack,mnuItemCreateTextEditorHack];
	newItems= [mnuItemCreateMarkerEditorHack,mnuItemCreateTextEditorHack];//hack
	*/
	
	
	//leftContainer.toolbar.addItems(newItems);//hack2
	//rightContainer.toolbar.addItem(mnuItemCreateTextEditorHack);//hack
	leftContainer.toolbar.addItems(newItems);//hack2
	rightContainer.toolbar.addItems(newItems);//hack2
	
	//leftContainer.toolbar.addItem(mnuItemCreateTextEditorHack);//hack2
	//rightContainer.toolbar.addItem(mnuItemCreateTextEditorHack);//hack
		
		
	////	//leftContainer.setToolbarVisible(false);
	
	leftContainer.setToolbarVisible(false);
	//rightContainer.setToolbarVisible(false);
		
	////////////////////////////////////////////////
	
	//setup keybindings / etc. :
		app.registerGlobalHandlers();
	
	//double-check that the left container has focus to start with:
		app.setActivePanel(leftContainer);//should be redundant, but...
		//app.setActivePanel(rightContainer);//HACK--test right lol
}

function _getLeftPanel()
{
	return app.getPanelNamed("leftPane");
}

function _getRightPanel()
{
	return app.getPanelNamed("rightPane");
}

function testLoadMarker()
{
	//var markerEditor = _getLeftPane().getViewer();//HACK
	//^LOL
	var markerEditor = _getLeftPanel().getViewer();//HACK
	
	var testJSON = 
		{
		"id": "3",
		"shape": "polygon",
		"polygon": {
			"points": [[1600,2400], [2200, 3000], [1800, 3300]],
			"fill": "#228822",
			"stroke": 1,
			"strokeColor": "#222222"
		}
	};
	markerEditor.loadMarkerObject(testJSON);
}

function testUnloadMarker()
{
	//var markerEditor = _getLeftPane().getViewer();//HACK
	//^LOL
	var markerEditor = _getLeftPanel().getViewer();//HACK
	
	var testRemoteId = 3;
	markerEditor.unloadMarkerObject(testRemoteId);
}

function testToggleLeftToolbarVisiblity()
{
	//var markerEditor = _getLeftPanel().getViewer();//HACK
	var leftPanel = _getLeftPanel();
	var newVisibilityState = !leftPanel.isToolbarVisible();
	leftPanel.setToolbarVisible(newVisibilityState);
	newVisibilityState
	//newVisiblityState);
	if (newVisibilityState)
	{
		debugPrint("showing toolbar!");
	}
	else
	{
		debugPrint("hiding toolbar!");
	}

}


function testAddRemoveRightViewer()
{
	var rightPanel = _getRightPanel();
	var rightViewer = rightPanel.getViewer();
	/*
	var viewerRoot = rightViewer.getElement();
	var viewerRootParent = viewerRoot.parentNode;
	viewerRootParent.removeChild(viewerRoot);
	viewerRootParent.appendChild(viewerRoot);
	*/
	
	//lets see if we can make this not break stuff:
	rightPanel.setViewer(null);
	rightPanel.setViewer(rightViewer);
}