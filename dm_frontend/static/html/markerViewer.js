goog.require('goog.math.Size');
//goog.require('openlayers.OpenLayers');
goog.require('atb.DMWebService');
goog.require('atb.viewer.MarkerViewer');
goog.require("atb.viewer.FakePanelContainer");
goog.require("atb.ClientApp");

initMarkerViewer = function()
{
	var clientApp = new atb.ClientApp();
	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
    //var dmWebService = new atb.DMWebService(webServiceURI);
    
	var viewer = new atb.viewer.MarkerViewer(clientApp);
	//	dmWebService,
	//	null
	//);
	
	var panel = new atb.viewer.FakePanelContainer(viewer, document.getElementById("testPane"));
	
    
	//viewer.setWebService(dmWebService);
    //viewer.setResource(1, 1);
	viewer.loadBackgroundImage(1);

    return viewer;
}
	  
