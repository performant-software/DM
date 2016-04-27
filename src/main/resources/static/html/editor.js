//goog.require('goog.events');
//goog.require('atb.DMWebService');
goog.require('atb.viewer.TextEditor');
goog.require("atb.ClientApp");

initEditor = function()
{
    //var webServiceURI = 
	//	location.href.substring(0, location.href.lastIndexOf("/") + 1) + 'annotation.drew.edu/';
	//var ws = new atb.DMWebService(webServiceURI);
	//var styleRoot = ws.getCssRoot();
	
	//var partenerDiv = null;
	
	//var e = new atb.viewer.TextEditor(ws, styleRoot, null, partenerDiv);
	//var e = new atb.viewer.TextEditor(ws, styleRoot, partenerDiv);
	//var e = new atb.viewer.TextEditor(ws, styleRoot, partenerDiv);
	var clientApp = new atb.ClientApp();
	var e = new atb.viewer.TextEditor(clientApp);
	
	var panel =new atb.viewer.FakePanelContainer(e, document.getElementById("testPane"));
	
	return e;
}

