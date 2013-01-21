goog.provide("atb.DataStore");

/**
 * @fileOverview This is intended to encapuslate the storage of various information about resources on the client side, 
 * and provide a uniformed place where they are 'owned' locally, since there can be more than one viewer/editor/etc that
 * might reasonably have a claim to their management.
 *
 * @author John O'Meara
**/

goog.require("atb.debug.DebugTools");

goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.LangUtil");
goog.require("atb.util.Stack");
goog.require("atb.debug.DebugFilter");

goog.require("atb.WebService");

goog.require("atb.datastore.Storage");
goog.require("atb.datastore.AsyncTaskInternal");
goog.require("atb.datastore.DataObject");
goog.require("atb.datastore.ContentTypes");
goog.require("atb.datastore.ResourceReference");

goog.require("atb.util.Map");
//TODO: (maybe)add some kind of method to "release" unused ids back to the server...?

//TODO: maybe add a way to check if already querying something(internally), and prevent a duplicate request...?
//TODO: maybe add a way to force a fresh fetch...?

///////////////////////////////////////////////////////////////////////////////



/**
 * The constructor for the DataStore.
 * 
 * @param {atb.WebService} set_webService A reference to the webservice to use to communicate with the backend.
 *
 * @constructor
 * @public
**/
atb.DataStore = function(set_webService)
{
	this.contentTypeDereferencers = new atb.util.Map();
	
	//this.bEnableModifiedCheck = false;//hack - we might want to disable this initially to take into account the (current) lack of "modify" notifications in the various viewers/editors...
	this.bEnableModifiedCheck = true;//normal, but disabled for now, since we need to actually modify the values, then...!?...
	
	var raw_set_webService = set_webService;
	
	set_webService = atb.util.ReferenceUtil.applyDefaultValue(set_webService, null);
	
	if ((set_webService === null) || (!(set_webService instanceof atb.WebService)))
	{
		throw new Error("bad webservice passed to atb.DataStore's constructor! (raw) set_webService = "+raw_set_webService+"; it must be a valid instanceof atb.WebService");
	}
	
	this.debugFilter = new atb.debug.DebugFilter();
		
	this.webService = set_webService;
	//this.dss = new atb.datastore.Storage(this);
	this.dss = new atb.datastore.Storage(this, this.debugFilter);
	this.listeners = {};
	this.listenerCounter = 0;
	
	this.extraIds = new atb.util.Stack();
	
	//this.setDefaultContentTypeDereferencers();//hack
};

/**
 * allocates a local data object representation. A value and content type can optionally be provided.
 * 
 * @param {?object=} opt_withValue An optional content value to store in the data object.
 * @param {atb.datastore.ContentTypes =} opt_contentType An optional content type which indicates what type of resource it is. (presumably the thing creating a new such resource *might* know what type of resource it is wanting to create...
 * 
 * @return {number} Returns the localId of the newly create data object.
 * 
 * @public 
**/
atb.DataStore.prototype.createLocalObject = function(opt_withValue, opt_contentType)
{
	var withValue = atb.util.ReferenceUtil.applyDefaultValue(opt_withValue, null);
	var contentType;
	
	if (opt_contentType === null)
	{
		contentType = atb.datastore.ContentTypes.TYPE_NULL;
	}
	else
	{
		var defaultType = (
			(withValue === null)?
			atb.datastore.ContentTypes.TYPE_NULL :
			atb.datastore.ContentTypes.TYPE_UNKNOWN
		);
		
		contentType = atb.util.ReferenceUtil.applyDefaultValue(opt_contentType, defaultType);
	}
	this.debugFilter.debugViewObject(atb.debug.DebugFilter.CAT_TRACE_VIEWOBJECT, this, "[this in DataStore::createLocalObject()]");
	
	var localId;
	localId = this.createLocalDataObject_({
		contentType: contentType,
		lastModified: this.computeNow(),
		content: withValue,
		remoteId: null //omit remote id for now...!
	});
	//	///^losts
	//this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "creating localId: "+localId);
	this.debugDumpObject(atb.debug.DebugFilter.CAT_NOTICE, withValue);
	this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "&nbsp;");
	
	
	return localId;
};



/**
 * Returns true if the data object has not yet been assigned a meaningful value. This can occur if we createLocalObject with null, or for objects which are
 *   still being loaded. Note that this will also return true if the local id does not exist at all yet.
 *
 * @param {number} localId The localId to check the data object for.
 *
 * @return {boolean}
 * @public
**/
atb.DataStore.prototype.isIncompleteObject = function(localId)
{
	var dataObj = this.getDataObject_(localId);
	return this.isIncompleteDataObj_(dataObj);
};



/**
 * returns true if we have a non-null data object stored at the specified localId.
 *
 * @param {number} localId The localId to test.
 *
 * @return {boolean}
 * @public
**/
atb.DataStore.prototype.hasLocalId = function(localId)
{
	if (!this.dss.isValidLocalId(localId))
	{
		return false;
	}
	
	dataObj = this.getDataObject_(localId);
	return (dataObj !== null);
};



/**
 * Returns the dataobject specified by the provided localId, or null if there is no such data object.
 *
 * @param {number} localId The local id to use to lookup the object.
 *
 * @public
**/
atb.DataStore.prototype.getDataObject = function(localId)
{
	return this.getDataObject_(localId);
};



/**
 * Selects an array of items from the available locally-stored data objects.
 *
 * query may contain optional fields where(a function), and limit(a number). It works a bit like 
 *  an SQL select statement.
 *
 * if provided, the where function take the following arguments (dataStore {atb.DataStore}, dataObj {atb.datastore.DataObject}, customArgs {object}, moreQueryInfo {object});
 *    it should also return true or false (true, if you want to keep dataObj in the list of returned values).
 * if a limit is provided, (unless it is -1), after that many items, we will abort and return the values.
 *
 * <b>Note</b>: only works on our local data.
 *
 * @param {?object} query {where(?function=), limit{number}}.
 * @param {?*=} opt_customArgs Forwarded to the the where function.
 *
 * @return {array{atb.datastore.DataObject}} The results.
 * @public
**/
atb.DataStore.prototype.selectDataObjects = function(query, opt_customArgs)
{
	var whereFunc = atb.util.ReferenceUtil.applyDefaultValue(query.where, null);
	var limit = atb.util.ReferenceUtil.applyDefaultValue(query.limit, -1);
	var customArgs=atb.util.ReferenceUtil.applyDefaultValue(opt_customArgs);
	
	var ret = [];
	var all = this.dss.getLocalIdList();
	
	for(var i=0, l = all.length; i<l; i++)
	{
		var localId = all[i];
		var dataObj = this.getDataObject(localId);
		
		if (whereFunc !== null)
		{
			var moreQueryInfo = {query_row_index: i, all_query_rows:all, query_table: this};
			var whereTestResult = whereFunc(this, dataObj, customArgs, moreQueryInfo);
			whereTestResult =atb.util.LangUtil.forceBoolean(whereTestResult, false);
			if (!whereTestResult)
			{
				continue;
			}
		}
		
		ret.push(dataObj);
		
		if ((limit!=-1)&&(ret.length >=limit))
		{
			break;
		}
	}
	return ret;
};



