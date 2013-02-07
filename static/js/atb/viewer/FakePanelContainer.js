goog.provide("atb.viewer.FakePanelContainer");

/**
 * @fileoverview a Simple "fake" panelcontainer for testing.
 *
 * @author John O'Meara
**/
goog.require("atb.util.ReferenceUtil");

atb.viewer.FakePanelContainer = function(viewer, opt_tag)
{
	this.viewer = viewer;
	viewer.render();
	this.tag = atb.util.ReferenceUtil.applyDefaultValue(opt_tag, null);
	if (this.tag === null)
	{
		this.tag = document.createElement("div");
		document.body.appendChild(this.tag);//hack
	}
	//var nd  =document.getElementById("editor");
	var child = viewer.getElement();
	//nd.appendChild(child);
	this.tag.appendChild(child);
	//e.finishRender();
	viewer.finishRender();
};