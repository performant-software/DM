goog.require("atb.viewer.PanelManager");
goog.require("atb.viewer.PanelContainer");
goog.require('atb.DMWebService');

goog.require("atb.viewer.StandardSimpleMarkerEditor");
goog.require("goog.math.Size");

goog.require("atb.viewer.Editor");
goog.require("atb.widgets.MenuUtil");

//was hardcoded in the html before:
goog.require("atb.ui.AutoComplete.RemoteArrayMatcher");//HACK
goog.require("atb.ClientApp");

var app = null;

//TODO: kill the default content of the left/right panes probably and let the panels add the children of those tags themselves as they see fit, during their
//          tenure of their panelcontainer's tag...
//			maybe wrap them in another child tag that they "keep" owning and stops being a child when it moves...??

function initPanelManagerTestApp()
{
    var markerEditor;
    var textEditor;
	
    //var styleRoot = "../css/";
	
	//var clientApp = new //lol!
	var clientApp = new atb.ClientApp();
	
    //var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
    //var webService = new atb.DMWebService(webServiceURI);
	//var styleRoot = webService.getCssRoot();
	
    //app = new atb.viewer.PanelManager();
	//app = new atb.viewer.PanelManager(webService, styleRoot);
	app = clientApp.getPanelManager();
	var webService = clientApp.getWebService();
	
    var leftTabId = "left";
    var rightTabId = "right";
    var leftContainer = new atb.viewer.PanelContainer("leftPane", document.getElementById(leftTabId), 'leftTab');
    var rightContainer = new atb.viewer.PanelContainer("rightPane", document.getElementById(rightTabId), 'rightTab');
	
    app.addPanelSlot(leftContainer);
    app.addPanelSlot(rightContainer);
	
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
    var mnuOpenMarkerViewerInOtherPane =
    new atb.widgets.MenuItem(
        "loadMarkerViewerIntoAnotherPane",
        createButtonGenerator("radialButton-newDocument"),
        function(actionEvent)
        {
            var pane = actionEvent.getPane();
					
            var menu =actionEvent.getMenu();
					
            var panelContainer =pane.getCurrentPanelContainer();
            //currentPanel;
            var panelManager = panelContainer.getPanelManager();
            var otherContainer = panelManager.getAnotherPanel(panelContainer);
					
            if (otherContainer === null) {
                alert("only one panel container!");
                return;
            }
            var viewer = new atb.viewer.Editor(clientApp);
            //    webService,
            //    styleRoot,
            //    null,
            //    null
            //    );
            otherContainer.setViewer( viewer );
            otherContainer.setTabContents('New Annotation');
		
            pane.dismissContextMenu(menu);
					
        }
        );
	
    //// Left Pane: ///////////////////////////////////////////////
		
    var augmentedMenuItems = [
    {
        menuName: "testMenu",
				
        items: [
        mnuOpenMarkerViewerInOtherPane
        ]
    }
    ];
	
    //var panel =new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));
	
		
    //var partenerDiv = null;//hack
		
    markerEditor = new atb.viewer.StandardSimpleMarkerEditor(clientApp, augmentedMenuItems);
    //    webService,
    //    null,
    //    augmentedMenuItems,
    //    partenerDiv
    //);
		
    leftContainer.setViewer(markerEditor);
		
		
    var whichMapNumber = 1;//cotton map
    markerEditor.loadBackgroundImage(whichMapNumber);
    markerEditor.loadMarkersFromMapDocument("storage.php");
		
	
    //// Right Pane: //////////////////////////////////
    var fillerText = "(1) David apres la mort son pere ysay vel iesse fut enoint a roy de samuel le prophete a qui dieu lavoit commande et puis apres vint grant discort entre david et ysobeth qui estoit filz du roy saul et ala fin fut ysobeth occis par ii de ses sergens qui luy copperent le chef (2) tandis quil se dormoit et en firent present a david et le cuiderent bien servir a gre et quant david sceut que ainsi lavoient meurdri il les fit tous deux desmembrer et pendre et puis apres print la cite de iherusalem et en fut chef a son regne et y fit faire ediffices et luy pleust a y demourer et puis mourut le roy david et le fit salmon sougneusement ensevelir selon ce que iosephe tesmoigne de david yssit la ligniee royalle qui nostre seigneur porta & cetera.";
    var partenerDiv2 = null; //HACK
    //textEditor = new atb.viewer.Editor(webService, styleRoot, fillerText, partenerDiv2);
	////textEditor = new atb.viewer.Editor(clientApps, fillerText);
	textEditor = new atb.viewer.Editor(clientApp, fillerText);
	textEditor.resize(
		{
			//width: 476,//if toolbar handing off the side
			width: 478,//if toolbar handing off the side
			
			
			//width: 440,//if toolbar embedded!
			height: textEditor.getHeight()//;
		}
	);
	//	//width: 480,//if toolbar handing off the side
		
    textEditor.loadResourceById(4);
	
    rightContainer.setViewer(textEditor);
		
    ////////////////////////////////////////////////
	/*
	leftContainer.setToolbarVisible(false);
	rightContainer.setToolbarVisible(false);
	*/
	////rightContainersetToolbarOnTheRight(true);//hack
	//leftContainer.setToolbarOnTheLeftHanding(true);//HACK
	//rightContainer.setToolbarOnTheRight(true);//hack
	leftContainer.setToolbarHangingLeft(true);
	rightContainer.setToolbarHangingRight(true);
	//leftConainer.autoHideToolbars();
	leftContainer.autoHideToolbars();
	rightContainer.autoHideToolbars();//lolhack!
	
	
	
    //setup keybindings / etc. :
    app.registerGlobalHandlers();
	
    //double-check that the left container has focus to start with:
    app.setActivePanel(leftContainer);//should be redundant, but...
	
	//debugPrint("done init!");
	//app.setActivePanel(rightContainer);//HACK--test right lol
}