/**
 * convience method to commit all localIds.
 *
 * @param {?function=} opt_onCompleteFunc
 * @param {boolean=} opt_bDelayObjectCollection
 *
 * @public
**/
atb.DataStore.prototype.commitAll = function(opt_onCompleteFunc, opt_bDelayObjectCollection)
{
	//loldirty or notl...???!?
	//lol omit from commit incomplete values probably, but why there in the first place...ifnotmodified...lol..?
	//undo/redo...???globla..???hmmm..???!
	this.commit(this.dss.getLocalIdList(),opt_onCompleteFunc, opt_bDelayObjectCollection);//HACK
};


/**
 * new - split off from commit, since we need to be able to generate ids for ResourceReferece objects...!
 *
**/
atb.DataStore.prototype.generateRemoteIds = function(localIds, opt_onCompleteFunc)
{
	//localIds = atb.util.LangUtil.copyArray(localIds);//paranoia -- make a defensive copy here
	localIds = atb.util.LangUtil.copyArray(localIds);//paranoia -- make a defensive copy here
	var onCompleteFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_onCompleteFunc, null);
	
	
	var needRemoteIdsFor = [];
	var localId, remoteId;
	
	for(i=0, l=localIds.length; i<l; i++)
	{
		localId=localIds[i];
		if (!this.dss.isLocalIdBound(localId))
		{
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_NOTIFY, "missing remoteId for localId: "+localId);
			needRemoteIdsFor.push(localId);
		}
		else
		{
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_NOTIFY, "remoteId found for localId: "+localId+"; remoteId: "+this.dss.getRemoteId(localId));
		}
	}	
	
	var self = this;
	this.requestRemoteIdsFor_internal(needRemoteIdsFor, function(usingRemoteIdStack)
	{
		self.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "done requesting ids...");
		if (usingRemoteIdStack.size() !== needRemoteIdsFor.length)
		{
			//paranoia:
			throw new Error("bad count! avail: "+usingRemoteIdStack.size()+", needed: "+needRemoteIdsFor.length);
		}
		
		for(var i=0, l=needRemoteIdsFor.length; i<l; i++)
		{//what of already requested ids for...?
			
			var localId = needRemoteIdsFor[i];
			
			if (self.dss.isLocalIdBound(localId))
			{//^just in case something bound it in the meantime...?
				this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "localId already bound to a remoteId! localId: "+localId+", remoteId: "+remoteId);
			}
			else
			{
				var remoteId = usingRemoteIdStack.pop();
				self.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "binding unbound localId. localId: "+localId+", remoteId: "+remoteId);
				
				var remoteObj = self.getDataObject_(localId);
				if (remoteObj !== null)
				{
					remoteObj.setRemoteId(remoteId);
				}
				else
				{
					//Q: is this really a 'warning'?:
					this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "no remote obj but binding it! localId: "+localId+", remoteId: "+remoteId);
				}
				self.dss.bind(localId, remoteId);
			}
		}
		
		//ensure we don't have any leftovers:
		self.extraIds.consumeOtherStack(usingRemoteIdStack);
		
		var objects = [];//lol forgot me!
		//if (bDelayObjectCollection)
		//{
			for(var i=0, l=localIds.length; i<l; i++)
			{
				var dataObj;
				dataObj = self.getDataObject_( localIds[i] );
				if (self.isIncompleteDataObj_( dataObj ))
				{
					//TODO: maybe make a warning elsewhere and filter out... or add some way to intelligently filter these out before we get down to here...?
					//hmm.....???
					
					//Q: throw error, or just continue...?
					throw new Error("[late]attempting to commit an incomlete object! localId: "+localIds[i]);
				}
				objects.push(dataObj);
			}
		//}
		
		if (onCompleteFunc !== null)
		{
			onCompleteFunc(objects);
		}
		//self.saveObjects_internal(objects, onCompleteFunc);
		//this.generateRemoteIds(objects);
	});
};

/**
 * commits each of the specified localIds.
 *
 * @param {Array{localId}} localIds The array of ids.
 * @param {?function=} opt_onCompleteFunc An optional function to call when the commit has completed.
 * @param {?boolean=} opt_bDelayObjectCollection If provided and false, grab the objects immediately, otherwise, wait until after they have ids and can be committed by remoteId, before grabbing their dataObject values... (Note: This might not be very purposeful anymore...)
 *
 * @public
**/
//atb.DataStore.prototype.commit = function(localIds, opt_onCompleteFunc, opt_bDelayObjectCollection)
atb.DataStore.prototype.commit = function(localIds, opt_onCompleteFunc)
{
	//localIds = atb.util.LangUtil.copyArray(localIds);//paranoia -- make a defensive copy here
	
	this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "committing ids: [ "+localIds+" ]");
	
	//Q: what of objects which have a local & remoteId, but not value...?
	//	(objects being requested...???)
	
	
	var onCompleteFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_onCompleteFunc, null);
	
	//var bDelayObjectCollection = atb.util.LangUtil.forceBoolean(opt_bDelayObjectCollection, true);//or false...?
	/*var objects = [];
	var i, l;
	var obj;
	
	var self = this;
	var dataObj;
	*/
	/*
	if (!bDelayObjectCollection)
	{
		for(i=0, l=localIds.length; i<l; i++)
		{
			dataObj = self.getDataObject_( localIds[i] );
			if (self.isIncompleteDataObj_( dataObj ))
			{
				//Q: throw error, or just continue...?
				throw new Error("attempting to commit an incomlete object! localId: "+localIds[i]);
			}
			objects.push(dataObj);
		}
	}
	*/
	//what of ids that have remoteids, but are still waiting on remote objects...????
	
	var onFinishGenerateIds = function(objects)
	{
		self.saveObjects_internal(objects, onCompleteFunc);
	};
	//this.generateRemoteIds(objects, onFinishGenerateIds);
	this.generateRemoteIds(localIds, onFinishGenerateIds);
};



