goog.provide("atb.widgets.PropertyEditorPane");

/**
 * This widget should provide a means to edit a data-backing, with support for editing various types of fields in various ways.
 *
 * The basic idea is that each key/value pair is part of a larger "object" which is currently selected and being edited.
 *
 * @author John O'Meara
**/

atb.widgets.PropertyEditorPane = function(targetDiv)
{
	this.propDoc = null;
	this.targetDiv = targetDiv;
};


atb.widgets.PropertyEditorPane.prototype.isEditing = function()
{
	return (this.propDoc != null);
};


atb.widgets.PropertyEditorPane.prototype.saveChanges = function()
{
	var bChanged = false;
		
	var doc =this.propDoc;
	if (doc==null)
	{
		return;//paranoia
	}
	var keys = doc.getKeys();
	for(var i=0; i<keys.length; i++)
	{
		var key =keys[i];
		var field = doc.getEditableField(key);
		
		/*
		var priorValue = doc.getSavedValue(key);
		var editorWidget = doc.getEditor(key);
		var currentValue = editorWidget.getValue();
		*/
		var priorValue = field.getSavedValue();
		var currentValue = field.getCurrentValue();
		
		if (priorValue != currentValue)
		{
			bChanged = true;
			//field.writeValue(currentValue);
			field.saveValue(currentValue);
			field.setModified(true);
		}
	}
	doc.saveChanges();
};

atb.widgets.PropertyEditorPane.prototype.closeObject = function(bSaveChanges)//, bPromptToSaveChanges)
{
	if (!this.isEditing())
	{
		return;
	}
	if(bSaveChanges)
	{
		this.saveChanges();
	}
	this.targetDiv.innerHTML = "";//hack
	this.propDoc = null;
};

atb.widgets.PropertyEditorPane.prototype.editObject=function( setEditablePropertyList )
{
	var self = this;//lolhack
	
	this.closeObject();
	this.propDoc = setEditablePropertyList;
	if (this.isEditing())
	{
		var doc = this.propDoc;
		var keys = doc.getKeys();
		for(var i=0; i<keys.length; i++)
		{
			var key =keys[i];
			var field = doc.getEditableField(key);
			var fieldNode = field.getEditorTag();
			
			this.targetDiv.appendChild(fieldNode);
		}
		var br = document.createElement("br");
		this.targetDiv.appendChild(br);
		
		var saveButton = document.createElement("button");
		//saveButton.value = "Save";//lolhack
		//saveButton.
		//var jqButton = jQuery(saveButton);
		//jqButton.val("Save");
		//jqButton.
		//saveButton.style.height = 15;//px...???
		/*
		saveButton.style.height = 20;//px...???
		saveButton.style.width = 30;//px...???
		*/
		//saveButton.name = "Save";
		//saveButton.
		saveButton.innerHTML = "Save";//lol
		goog.events.listen(saveButton, goog.events.EventType.CLICK, function(event)
		{
			self.saveChanges();
			//debugConsole.debugPrintObject(self.value,null,1);
			debugConsole.debugPrintObject(self.propDoc.value,null,1);
		});
		this.targetDiv.appendChild(saveButton);
		//handler);
		/*
		goog.events.listen(this.elHeader_, goog.events.EventType.CLICK,
    this.onHeaderClick_, false, this);
		*/
	}
};

