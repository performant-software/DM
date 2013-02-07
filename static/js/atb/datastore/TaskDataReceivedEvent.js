goog.provide("atb.datastore.TaskDataReceivedEvent");

/**
 * @fileOverview Provides an event type for use with the AsyncTaskInternal's taskFunction(s)...
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");

/**
 * Creates a new Task-Data-Received event.
 *
 * @param {atb.DataStore} dataStore The datastore which raised this event.
 * @param {taskObject} taskObject The task object (user provided listener function???) for this.
 * @param {number|string} taskId Our resolver taskId
 * @param {string} eventType One of the event types defined in this class, explaining what type of event it is
 * @param {Array{atb.datastore.DataObject}} receivedObjects An array of received atb.datastore.DataObject}(s) recieved for this event. 
 *
 * @public Note: only AsyncTaskInternal(s) should probably be instantiating instances of this class.
 * @constructor
**/
atb.datastore.TaskDataReceivedEvent = function(dataStore, taskObject, taskId, eventType, receivedObjects)
{
	//todo: maybe validate these...?
	this.dataStore = dataStore;
	this.taskObject = taskObject;
	this.taskId = taskId;
	this.eventType = eventType;
	this.receivedObjects = receivedObjects;
};



/**
 *
 * @return {atb.DataStore} The datastore managing this listener and its task.
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.getDataStore = function()
{
	return this.dataStore;
};



/**
 * returns the task "object" (function) for our task. Probably not too useful after all. 
 * [Q: should it maybe return the asynctaskinternal object instead...?]
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.getTask = function()
{
	return this.taskObject;
};



/**
 * returns an id which can be used to canel this task, via DataStore::cancelResolver( {listenerId == taskId} ).
 * @return {resolverId} Returns an id which can be used to cancel this task.
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.getTaskId = function()
{
	return this.taskId;//lol...or can we just cancel via the task...??!!?
};



/**
 * returns the event type.
 * @return {string} The event type.
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.getEventType = function()
{
	return this.eventType;
};



/**
 * returns the list of data objects relevant to this task that were just caused.
 * @return {Array&lt;atb.datastore.DataObject&gt;}
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.getDataObjects = function()
{
	return this.receivedObjects;
};



/**
 * A convience method to check if this a completion-type event.
 * @return {boolean} Returns true iff this is a COMPLETE-type event.
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.isCompletionEvent = function()
{
	return (this.isEventType(atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_COMPLETE));
};



/**
 * a convience method to check if this is a PROGRESS-type'd event.
 * @return {boolean} Returns true iff this is a progress event.
 * @public
**/
atb.datastore.TaskDataReceivedEvent.prototype.isProgressEvent = function()
{
	return (this.isEventType(atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_PROGRESS));
};




///////////// Protected ////////////////////////////




/**
 * helper to check the event type against a spacified type.
 * Q: should this instead be public? the event types are, after all... (and should they be so...?)
 *
 * @protected
**/
atb.datastore.TaskDataReceivedEvent.prototype.isEventType = function(testEventType)
{
	return (this.getEventType() == testEventType);
};




//////////////////// Fields: ///////////////////////




/**
 * An event type representing a progress update.
 * @static
 * @public
**/
atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_PROGRESS = "progress";

/**
 * An event type indicating the completion of a task has occurred (ie, all the data was recieved)
 * TODO: figure out if/how we handle what happens if (just some) of the remoteIds failed...?
 * @static
 * @public
**/
atb.datastore.TaskDataReceivedEvent.EVENT_TYPE_COMPLETE = "complete";



//loltimeoutevent for resovlve...retry...?//lol!//.retry on timeout event...?