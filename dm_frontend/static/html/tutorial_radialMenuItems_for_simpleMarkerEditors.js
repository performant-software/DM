
/**
 * @fileoverview this is supposed to provide a tutorial for adding radial menu items to simpleMarkerEditor subclasses,
 *
 * @author John O'Meara
**/
goog.require("atb.debug.DebugTools");

//goog.require('atb.DMWebService');
goog.require('atb.viewer.MarkerViewer');
goog.require("atb.viewer.StandardSimpleMarkerEditor");
goog.require("atb.viewer.Editor");
goog.require("atb.widgets.MenuUtil");
goog.require("atb.widgets.MenuItem");
goog.require("atb.viewer.FakePanelContainer");
goog.require("atb.ClientApp");

function initMarkerEditor()
{
	//set our relative css path
	//var styleRoot = "../css/";
	
	//create our webservice object:
	var clientApp = new atb.ClientApp();
	
	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
	//var dmWebService = new atb.DMWebService(webServiceURI);
	
	//var styleRoot = dmWebService.getCssRoot();
	//helper function:
	var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	//our "custom" menu items:
	var augmentStandardMenus = 
		[
			{
				menuName: "testMenu",	//for simplemarkereditors, this just happens to be their toolbar's menuname... ...lol!
				
				items: [
			
					new atb.widgets.MenuItem(
						"customButton1", 
						createButtonGenerator("atb-editor-redobutton"),
						function(actionEvent)
						{
							//actionEvent is an instanceof atb.widgets.MenuActionEvent. 
							// see that class for a more detailed description of its fields.
							// but, basically, in a nutshell, you can get from it:
							//		-the selected object (a feature in a viewer.markereditor context menu, or the annotation in the ui.editor)
							//		-the menu
							//		-the menuitem
							//		-the "pane" - ie, which viewer the menu was displayed on (this should be some subclass of either:
							//			atb.viewer.MarkerViewer OR atb.viewer.Editor (at least for now/initially, you can think of it in that general sort of way....)
							
							debugPrint("customButton1");
						}
						//// for the most part you can probably completely ignore these last 3 arguments (or even omit them!):
						//, null//tooltip (default: null[aka none...?!?])
						//, null//buttongroupname (default: null[aka none])
						//, false//bEnabled (default: true)
					)
					/* , ... more custom menu items... */
				]
			}
			/* , ...more menu overrides... */
		];
	
	//	//passing null for now. these are kinda deprecated anyways, probably:
	//	var partenerDiv = null;//hack
	//^LOL! about sums it up
	
	//create it:
	var viewer = new atb.viewer.StandardSimpleMarkerEditor(
		clientApp, 				//our clientApp reference - this holds various 'global' application state.
		augmentStandardMenus	//our menu augmentation options...
	);
	
	//OLD://
	//	dmWebService,//pass in our webservice
	//	null,//we don't need to give it an explicit size anymore...
    //	augmentStandardMenus,//our menu augmentation options...
	//	partenerDiv	//these are deprecated, actually...!
	//);
	
	//a dummy panel to allow us to see what we are working on:
	//var panel =new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));
	var panel =new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));

	//load the map's bg texture:
	var whichMapImage = 1; // Cotton map
	viewer.loadBackgroundImage(whichMapImage);
	
	//load some marker data (this specific url probably doesn't work on on other machines. perhaps 'testData0001.json' would work better?
    viewer.loadMarkersFromMapDocument("storage.php");
	
	//return the viewer when done:
	return viewer;
}