/**
 * updates the content of a local data object with the specified content given as set_value.
 *
 * @param {number} localId The localId of the data object to update. bad things happen if thats not a valid id.
 *
 * @public
**/
atb.DataStore.prototype.updateLocalObject = function(localId, set_value)
{
	var dataObj = this.getDataObject_(localId);
	
	if (dataObj === null)
	{
		//do the "bad things...":
		throw new Error("DataStore::updateLocalObject(): no dataObject bound to localId: "+localId);
	}
	dataObj.setContent(set_value);
};



/**
 * gets the content of a local object given by the specified localId argument.
 *
 * @param {number} localId The localId of the data object to get the content value of.
 *
 * @return {?object} Null if object is incomplete or there is no such data object yet, else the data object's content value.
 * @public
**/
atb.DataStore.prototype.getLocalObject = function(localId)
{//probably deprecated as lacks important info...!
	var dataObj = this.getDataObject_(localId);
	if (dataObj === null)
	{
		return null;
	}
	else
	{
		return dataObj.getContent();
	}
}



/**
 * attempts to get the a localId known to be bound to the specified remoteId.
 * if no such binding is known, this fails by returning false.
 *
 * @param {number|string} remoteId The remoteId to try and convert to a localId.
 *
 * @return {number|boolean} returns false if the remoteId is not yet bound to a localId, else returns the bound localId number. Note that we might not have the object yet tho!
 * @public
**/
atb.DataStore.prototype.toLocalId = function(remoteId)
{
	return this.dss.toLocalId(remoteId);
};



/**
 * attempts to retrieve a known remoteId for the given localId.
 *  otherwise, it returns false, if the (local) lookup fails.
 *
 * @param {number} localId The localId to lookup the remoteId of.
 *
 * @return {number|string|boolean} returns false if we don't have a remoteId for that localId yet. else returns the number|string of that localId's bound remoteId.
 * @public
**/
atb.DataStore.prototype.toRemoteId = function(localId)
{
	return this.dss.toRemoteId(localId);
};



/**
 * cancels a resolver created by resolveObjects.
 *
 * TODO: implement some kind of cancel event to be passed along to the resolver's taskFunction...?
 *
 * @param {number} listenerId An id returned by resolveObjects, which you wish to cancel.
 *
 * @return {boolean} True, iff we cancelled a not-yet completed resolver task.
 * @public
**/
atb.DataStore.prototype.cancelResolver = function(listenerId)
{
	this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "cancelling listener: "+listenerId);
	if (listenerId === atb.datastore.AsyncTaskInternal.INVALID_TASK_ID)
	{
		return false;//bad listener id (Note: -1 is used for when listeners completed instantly...!)
	}
	if (atb.util.ReferenceUtil.isBadReferenceValue(this.listeners[listenerId]))
	{
		return false;//listener not found
	}
	delete this.listeners[listenerId];
	return true;//cancelled something
};



//atb.DataStore.prototype.resolveObject = function(remoteId, opt_onCompleteFunction, opt_onErrorTaskFunction)
//atb.DataStore.prototype.resolveObject = function(remoteId, opt_onCompleteFunction, opt_onErrorTaskFunction)
//atb.DataStore.prototype.resolveObject = function(remoteId, opt_onCompleteFunction, opt_onGeneralTaskFunction)
atb.DataStore.prototype.resolveObject = function(remoteId, opt_onCompletionFunction, opt_onGeneralTaskFunction)
{//opt_onGeneralTaskFunction allows us to still be flexible...?...maybe...?
	//var onCompleteFunction = atb.util.ReferenceUtil.applyDefaultValue(opt_onCompleteFunction, null);
	//var
	var onCompletionFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_onCompletionFunction, null);
	//var onErrorTaskFunction = atb.util.ReferenceUtil.applyDefaultValue(opt_onGeneralTaskFunction, null);//opt_onErrorTaskFunction, null);
	var onGeneralTaskFunction = atb.util.ReferenceUtil.applyDefaultValue(opt_onGeneralTaskFunction, null);//opt_onErrorTaskFunction, null);
	
	var taskFunc = function(taskEvent)
	{
		if (onCompletionFunc !== null)
		{
			if (taskEvent.isCompletionEvent())
			{
				onCompletionFunc(taskEvent.getDataObjects()[0]);
			}
		}
		if (onGeneralTaskFunction !== null)
		{
			return onGeneralTaskFunction(taskEvent);
		}
		//return 
		//onErrorTaskFunction
	};
	return this.resolveObjects( [remoteId], taskFunc );
	//opt_taskFunction
};
//atb.DataStore.prototype.resolveObject = function(remoteId, opt_taskFunction)
//{
//	//var onCompleteFunction = atb.util.ReferenceUtil.applyDefaultValue(opt_onCompleteFunction, null);
//	return this.resolveObjects( [remoteId], 
//	//opt_taskFunction
//};
//^LOL would miss ability to send error info...?!

/**
 * (Possibly asynchronously) resolves the requested set of remoteIds. If they are not all already available, then this will
 * create an asynchronous task that attempts to resolve the data objects listed in the specified array of remoteIds.
 *
 * @param {Array{number|string}} remoteIdList The list of remoteIds to resolve.
 * @param {function({atb.datastore.TaskDataReceivedEvent})} taskFunction The function to handle/recieve the TaskDataReceivedEvent events from resolving these remoteIds.
 *
 * @return {number} Returns a listenerId which can be used to cancel this resolver (returns atb.datastore.AsyncTaskInternal.INVALID_TASK_ID (which should be -1), if the request was satisfied immediately (ie, all data requested was already on hand) - in which case no listener was ever registered for this invocation). Returns -1 if it resolved immediately (no resolver task was registered in that case)
 * @public
**/

