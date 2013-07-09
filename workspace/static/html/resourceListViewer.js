goog.require('atb.DMWebService');

goog.require("goog.math.Size");

goog.require("atb.viewer.TextEditor");
goog.require("atb.widgets.MenuUtil");
goog.require('atb.viewer.ResourceListViewer');
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
	
    //var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
    //var webService = new atb.DMWebService(webServiceURI);
	//var styleRoot = webService.getCssRoot();
	var clientApp = new atb.ClientApp();
	var webService = clientApp.getWebService();
	
    app = new atb.viewer.PanelManager(webService);
	
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
            var viewer = new atb.viewer.TextEditor(clientApp);
			/*
                webService,
                styleRoot,
                null,
                null
                );
			*/
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
    
    var rlViewer = new atb.viewer.ResourceListViewer(clientApp);
	//webService);
    rightContainer.setViewer(rlViewer);
    
    webService.withResource(4, function(data) {rlViewer.addSummaryFromResource(data);}, this);
    webService.withResource(6, function(data) {rlViewer.addSummaryFromResource(data);}, this);
    webService.withAnnotation(10754, function(data) {rlViewer.addSummaryFromResource(data);}, this);
    rlViewer.addSummariesFromUserId(7);
    
		
    ////////////////////////////////////////////////
	
    //setup keybindings / etc. :
    app.registerGlobalHandlers();
	
    //double-check that the left container has focus to start with:
    app.setActivePanel(leftContainer);//should be redundant, but...
//app.setActivePanel(rightContainer);//HACK--test right lol
}