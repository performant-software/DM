goog.provide('atb.viewer.UndoStack');

//orloslchatnists
atb.viewer.UndoStack = function(target, saveStateFunc, loadStateFunc)
{
	this._redoData = [];
	//this._undoDataData = [];
	this._undoData= [];
	//this._redoDataCaption = "";
	//this._undoDataCaption = "";
	
	var inout = {
		target: target,
		saveStateFunc: saveStateFunc,
		loadStateFunc: loadStateFunc
	};
	this.inout = inout;
	inout.saveState = function()
	{
		var savedState;
		savedState = inout.saveStateFunc(inout.target);
		//alert("SAVEDState="+savedState);//lolundefined...?
		return savedState;
	};
	
	inout.loadState = function(savedState)
	{
		//alert("loadingState="+savedState);
		return inout.loadStateFunc(inout.target, savedState);
	};
	
};

atb.viewer.UndoStack.prototype.canUndo=function(caption)
{
	return (this._undoData.length > 0);
};

atb.viewer.UndoStack.prototype.getUndoCaption=function(caption)
{
	if (!this.canUndo())
	{
		return "";
	}
	//return undo[undo.length-1].caption;
	return this._undoData[this._undoData.length-1].caption;
};

atb.viewer.UndoStack.prototype.canRedo=function(caption)
{
	return (this._redoData.length > 0);
};

atb.viewer.UndoStack.prototype.getRedoCaption=function(caption)
{
	if (!this.canUndo())
	{
		return "";
	}
	return this._redoData[this._redoData.length-1].caption;
};

atb.viewer.UndoStack.prototype.recordUndoAction=function(caption)
{
	this._redoData = [];//clear redo buffer
	this.pushUndo(caption);
};
/*
atb.viewer.UndoStack.prototype.onModifyState(caption)
{
	this._redoData = [];
	pushUndo(caption);
};*/

atb.viewer.UndoStack.prototype.recordUndoActionWithState=function(caption, useState)
{//hack - save non-standard states...
	this._redoData = [];//clear redo buffer
	this._undoData.push(this._createUndoState(caption, useState));
	//this._captureState(caption));
};

atb.viewer.UndoStack.prototype._createUndoState=function(caption, state)
{
	var entry = {
		caption: caption,
		state: state
	};
	return entry;
};

atb.viewer.UndoStack.prototype._captureState=function(caption)
{
	/*var entry = {
		caption: caption,
		state: this.inout.saveState()
	};
	return entry;*/
	//return this._CreateUndoState(caption, this.inout.saveState());
	return this._createUndoState(caption, this.inout.saveState());
};

atb.viewer.UndoStack.prototype._applyState=function(useEntry)
{
	var state = useEntry.state;
	//return inout.loadState(state);
	//return this.inout.loadState(state);
	return this.inout.loadState(state);
};


atb.viewer.UndoStack.prototype.pushUndo = function(caption)
{
	/*
	var savedState = this.dataModel.saveState();
	var undoEntry = {
		caption: caption,
		state: savedState
	};
	this._undoData.push(undoEntry);
	*/
	this._undoData.push(this._captureState(caption));
};

atb.viewer.UndoStack.prototype.pushRedo = function(caption)
{
	this._redoData.push(this._captureState(caption));
};

atb.viewer.UndoStack.prototype.popUndo = function()
{
	if (!this.canUndo())
	{
		return;
	}
	var undoEntry = this._undoData.pop();
	var caption = undoEntry.caption;
	//var redoEntry = this._captureState(caption));
	//redo.push(redoEntry);
	this.pushRedo(caption);
	this._applyState(undoEntry);
	//or lol...diff-able changes...lol..>?
	/*
	if (this._undoData.length < 1)
	{
		return;
	}
	var undoEntry = this._undoData.pop();
	var caption = undoEntry.caption;
	var redoState = this.dataModel.saveState();
	var redoEntry = {
		caption: caption,
		state: redoState
	};
	redo.push(redoEntry);
	
	var oldState = undoEntry.state;
	
	var userDataGen = function(userData){return userData;};//hack
	this.dataModel.loadState(userDataGen, oldState);
	*/
	
};

atb.viewer.UndoStack.prototype.popRedo = function()
{
	if (!this.canRedo())
	{
		return;
	}
	var redoEntry = this._redoData.pop();
	var caption = redoEntry.caption;
	//var undoEntry = this._captureState(caption));
	//undo.push(undoEntry);
	this.pushUndo(caption);
	this._applyState(redoEntry);
};


atb.viewer.UndoStack.prototype.undo = function()
{
	if (!this.canUndo())
	{
		return false;
	}
	this.popUndo();
	return true;
};

atb.viewer.UndoStack.prototype.redo = function()
{
	if (!this.canRedo())
	{
		return false;
	}
	this.popRedo();
	return true;
	//lolundoredostatuaolz
	/*if (this._redoData.length < 1)
	{
		return;
	}
	var redoEntry = this._redoData.pop();
	var caption = undoEntry.caption;
	var oldState = undoEntry.state;
	this.pushUndo(caption);
	
	var userDataGen = function(userData){return userData;};//hack
	this.dataModel.loadState(userDataGen, oldState);
	
	//var redoState = this.dataModel.saveState();
	*/
};