//atb.DataStore.prototype.resolveObjects = function(remoteIdList, taskFunction)
atb.DataStore.prototype.resolveObjects = function(remoteIdList, opt_taskFunction)
{
	var taskFunction = atb.util.ReferenceUtil.applyDefaultValue(opt_taskFunction, null);
	if (taskFunction == null)
	{
		//hack - a non-null value...lol!:
		taskFunction = function(taskEvent)
		{
			//do nothing!
		};
	}
	
	var self=this;
	/*var localIdList = this.dss.toLocalIds(remoteIdList, function(localId, remoteId)
	{
		var neverModified = null;// HACK
		var dataObj;
		dataObj = self.createDataObjectImpl_(
			localId,
			{
				content: null,
				remoteId: remoteId,
				lastModifed: neverModified,
				contentType: atb.datastore.ContentTypes.TYPE_UNKNOWN
			},
			false
		);
		return dataObj;
	});
	*/
	
	var localIdList = this.toLocalIdsGenObject_(remoteIdList);
	
	var newListener= new atb.datastore.AsyncTaskInternal(this, localIdList, taskFunction, this.dataFilter);
	newListener.onData(this.dss.getRemoteIdList()); //pass in already available data first
	
	if (!newListener.canRemove())
	{
		//only actually add the listener if we haven't already satisified its needs...
		
		//lolforcerefetch..invalidate...???//???
		
		var listenerId = this.listenerCounter++;
		this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "registered listener: "+listenerId+"; still needs: "+newListener.getRemainingItemsString());
		newListener.setTaskId(listenerId);
		this.listeners[listenerId] = newListener;
		
		var self = this;
		var requestResources_localIds = newListener.getCopyOfRemainingItemsArray();
		var requestResources_remoteIds = this.dss.toRemoteIds(requestResources_localIds);
		//^or lolallocate...?
		
		if (requestResources_remoteIds.length !== requestResources_localIds.length)
		{
			throw new Error("(resolveObjects): requestResources_remoteIds.length !== requestResources_localIds.length: did we not have a remoteId for one of the localIds?");
		}
		var requestResources = requestResources_remoteIds;
		//this.invokeLater(function()
		atb.DataStore.invokeLater(function()
		{
			self.webService.requestResources(requestResources, function(response)
			{
				self.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "recieved resources response from webservice: "+response);
				self.loadRemoteDataPacket(response);
			});
		});
		return listenerId;
		
		
	}
	else
	{
		//orloltrace..?
		this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "immediately satisified resolve request!");
		//already completed with existing data
		return atb.datastore.AsyncTaskInternal.INVALID_TASK_ID;//-1;
	}
};




///////////////////// Internal Methods: ///////////////////////////




//probably deprecated:
/**
 *
 * @deprecated
 * @private
**/
atb.DataStore.prototype.debugMessage = function(cat, msg)
{
	this.debugFilter.debugMessage(cat,msg);
};



//probably deprecated:
/**
 *
 * @deprecated
 * @private
**/
atb.DataStore.prototype.debugDumpObject = function(cat, obj)
{
	this.debugFilter.debugDumpObject(cat,obj);
};



/**
 *
 * @private
**/
atb.DataStore.prototype.requestRemoteIdsFor_internal = function(localIds, onCompleteFunc)
{
	var numIdsNeeded = localIds.length;
	var totalNeeded = numIdsNeeded;
	
	var received = new atb.util.Stack();
	
	if (numIdsNeeded > 0)
	{
		//var requestFunction;
		var self = this;
		var requestFunction = function(recievedIds)
		{
			var numRecieved = recievedIds;
			received.pushAll(recievedIds);
			//TODO: ?= ensure the they are unique...?
			
			numIdsNeeded -= numRecieved;
			
			if (numIdsNeeded > 0)
			{
				self.webService.withUidList(numIdsNeeded, requestFunction);
			}
			else
			{
				//handle overflow:
				var extraCount = received.size() - totalNeeded;
				if (extraCount > 0)
				{
					var extrasList = received.popN(extraCount);
					self.extraIds.push(extrasList);
				}
				
				//finish:
				onCompleteFunc(received);
			}
			
		};
		
		var fromExtras = this.extraIds.popN(numIdsNeeded);
		
		requestFunction(fromExtras);
	}
	else
	{
		onCompleteFunc(received);
	}
};



/**
 *
 * @private
**/
atb.DataStore.prototype.isDeletedResource=function(dataObj)
{
	return false;//HACK
};



/**
 *
 * @private
**/
atb.DataStore.prototype.isModifiedResource=function(dataObj)
{
	if (!this.isIncompleteDataObj_(dataObj))
	{
		if (this.bEnableModifiedCheck)
		{
			return dataObj.wasModifiedLocally();
		}
		else
		{
			return true;//hack
		}
	}
	else
	{
		return false;//invalid.
	}
};



/**
 *
 * @private
**/
atb.DataStore.prototype.processEntryForSaving = function(dataObj)
{
	//orlolcopy...?!?
	//or list of processors...?
	//or per-resource type handlers... and ... possibly a resource type picker/filter funcs...masks...lol...?
	
	//maybe also a custom multiplexer...???
	
	var requests = new atb.util.Stack();
	
	//lolhacks...todo maybe also paranoid-ly check that they're not incomplete...??
	var cfg = dataObj.getCurrentConfig();
	//TODO: double check that we are not able to modify the cfg.content/etc value elsewhere after here...
	//		...sadly we'll probably need a (deep) defensive copy of it in cfg instead of just using it as it now is... =/
	
	var remoteId = dataObj.getRemoteId();
	if (this.isModifiedResource(dataObj))
	{
		var modifyRequest = {
			request: "modify",
			id: remoteId,
			entry: cfg
		};
		requests.push(modifyRequest);
	}
	if (this.isDeletedResource(dataObj))
	{
		var deleteRequest = {
			request: "delete",
			id: remoteId,
			entry: cfg
		};
		requests.push(deleteRequest);
	}
	
	return requests;
};



