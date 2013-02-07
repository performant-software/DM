goog.provide("atb.widgets.StringPropertyEditor");

atb.widgets.StringPropertyEditor = function()
{
	//this.storedValue = "";
	this.savedValue = "";
	this.tag = document.createElement("input");
	this.bModified=false;
};

atb.widgets.StringPropertyEditor.prototype.getSavedValue = function()
{
	return this.savedValue;
};

atb.widgets.StringPropertyEditor.prototype.getCurrentValue = function()
{
	return this.tag.value;
};

atb.widgets.StringPropertyEditor.prototype.saveValue=function(newContent)
{
	this.savedValue = ""+newContent;
};

atb.widgets.StringPropertyEditor.prototype.setModified= function(bModified)
{
	this.bModified=bModified;
};

atb.widgets.StringPropertyEditor.prototype.isModified = function()
{
	return this.bModified;
};

//const HTMLElement* getEditorTag()
atb.widgets.StringPropertyEditor.prototype.getEditorTag =function()
{
	return this.tag;
};

//atb.widgets.StringPropertyEditor.prototype.saveValue(newValue);
atb.widgets.StringPropertyEditor.prototype.displayValue=function(newValue)
{
	this.tag.value = newValue;//lolhack
};