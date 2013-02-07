goog.require("atb.viewer.PanelManager");
goog.require("atb.viewer.PanelContainer");
goog.require('atb.DMWebService');

goog.require("atb.viewer.StandardSimpleMarkerEditor");
goog.require("goog.math.Size");

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

	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
	//var webService = new atb.DMWebService(webServiceURI);
	//var styleRoot = webService.getCssRoot();
	
	//app = new atb.viewer.PanelManager(webService);
	var clientApp = new atb.ClientApp();
	var webService = clientApp.getWebService();
	

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
						//clientApp //LOL!
						//webService
						//, new goog.math.Size(460, 475)
					//);
					otherContainer.setViewer( viewer );

					var whichOtherMapNumber = 3;//another other map...
					viewer.loadBackgroundImage(whichOtherMapNumber);

					pane.dismissContextMenu(menu);

				}
			);

	//// Left Pane: ///////////////////////////////////////////////

    var strLoremIpsumXMany = "Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. Lorem Ipsum. ";
    var fillerText = strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany+strLoremIpsumXMany;
    //var partenerDiv2 = null; //HACK
    //textEditor = new atb.viewer.Editor(webService, styleRoot, fillerText, partenerDiv2);
	textEditor = new atb.viewer.Editor(clientApp, fillerText);
    leftContainer.setViewer(textEditor);


	//// Right Pane: //////////////////////////////////

	fillerText = "";
	//textEditor = new atb.viewer.Editor(webService, styleRoot, fillerText, partenerDiv2);
	textEditor = new atb.viewer.Editor(clientApp, fillerText);
	rightContainer.setViewer(textEditor);

	////////////////////////////////////////////////

	//setup keybindings / etc. :
		app.registerGlobalHandlers();

	//double-check that the left container has focus to start with:
		app.setActivePanel(leftContainer);//should be redundant, but...
		//app.setActivePanel(rightContainer);//HACK--test right lol
}