/**
 *
 * @private
**/
atb.DataStore.prototype.saveObjects_internal = function(objectEntries, onCompleteFunc)
{
	this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "savingObjects_internal()...");
	this.debugDumpObject(atb.debug.DebugFilter.CAT_TRACE, objectEntries);
	
	//paranoia:
	var i, l;
	var requests =new atb.util.Stack();
	
	var sweptObjectsAtDirtyTimeMap = new atb.util.Map();
	
	for(i=0, l=objectEntries.length; i<l; i++)
	{
		var dataObj = objectEntries[i];
		
		if (this.isIncompleteDataObj_(dataObj))
		{
			throw new Error("[saveObjects_internal]: attempting to commit an incomlete object! localId: "+localIds[i]);
		}
		//^...?: or do we [want to] wait for values...????
		//...or just omit those incomplete objects...????
		
		var subRequests = this.processEntryForSaving(dataObj);
		
		var localId = dataObj.getLocalId();
		var dirtyCounter= dataObj.readDirtyCounter();
		sweptObjectsAtDirtyTimeMap.put(localId, dirtyCounter);
		requests.consumeOtherStack(subRequests);
	}
	requests = requests.popAll();//convert back to an array
	
	this.replaceResourceReferencesInCopy(requests, function(requests)
	{
	
		//requests = this.
		var self = this;
		
		this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "sending requests batch...");
		//this.webService.withBatchMarkerRequests(requests, function(response)
		this.webService.old_withBatchMarkerRequests(requests, function(response)//HACK
		{
			self.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "ready to complete saveinternal!");
			if (onCompleteFunc !== null)
			{
				for(i=0, l=objectEntries.length; i<l; i++)
				{
					var dataObj = objectEntries[i];
					var localId;
					localId = dataObj.getLocalId();
					if (sweptObjectsAtDirtyTimeMap.has(localId))
					{
						var lastSeenDirty = sweptObjectsAtDirtyTimeMap.get(localId);
						if (lastSeenDirty !== null)
						{
							dataObj.unmarkDirtyIfDirtyCounterMatches(lastSeenDirty);
						}
						else
						{
							self.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "NULL last seen time stored for localId: "+localId);
						}
					}
					else
					{
						self.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "no last seen time stored for localId: "+localId);
					}
				}
				onCompleteFunc();
			}
			else
			{
				self.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "(no oncompletefunc in saveinternal!)");
			}
		});
	});
};



/**
 *
 * @private
**/
atb.DataStore.prototype.mergeObjectHelper = function(localObject, externalObject, opt_externalEntry)
{
	this.debugMessage(atb.debug.DebugFilter.CAT_TODO, "TODO: implement merge");
	
	//TODO: maybe get some kind of modification time info... or partial merging...?
	
	if (this.isIncompleteDataObj_(localObject))
	{
		return externalObject;
	}
	
	//else maybe merge or based on time...lol..?
	
	return externalObject;
};



/**
 *
 * @private
**/
atb.DataStore.prototype.parseDataObject_ = function(marker)
{
	var response = marker.response;
	//todo: maybe check if the response/marker is a bad one....?
	var remoteId = marker.id;
	if (atb.util.ReferenceUtil.isBadReferenceValue(remoteId))
	{
		this.debugFilter.debugViewObject(atb.debug.DebugFilter.CAT_ERROR, marker, "marker has bad remoteId (marker.id) field!");
		throw new Error("bad remoteId in atb.DataStore::parseDataObject_()!");
	}
		
	var localId = this.dss.toLocalId(remoteId,false);
	var bNewlyCreatedId = false;
	
	
	var newContent = response.content;
	//setDefaultContentTypeDereferencers
	//var useContent = atb.util.ReferenceUtil.applyDefaultValue( response.content, null);
	newContent = this.prepareLocalReplacement_(newContent);
	//var useContent = atb.util.ReferenceUtil.applyDefaultValue( response.content, null);
	var useContent = atb.util.ReferenceUtil.applyDefaultValue( newContent, null);
	
	/*if (useContent===null)
	{
		//debugViewObject(response, "respones");
		//debugViewObject(response, "response");
		
		debugViewObject({
			response: response,
			marker: marker
		}, "stuff");
		throw new Error("TEST!!!");
	}*/
	var config = {
		lastModified: new Date( atb.util.ReferenceUtil.applyDefaultValue(response.lastModified,0) ),//HACK - todo fix dates...?
		content: useContent,
		contentType: atb.util.ReferenceUtil.applyDefaultValue( response.contentType, atb.datastore.ContentTypes.TYPE_NULL),
		remoteId: remoteId
	};
	
	var ret;
	var bAdded = false;
	
	if (localId === false)
	{
		localId = this.createLocalDataObject_(config, false);
		ret = this.getDataObject_(localId);
		bAdded = true;
	}
	else
	{
		ret = new atb.datastore.DataObject(this, localId, config, this.dataFilter);
		bAdded = false;
	}
	
	return {dataObj: ret, bAdded: bAdded};
};



/**
 * A callback to pass to the webservice to recieve json resource datums.
 * Note: this is a callback, important to document, probably, but not generally intended to be called directly.
 *
 * @param [{object}] data A list of response entries.
 * 
 * @public
**/
atb.DataStore.prototype.loadRemoteDataPacket = function(data)
{
	var markers = data;//hack;
	this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "recieved data...");
	this.debugDumpObject(atb.debug.DebugFilter.CAT_TRACE, data);
	
	var modifiedLocalIds = [];
	
	for (var i=0, l=markers.length; i<l; i++)
	{
		var marker = markers[i];
		var parseResult = this.parseDataObject_(marker);
		
		var bAdded = parseResult.bAdded;//badded;//lol!
		var newDataObj = parseResult.dataObj;
		
		var localId = newDataObj.getLocalId();
		
		var useObj = newDataObj;
		
		if (!bAdded)
		{
			var currentObj = this.getDataObject_(localId);
			useObj = this.mergeObjectHelper(currentObj, newDataObj, marker);
		}
		
		if (this.isIncompleteDataObj_(useObj))
		{
			this.debugFilter.debugViewObject(atb.debug.DebugFilter.CAT_ERROR, useObj, "incomplete dataobj being loaded");
			throw new Error("ds::loadRemoteDataPacket(): useObj is incomplete!");
		}
		//^Lolprobablyaranolol!
		
		modifiedLocalIds.push(localId);
		this.putDataObject_(localId, useObj);
		
		//lolconten...lol..?
	}
	
	if (modifiedLocalIds.length > 0)
	{
		this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "modifiedLocalIds = "+modifiedLocalIds);
		this.onDataModified(modifiedLocalIds);
	}
	else
	{
		this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "no modified ids in data!");
		this.debugDumpObject(atb.debug.DebugFilter.CAT_TRACE,data);
	}
};



