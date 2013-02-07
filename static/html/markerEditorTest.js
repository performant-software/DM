
//goog.require('goog.math.Size');
//goog.require('atb.DMWebService');
//goog.require('atb.viewer.ResourceViewer');
//goog.require('atb.viewer.MarkerViewer');
//goog.require('atb.viewer.MarkerEditor');
goog.require('atb.viewer.SimpleMarkerEditor');
goog.require("atb.viewer.StandardSimpleMarkerEditor");

goog.require("atb.debug.DebugTools");

goog.require("atb.viewer.FakePanelContainer");
goog.require("atb.ClientApp");

function initMarkerEditor()
{
	//var styleRoot = "../css/";
	
	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
	//var dmWebService = new atb.DMWebService(webServiceURI);
	var clientApp = new atb.ClientApp();
	//var dmWebService = clientApp.getWebService();
	var augmentStandardMenus = createMenuAugmentations();
	//var styleRoot =clientApp.getStyleRoot();// dmWebService.getCssRoot();
	
	//var editorConstructor; 
	//editorConstructor = atb.viewer.MarkerEditor;
	//editorConstructor = atb.viewer.SimpleMarkerEditor;
	//editorConstructor = atb.viewer.StandardSimpleMarkerEditor;
	
	
	//var partenerDiv = null;//hack
	
	//var viewer = new editorConstructor(clientApp,augmentStandardMenus);
	var viewer = new atb.viewer.StandardSimpleMarkerEditor(clientApp, augmentStandardMenus);
		//dmWebService,
		
	    //new goog.math.Size(460, 475),
        //augmentStandardMenus
		//,
		//, partenerDiv
	//);
	
	var panel =new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));
	
	//viewer.addOverlay("o1");
	//viewer.setWebService(dmWebService);
	viewer.setResource(1, 1);//loldeprecated...!
    viewer.loadMarkersFromMapDocument("storage.php");
	viewer.setHasKeyboardFocus(true);
	return viewer;
}

function createMenuAugmentations()
{
	var augmentStandardMenus = [];//hack
	var bAddTestMenuItems = false;
	
	if (bAddTestMenuItems)
	{
		//TEST MENU ITEMS:
		var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
		
		var mnuCustomButton4 = 
			new atb.widgets.MenuItem(
				"customButton4", 
				createButtonGenerator("atb-markereditor-button-redo"),
				function(actionEvent)
				{
					debugPrint("customButton4");
				},
				null,//tooltip
				"testGroup1"
			);
			
		var mnuCustomButton5 = 
			new atb.widgets.MenuItem(
				"customButton5", 
				createButtonGenerator("atb-markereditor-button-undo"),
				function(actionEvent)
				{
					debugPrint("customButton5");
					var newEnabledState = !mnuCustomButton4.isEnabled();
					mnuCustomButton4.setEnabled(newEnabledState);
					debugPrint("mnuCustomButton4 enabled set to: "+newEnabledState);
				}
			);
		var mnuCustomButton7 = 
			new atb.widgets.MenuItem(
				"customButton7", 
				createButtonGenerator("atb-markereditor-button-undo"),
				function(actionEvent)
				{
					debugPrint("customButton7");
					
				},
				null,//tooltip
				"testGroup1"
			);
		var mnuCustomButton8 = 
			new atb.widgets.MenuItem(
				"customButton8", 
				createButtonGenerator("atb-markereditor-button-undo"),
				function(actionEvent)
				{
					debugPrint("customButton8");
					
				},
				null,//tooltip
				"testGroup2"
				
			);
		var mnuCustomButton9 = 
			new atb.widgets.MenuItem(
				"customButton9", 
				createButtonGenerator("atb-markereditor-button-undo"),
				function(actionEvent)
				{
					debugPrint("customButton9");
					
				},
				null,//tooltip
				"testGroup2"
				
			);
		//var augmentStandardMenus
		augmentStandardMenus = [
			{
				//menuName: atb.viewer.SimpleMarkerEditor.MenuNames.mnuToolbar,
				menuName: "testMenu",//atb.viewer.SimpleMarkerEditor.MenuNames.mnuTestContextMenu,
				
				items: [
					new atb.widgets.MenuItem(
							"customButton1", 
							createButtonGenerator("atb-editor-redobutton"),
							function(actionEvent)
							{
								debugPrint("customButton1");
							},
							null,
							null,
							false
						),
						new atb.widgets.MenuItem(
							"customButton2", 
							createButtonGenerator("atb-editor-undobutton"),
							function(actionEvent)
							{
								debugPrint("customButton2");
							}
						),
						new atb.widgets.MenuItem(
							"customButton3", 
							createButtonGenerator("atb-editor-addpolylinebutton"),
							function(actionEvent)
							{
								debugPrint("customButton3");
							}
						),
						
						mnuCustomButton4,
						mnuCustomButton5,
						
						mnuCustomButton7,
						mnuCustomButton8,
						mnuCustomButton9,
						
						new atb.widgets.MenuItem(
							"customButton6", 
							createButtonGenerator("atb-markereditor-button-redo"),
							function(actionEvent)
							{
								debugPrint("customButton6");
								var menu = actionEvent.getMenu();
								var x = menu.getX();
								var y = menu.getY();
								y += 25;
								menu.setPosition(x,y);//hack
							},
							null, //tooltip
							"testGroup3"
						),
						
						new atb.widgets.MenuItem(
							"customButton10", 
							createButtonGenerator("atb-markereditor-button-undo"),
							function(actionEvent)
							{
								debugPrint("customButton10");
								var menu = actionEvent.getMenu();
								var x = menu.getX();
								var y = menu.getY();
								y -= 25;
								menu.setPosition(x,y);//hack
							},
							null, //tooltip
							"testGroup3"
						)
				]
			},
			
			{
				menuName: atb.viewer.SimpleMarkerEditor.MenuNames.mnuToolbar,
				items: [
					mnuCustomButton4,
					mnuCustomButton5,
					mnuCustomButton7,
					mnuCustomButton8,
					mnuCustomButton9,
                                        mnuEnterAnnoModeButton
				]
			}
		];
	}
	
	return augmentStandardMenus;
}


/*


//goog.require("atb.widgets.PropertyEditorPane");
//goog.require('atb.widgets.EditablePropertyList');
//goog.require("atb.widgets.StringPropertyEditor");

function testPropertyEditorStuff()
{
	var divID = "test2";
	var div = document.getElementById(divID);
	
	var propEditorPane = new atb.widgets.PropertyEditorPane(div);
	var propList = new atb.widgets.EditablePropertyList();
	var stringEditorA = new atb.widgets.StringPropertyEditor();
	var obj = {
		testField: "abcdef"
	};
	propList.putField("testField", stringEditorA);
	propList.setTargetValue(obj);
	propList.loadFromTarget();
	propEditorPane.editObject(propList);
}
*/


/*
	var viewer = new atb.viewer.ResourceViewer(
		"resourceViewer",
		new goog.math.Size(460, 475)
	);
	*/	
	
	/*var viewer = new atb.viewer.MarkerViewer(
	    "resourceViewer",
		new goog.math.Size(460, 475),
		5
    );*/
	
	/*
	var viewer = new atb.viewer.MarkerEditor(
		dmWebService,
	    "resourceViewer",
		new goog.math.Size(460, 475),
        5, 
		augmentStandardMenus,
		"styleEditorDiv"
	);
	*/