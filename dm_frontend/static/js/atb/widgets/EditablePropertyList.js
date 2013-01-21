goog.provide('atb.widgets.EditablePropertyList');

atb.widgets.EditablePropertyList = function()
{
	this.keys = [];
	this.fields = [];
	this.value = {};
	
};

atb.widgets.EditablePropertyList.prototype.setTargetValue = function(setTargetValue)
{
	this.value = setTargetValue;
};

atb.widgets.EditablePropertyList.prototype.loadFromTarget = function()
{
	for(var i=0; i<this.keys.length; i++)
	{
		var key =this.keys[i];
		var newValue = this.value[key];
		var field = this.getEditableField(key);
		field.saveValue(newValue);
		field.displayValue(newValue);
		field.setModified(false);
	}
};

atb.widgets.EditablePropertyList.prototype.storeToTarget = function()
{
	for(var i=0; i<this.keys.length; i++)
	{
		var key =this.keys[i];
		//var newValue = this.value[key];
		var field = this.getEditableField(key);
		//field.saveValue(newValue);
		//field.displayValue(newValue);
		//field.setModified(false);
		var currentValue = field.getSavedValue();
		this.value[key] = currentValue;
	}
};

atb.widgets.EditablePropertyList.prototype.putField = function(key, field)
{
	var arrHack=[];
	var missing=arrHack['missingkey'];
	
	var foundField = this.fields[key];
	if(foundField == missing)
	{
		this.keys.push(key);
	}
	
	this.fields[key] = field;
	//TODO: ?=maybe do special stuff if this happens after we've loaded it for editting...???
};

atb.widgets.EditablePropertyList.prototype.getKeys = function()
{
	return this.keys;
};

atb.widgets.EditablePropertyList.prototype.getEditableField = function(key)
{
	return this.fields[key];
};

atb.widgets.EditablePropertyList.prototype.saveChanges = function()
{
	/*for(var i=0; i<this.keys.length; i++)
	{
		var key =this.keys[i];
		var field = this.fields[key];
		
	}*/
	this.storeToTarget();
};

//fields:
/*
getSavedValue()
getCurrentValue()
saveValue(newContent)
setModified(bool)
const HTMLElement* getEditorTag()

field.saveValue(newValue);
		field.displayValue(newValue);
*/