/**
 *
 * @private
**/
atb.DataStore.prototype.onDataModified=function(modifiedLocalIdList)
{
	this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "data store modified items: "+modifiedLocalIdList);
	var finished = [];
	var k;
	for(k in this.listeners)
	{
		var listener;
		listener = this.listeners[k];
		this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "calling onData for listener. key="+k+", listener= "+listener);
		this.debugFilter.debugViewObject(atb.debug.DebugFilter.CAT_TRACE_VIEWOBJECT, listener,"tracinglistener");//HACK
		listener.onData( modifiedLocalIdList );
		
		if (listener.canRemove())
		{
			finished.push(k);
		}
	}
	
	for(var i=0,l=finished.length; i<l; i++)
	{
		this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "listener finished: "+k);
		this.listeners[k].setTaskId(atb.datastore.AsyncTaskInternal.INVALID_TASK_ID);
		delete this.listeners[k];
	}
	
	this.debugMessage(atb.debug.DebugFilter.CAT_TRACE, "finished ondatamodified!");
};



/**
 *
 * @private
**/
//atb.DataStore.prototype.invokeLater = function(opt_scope, callFuncLater)
atb.DataStore.invokeLater = function(opt_scope, callFuncLater)
{
	if ( atb.util.ReferenceUtil.isBadReferenceValue(callFuncLater))
	{
		//only one arg, apply it to callFuncLater:
		callFuncLater = opt_scope;
		scope = null;
		opt_scope = null;
		
	}
	else
	{
		scope = atb.util.ReferenceUtil.applyDefaultValue(opt_scope, null);
	}

	window.setTimeout(function()
	{
		if (scope!==null)
		{
			callFuncLater.call(scope);
		}
		else
		{
			callFuncLater();
		}
	}, 1);//10);
};



/**
 *
 * @private
**/
atb.DataStore.prototype.putDataObject_ = function(localId, dataObj)
{
	dataObj = atb.util.ReferenceUtil.applyDefaultValue(dataObj, null);
	if (dataObj === null)
	{
		throw new Error("tried to put a null/invalid dataobject into localId: "+localId);
	}
	this.dss.updateObject(localId, dataObj);
};



/**
 *
 * @private
**/
atb.DataStore.prototype.isIncompleteDataObj_ = function(dataObj)
{
	dataObj = atb.util.ReferenceUtil.applyDefaultValue(dataObj, null);//hack
	return ((dataObj === null)||(dataObj.isIncompleteObject()));
};



/**
 *
 * @private
**/
atb.DataStore.prototype.getDataObject_ = function(localId)
{
	var ret = this.dss.getObject(localId);
	ret = atb.util.ReferenceUtil.applyDefaultValue(ret, null);
	return ret;
};



//package/internal use only:
/**
 * for use internally(~package) only. returns a list of data objects given a list of localIds. loudly fails horribly(on purpose, so far...), if the data object hasn't been created yet
 * (its perfectly okay with incomplete ones, though)
 * @param {[number]} localIds an array of localIds.
 *
 * @return {[atb.datastore.DataObject]} An array containing the dataObjects at those localIds.
 * @protected
**/
atb.DataStore.prototype.getDataObjectsImmediately = function(localIds)
{
	var ret = [];
	for(var i=0, l = localIds.length; i<l; i++)
	{
		var localId= localIds[i];
		var dataObj = this.getDataObject_(localId);
		if (dataObj===null)
		{
			throw new Error("attempted to retrieve an null data object 'immediately'! localId: "+localId);
		}
		ret.push(dataObj);
		
	}
	return ret;
};



/**
 * Calculates a date/time for the present moment in time.
 * Sorta "package" scope'd to atb.datastore.* package.
 * 
 * @return {timestamp} The current moment in time.
 *
 * @private
**/
atb.DataStore.prototype.computeNow = function()
{
	//todo: ?=take into account servertime..>?
	//todo: maybe forward to webservice..>?
	return this.webService.computeTimestamp();
};



/**
 *
 * @private
**/
atb.DataStore.prototype.createLocalDataObject_ = function(config, bForceDirty)
{
	var localId = this.dss.allocateLocalId();
	this.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "DataStore::createLocalDataObject_(): creating localId: "+localId);
	this.createDataObjectImpl_(localId, config, bForceDirty);
	return localId;
}



/**
 *
 * @private
**/
atb.DataStore.prototype.createDataObjectImpl_ = function(localId, config, bForceDirty)
{
	bForceDirty = !!bForceDirty;
	var dataObj = new atb.datastore.DataObject(this, localId, config, this.dataFilter);
	this.putDataObject_(localId, dataObj);
	if (bForceDirty)
	{
		dataObj.markDirty();
	}
	
	return dataObj;
};



atb.DataStore.prototype.getLocalResourceReference = function(localId)
{
	if (localId instanceof atb.datastore.ResourceReference)
	{
		return localId;//hack
	}
	
	
	//if (this.isIncom
	var dataObj = this.getDataObject(localId);
	if (dataObj === null)
	{
		////this.debugMessage(atb.debug.DebugFilter.CAT_WARN, "atb.DataStore.prototype.getLocalResourceReference(): no such localId found: "+localId);
		this.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "atb.DataStore.prototype.getLocalResourceReference(): no such localId found: "+localId);
		return null;
	}
	
	return dataObj.getResourceReference();
	//atb.datastore.ResourceReference
};



atb.DataStore.prototype.getRemoteResourceReference = function(remoteId, opt_bRequestObject, opt_onRequestCompletedCallback)
{
	
	//	//!!!
	//lolshouldbe okay, since it doesn't check if the id is unusedanywhere when gneeratign requests...?LOL!
	var bRequestObject = atb.util.LangUtil.forceBoolean(opt_bRequestObject, false);//default to a sort of 'weak' reference
	if (bRequestObject)
	{
		var onRequestCompletedCallback = atb.util.ReferenceUtil.applyDefaultValue(opt_onRequestCompletedCallback, null);
		var func = null;
		if (onRequestCompletedCallback !== null)
		{
			func = function(taskEvent)
			{
				if (taskEvent.isCompletionEvent())
				{
					var dataObj = taskEvent.getDataObjects()[0];
					onRequestCompletedCallback(dataObj.getResourceReference());
				}
			};
		}
		//else
		//{
		//	//func = function(taskEve
		//}
		if (remoteId instanceof atb.datastore.ResourceReference)
		{
			//return remoteId;//hack
			remoteId.resolveDataObject(func);
		}
		else
		{
			this.resolveObjects([remoteId],func);
		}
		//this.dss.
	}
	else
	{
	}
	
	if (remoteId instanceof atb.datastore.ResourceReference)
	{
		return remoteId;//hack
	}
	
	var localIds = toLocalIdsGenObject_([remoteId]);
	var localId =localIds[0];
	return this.getLocalResourceReference(localId);//HACK
};



