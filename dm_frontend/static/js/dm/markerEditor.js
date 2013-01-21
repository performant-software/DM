
//goog.require('goog.math.Size');
//goog.require('openlayers.OpenLayers');
//goog.require('atb.DMLiveWebService');
goog.require('atb.viewer.StandardSimpleMarkerEditor');

//goog.require('atb.widgets.MenuUtil');
//goog.require('atb.widgets.MenuItem');
goog.require('atb.viewer.FakePanelContainer');
goog.require("atb.ClientApp");

initMarkerEditor = function(wsURI, domElement) {
	var clientApp = new atb.ClientApp(new atb.DMLiveWebService(wsURI));
    //var ws = new atb.DMLiveWebService(wsURI);

	var viewer = new atb.viewer.StandardSimpleMarkerEditor(clientApp);
	//	ws,//pass in our webservice
	//	null, // we don't need to give it an explicit size anymore
    //    null, // our menu augmentation options
	//	null  // these are deprecated, actually
	//);

	var panel = new atb.viewer.FakePanelContainer(
        viewer, 
        document.getElementById(domElement)
    );

	var whichMapImage = 1; // Cotton map
	viewer.setResource(whichMapImage);

    return viewer;
};