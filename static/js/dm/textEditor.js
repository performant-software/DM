goog.require('goog.events');
goog.require('atb.DMLiveWebService');
goog.require('atb.viewer.Editor');
goog.require('atb.viewer.FakePanelContainer');
goog.require("atb.ClientApp");

initTextEditor = function(wsURI, domElement, styleRoot) {
	//var ws = new atb.DMLiveWebService(wsURI);
	var clientApp = new atb.ClientApp(new atb.DMLiveWebService(wsURI), styleRoot);
	var ws = clientApp.getWebService();
	//var textEditor = new atb.viewer.Editor(ws, styleRoot, null, null);
	var textEditor = new atb.viewer.Editor(clientApp);
	var panel = new atb.viewer.FakePanelContainer(
        textEditor, 
        document.getElementById(domElement)
    );
	return textEditor;
}
