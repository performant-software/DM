goog.provide("atb.datastore.AsyncTaskInternal");

/**
 * @fileOverview An asynchronous loading task for the data store.
 * this is needed because we might complete our load requests from other queries...
 *
 * @author John O'Meara
**/

goog.require("atb.util.Set");
goog.require("atb.util.Stack");
//goog.require("atb.DataStore");
//goog.require("atb.datastore.TaskDataReceivedEvent");
goog.require("atb.debug.DebugFilter");
goog.require("atb.util.ReferenceUtil");

/**
 * This stores the ongoing work of a resource loading task.
 *
 * @param {atb.DataStore} set_ds A DataStore to refer to.
 * @param {Array<localId>} requireIds A list of localIds to require before we are completed.
 * @param {function} taskFunction A function to recieve our TaskDataReceivedEvent(s).
 * @param {atb.debug.DebugFilter =} opt_setDebugFilter An optional debug filter used to control debug message printing.
 *
 * @protected
 * @constructor
**/
atb.datastore.AsyncTaskInternal = function(set_ds, requireIds, taskFunction, opt_setDebugFilter)
{
	if (atb.util.ReferenceUtil.isNotInstanceOfClass(set_ds, atb.DataStore))
	{
		throw new Error("atb.datastore.AsyncTaskInternal::AsyncTaskInternal(): bad set_ds: "+set_ds);
	}
	
	this.ds = set_ds;
	
	this.debugFilter = atb.util.ReferenceUtil.applyDefaultValue(opt_setDebugFilter, null);
	if (this.debugFilter === null)
	{
		this.debugFilter = new atb.debug.DebugFilter();
	}
	
	//Q: do we want timeout(s)...? (tho, they could probably be implemented with a window.setTimeout() + cancelResolver...hmmm....
	
	this.needed = new atb.util.Set();
	this.needed.addAll(requireIds);
	this.taskObject = taskFunction;//lol names
	
	this.bCompleted = false;
	this.myLocalIds = new atb.util.Stack();
	this.taskId = atb.datastore.AsyncTaskInternal.INVALID_TASK_ID;
};

/**
 * Sets our taskId.
 * @param {number|string} set_taskId The taskId to set.
**/
atb.datastore.AsyncTaskInternal.prototype.setTaskId = function(set_taskId)
{
	this.taskId = set_taskId;//lol!
};

/**
 * gets our taskId.
 * @return {number|string} Our taskId. (used with atb.DataStore::cancelResolver()...)
 * @public
**/
atb.datastore.AsyncTaskInternal.prototype.getTaskId = function()
{
	return this.taskId;
};

/**
 * canels this task via our datastore.
 * @return {boolean} True if this became cancelled as a result, and having not been so prior to our call
**/
atb.datastore.AsyncTaskInternal.prototype.cancelTask = function()
{	
	var bWasCompleted = this.bCompleted;
	var ret = this.ds.cancelResolver(this.getTaskId());
	
	//set out our taskId to something invalid:
	this.taskId = atb.datastore.AsyncTaskInternal.INVALID_TASK_ID;
	
	if (bWasCompleted)
	{
		return false;
	}
	return ret;
};

/**
 * A handler for newly received data from our datastore.
 * Meant to be invoked directly by {atb.DataStore}.
 * @param {Array.<localId>} recievedIds the list of all recieved ids. We will need to filter this first by ids relevant to our task before doing anything with it.
 * 
**/
atb.datastore.AsyncTaskInternal.prototype.onData = function(recievedIds)
{
	if (this.bCompleted)
	{
		//already completed...
		this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "atb.datastore.AsyncTaskInternal.prototype.onData: already completed!");
		return;
	}
	var intersection = this.needed.removeAll(recievedIds);
	if (intersection.length > 0)
	{
		var newObjects = this.ds.getDataObjectsImmediately(recievedIds);
		var dataEvent = new atb.datastore.TaskDataReceivedEvent(
			this.ds,
			this.taskObject,
			this.getTaskId(),
			atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_PROGRESS,
			newObjects
		);
		
		this.myLocalIds.pushAll(intersection);
		this.taskObject( dataEvent );
		
		if (this.needed.isEmpty())
		{
			this.bCompleted=true;
			var allTaskLocalIds = this.myLocalIds.copyToArrayFIFO();
			var allTaskObjects = this.ds.getDataObjectsImmediately(allTaskLocalIds);
			
			dataEvent = new atb.datastore.TaskDataReceivedEvent(
				this.ds,
				this.taskObject,
				this.getTaskId(),
				atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_COMPLETE,
				allTaskObjects
			);
			this.taskObject( dataEvent );
		}
	}
};

/**
 * returns true if this asyncTask has been finished, and can be removed from the datastore where it is listening for data events
 * @return {boolean} True, iff we can be removed from the listeners group by our datastore.
**/
atb.datastore.AsyncTaskInternal.prototype.canRemove = function()
{//true after we can remove this from the queue...
	return this.bCompleted;
};


/**
 * helper for debug messages to get the remaining items as a string.
 * @return {string} a string representation of the list of our still-outstanding localId(s).
**/
atb.datastore.AsyncTaskInternal.prototype.getRemainingItemsString = function()
{
	return ""+this.needed.toString();
};

/**
 * gets a list containing a copy of all of the outstanding localIds we still need to wait for the retrieval of from the remote side.
 * @return {Array.<localId>} A copy of our list of still-outstanding localIds.
**/
atb.datastore.AsyncTaskInternal.prototype.getCopyOfRemainingItemsArray = function()
{
	return this.needed.toArrayCopyUnordered();
}

/*
atb.datastore.AsyncTaskInternal.prototype.onError = function(badIds)
{

};
*/

/////////////////FIELDS://///////////////

/**
 * a constant holding the value of a "bad task id".
 *
**/
atb.datastore.AsyncTaskInternal.INVALID_TASK_ID = -1;