//var localIdList = this.
//atb.DataStore.prototype.toLocalIdsGenObject_(remoteIdList);
atb.DataStore.prototype.toLocalIdsGenObject_=function(remoteIdList)
{
	var self=this;
	var localIdList = this.dss.toLocalIds(remoteIdList, function(localId, remoteId)
	{
		var neverModified = null;// HACK
		var dataObj;
		dataObj = self.createDataObjectImpl_(
			localId,
			{
				content: null,
				remoteId: remoteId,
				lastModifed: neverModified,
				contentType: atb.datastore.ContentTypes.TYPE_UNKNOWN
			},
			false
		);
		return dataObj;
	});
	return localIdList;
};

atb.DataStore.prototype.fixRemoteFieldsMap = function(obj, fieldMap)//s)
{
	for(var k in fieldMap)
	{
		var v = obj[k];
		//var with = fieldMap[k];
		var replacement = fieldMap[k];
		if (!atb.util.ReferenceUtil.isBadReferenceValue(v))
		{
			if (atb.util.LangUtil.isString(replacement))
			{
				this.fixRemoteFields(v, replacement);
			}
			else if (atb.util.LangUtil.isArray(replacement))
			{
				this.fixRemoteFields(v, replacement);
			}
			else if (atb.util.LangUtil.isObject(replacement))
			{
				this.fixRemoteFieldsMap(v, replacement);
			}
			else
			{
				this.fixRemoteFields(obj, [k]);
			}
			//if (v === true)
			
			//obj[k] = v
		}
	}
}
/*
atb.DataStore.prototype.fixRemoteFieldsMap = function(obj, fieldMaps)
{
	for(var i=0; i<l; i++)
	{
		
	}
*/
	/*for(var k in fields)
	{
		
	}*/
//};
atb.DataStore.prototype.fixRemoteFields = function(obj, fieldNames)
{
	for(var i=0, l= fieldNames.length; i<l; i++)
	{
		//var field = 
		var key = fieldNames[i];
		//if (
		var val = obj[key];
		if (!atb.util.ReferenceUtil.isBadReferenceValue(val))
		{
			var fixedVal;
			if (atb.util.LangUtil.isArray(val))
			{
				fixedVal = this.evaluateRemoteIdFieldArray(val);
			}
			else
			{
				fixedVal = this.evaluateRemoteIdField(val);
			}
			obj[key] = fixedVal;
		}
	}
};

atb.DataStore.prototype.evaluateRemoteIdFieldArray = function(raw_values)
{
	var ret = [];
	for(var i=0, l=raw_values.length; i<l; i++)
	{
		ret.push(this.evaluateRemoteIdField(raw_values[i]));
	}
	return ret;
};

atb.DataStore.prototype.evaluateRemoteIdField = function( raw_value )
{
	//lolntaurstlol..?
	////	!!!
	if (atb.util.ReferenceUtil.isBadReferenceValue(raw_value))
	{
		// !!!
		this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "DataStore::evaluateRemoteIdField() invoked on null/undefined! onvalue="+raw_value);
		return null;//invalid...
	}
	//else
	//{
	//
	//}
	
	if (raw_value instanceof atb.datastore.ResourceReference)
	{
		return raw_value;
	}
	else
	{
		//lolhack:
		return this.getRemoteResourceReference(raw_value);
	}
};

//atb.DataStore.prepareObjectDataForServer = function(data, callback)
//atb.DataStore.prepareObjectDataForServer = function(data)

//this version is far more complicated, but since resolveRemoteIds will be immediate..://nopelies!
//^LIES



//atb.DataStore.prepareObjectDataForServer = function(data, callback)
//atb.DataStore.prototype.prepareObjectDataForServer = function(data, callback)

//atb.DataStore.prototype.register//lolhandle replacements...?
//atb.DataStore.prototype.registerContentTypeD
//atb.DataStore.prototype.prepareLocalReplacement_ = function(dataObj)
//internal_content

atb.DataStore.prototype.prepareLocalReplacement_ = function(contentType, content)
{
	//var contentType = dataObj.getContentType();
	
	
	//if (this.contentTypeDereferencers.has(contentType))
	//{
	var deref = this.contentTypeDereferencers.get(contentType);
	//}
	if (deref !== null)
	{
		//var internal_content = dataObj.getContent();
		//todo: maybe copy internal content..?
		//internal_content 
		//content = 
		//deref(this,content);//internal_content);
		deref.call(this,content);
		//dataObj.setContentInternal(internal_content);
	}
	return content;
	
	//var deref = 
};

atb.DataStore.prototype.setDefaultContentTypeDereferencers = function()
{
	/*
	atb.datastore.ContentTypes.TYPE_NULL,
	atb.datastore.ContentTypes.TYPE_MARKER,
	atb.datastore.ContentTypes.TYPE_ANNOTATION,
	atb.datastore.ContentTypes.TYPE_TEXT_BLOCK,
	atb.datastore.ContentTypes.TYPE_TEXT_MAP_RESOURCE,
	atb.datastore.ContentTypes.TYPE_TEXT_TEXT_DOCUMENT_RESOURCE,
	
	atb.datastore.ContentTypes.TYPE_USER_RESOURCE,//lolnew-based on dataformats.txt
	
	atb.datastore.ContentTypes.TYPE_UNKNOWN
	*/
	
	//var self = this;
	/*var replaceArrays = function(obj, keys)
	{
	}*/
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_MARKER, 
		function(marker)
		{
			this.fixRemoteFieldsMap(
				marker, 
				{
					user: true,
					canvas: true
				}
			);
		}
	);
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_ANNOTATION, 
		function(annotation)
		{
			this.fixRemoteFieldsMap(
				quote, 
				{
					user: true,
					anno: [
						"user", "bodies", "targets"
					]
					//{
						//user: true,
						
					//}
				}
			);
		}
	);
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_TEXT_BLOCK, 
		function(quote)
		{
			/*quote.user = this.evaluateRemoteIdField(quote.user);
			quote.textHighlight.user = this.evaluateRemoteIdField(quote.textHighlight.user);
			
			quote.text = this.evaluateRemoteIdField(quote.text);
			*/
			this.fixRemoteFieldsMap(
				quote, 
				{
					user: true,
					text: true,
					textHighlight: {
						user: true
					}
				}
			);
		}
	);
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_TEXT_MAP_RESOURCE, 
		function(document)
		{//lolcanvas...?
		
			this.fixRemoteFields(
				document, 
				["user", "markers", "annos"]
			);
			//document.user = this.evaluateRemoteIdField(document.user);
			//document.markers = this.evaluateRemoteIdFieldArray(document.markers);
			//document.annos = this.evaluateRemoteIdField(document.annos);
		}
	);
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_TEXT_TEXT_DOCUMENT_RESOURCE, 
		function(document)
		{
			//document.user = this.evaluateRemoteIdField(document.user);
			//document.text.user = this.evaluateRemoteIdField(document.text.user);
			this.fixRemoteFieldsMap(
				document, 
				{
					user: true,
					text: {
						user: true
					}
					//markers: true,
					//an
				}
				////!!!
				//["user", "markers", "annos"]
			);
			
		}
	);
	
	this.setContentTypeDereferencer(
		atb.datastore.ContentTypes.TYPE_USER_RESOURCE, 
		function(user)
		{
			/*
			user.user.canvases = this.evaluateRemoteIdFieldArray(user.user.canvases);
			user.user.images = this.evaluateRemoteIdFieldArray(user.user.images);
			user.user.markers = this.evaluateRemoteIdFieldArray(user.user.markers);
			user.user.texts = this.evaluateRemoteIdFieldArray(user.user.texts);
			user.user.textHighlights = this.evaluateRemoteIdFieldArray(user.user.textHighlights);
			user.user.annos = this.evaluateRemoteIdFieldArray(user.user.annos);
			*/
			this.fixRemoteFieldsMap(
				document, 
				{
					user: ["canvases", "images", "markers", "texts", "textHighlights", "annos"]
				}
			);
		}
	);
	
	//atb.datastore.ContentTypes.TYPE_USER_RESOURCE
	//TYPE_TEXT_TEXT_DOCUMENT_RESOURCE
	//TYPE_TEXT_BLOCK
};

atb.DataStore.prototype.setContentTypeDereferencer = function(contentType, derefFunc)
{
	this.contentTypeDereferencers.put(contentType, derefFunc);
};

atb.DataStore.prototype.replaceResourceReferencesInCopy = function(data, callback)
{
	//var bNeedCopy = true
	var references = new atb.util.Set();
	var refsList = [];
	var bHadAnyRefs = false;
	var localIds = [];
	
	var replacementFuncA = function(obj)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(obj))
		{
			if (obj instanceof atb.datastore.ResourceReference)
			{
				bHadAnyRefs = true;
				//return obj;
				if (!obj.hasRemoteId())
				{
					if (references.add(obj))
					{
						refsList.push(obj);
						localIds.push(obj.getLocalId());
					}
				}
				return obj;
			}
		}
		return atb.util.LangUtil.copyObject(data);
	};
	
	//var copyA = return atb.util.LangUtil.copyObject(data, replacementFuncA);
	var replacementFuncB = function(obj)
	{
		if (!atb.util.ReferenceUtil.isBadReferenceValue(obj))
		{
			if (obj instanceof atb.datastore.ResourceReference)
			{
				if (!obj.hasRemoteId())
				{
					throw new Error("atb.DataStore.prepareObjectDataForServer(): replacmentFuncB(): obj lacks remoteId! localId: "+obj.getLocalId());
				}
				return obj.getRemoteId_assertExists_();
				//return obj.getRemoteId();
			}
		}
		return atb.util.LangUtil.copyObject(data);
	};
	
	var callback_internal = function(fromCopy,bHadAnyReferences,toCallback)//copyA)
	{
		var copyB;
		if (bHadAnyReferences)
		{
			////copyB = atb.util.LangUtil.copyObject(data, replacementFuncB);
			//	//copyB = atb.util.LangUtil.copyObject(copyA, replacementFuncB);
			copyB = atb.util.LangUtil.copyObject(fromCopy, replacementFuncB);
		}
		else
		{
			copyB =fromCopy;// copyA;
		}
		//callback(copyB);
		toCallback(copyB);
	};
	//copyB = 
	var do_finish = function()
	{
		callback_internal(copyA,bHadAnyRefs,callback);//hack
	};
	
	/*
	
	var continueWorking = function()
	{
		//note: finishone is a validly scoped variable(just not yet initialized) here due to the oddities of javascript
		if (!references.isEmpty())
		{
			var ref = null;
			for(var i=0,l = refsList.length; i<l; i++)
			{
				if (references.contains(refsList[i]))
				{
					ref = refsList[i];
				}
			}
			if (ref===null)
			{
				//paranoia...?:
				//throw new Error("datastore::prepareObjectDataForServer(): null ref!");
				debugPrint("warning: datastore::prepareObjectDataForServer(): null ref!");
			}
			else
			{
				//var remoteId = ref.getRemoteId_assertExists_();
				//ret.getRemoteId_assertExists_()
				//ref.resolveRemoteId
				ref.resolveRemoteId(finishOne);
				return;//stop control flow - prevent default finishing call below
				//return
			}
		}
		callback_internal(copyA,bHadAnyRefs,callback);
	}
	
	var finishOne = function(remoteId)//taskEvent)
	{
		references.remote(remoteId);
		//window.setTimeout
		
		//ensure we don't overflow the stack: (therefore its best to ensure this has been completed beforehand):
		atb.DataStore.invokeLater(continueWorking);
		//continueWorking();
		//else
		//{
		//	
		//}
	};
	*/
	
	this.generateRemoteIds(localIds, function(dataObjects)//remoteIds)
	{
		//assert: all locally created objects have been assigned remoteIds
		do_finish();
	});
	
	//atb.DataStore.prepareObjectDataForServer = function(data, callback)
	//continueWorking();
	
	
};//replaceResourceReferencesInCopy

/*
atb.DataStore.prepareObjectDataForServer = function(data, callback)
{
}*/

//atb.DataStore.prototype.resol
//atb.DataStore.prototype.requestRemoteResourceReference = function(remoteId)
//{
//};
//atb.DataStore.prototype.resolveRemoteResourceReference

//atb.DataStore.prototype.
//atb.datastore.ResourceReference

//atb.DataStore.prototype.normalizeKey_ = function()
//{
//	
//};
//^LOL




////////////////////////Fields://////////////////////////////////



// (None)

/////////////////////////////// End of class ///////////////////////////////

//TODO: check into/handle the case of already retrieved data without requesting it again interallly,,,maybeprobal..lol.>??.