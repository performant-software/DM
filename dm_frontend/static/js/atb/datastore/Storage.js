//goog.provide("atb.DataStore.Storage");
//goog.provide("atb.DataStoreStorage");
goog.provide("atb.datastore.Storage");

/**
 * @fileoverview Provides a 'simple' storage data-structure.
 *  the motivation here for splitting the data-store into two parts is that 
 *  although this "storage" part is relatively simple, implementing both this and
 *  the interface through which people will interact with this in a clean way seemed
 *  like it was going to become difficult and possibly rather messy.
 *
 *  therefore, all of the steady-state storage goes here, and this attempts to provide a sane
 *   inteface to atb.DataStore such that all of the methods try to avoid exposing functionality that
 *   would not encourage proper exposure of the data.
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.Map");
goog.require("atb.util.LangUtil");

goog.require("atb.debug.DebugFilter");
//goog.require("atb.DataStore");


/**
 * our constructor. Since this class JUST stores the data, we can probably get away with an empty constructor.
 * though, we might want to add the ability to maybe add a list of initial values...?
 * @constructor
 * @public
**/
atb.datastore.Storage = function(set_ds, opt_setDebugFilter)
{
	if ((atb.util.ReferenceUtil.isBadReferenceValue(set_ds))||(!(set_ds instanceof atb.DataStore)))
	{
		throw new Error("atb.datastore.Storage::Storage(): bad set_ds: "+set_ds);
	}
	this.ds = set_ds;
	this.debugFilter = atb.util.ReferenceUtil.applyDefaultValue(opt_setDebugFilter, null);
	if (this.debugFilter === null)
	{
		this.debugFilter = new atb.debug.DebugFilter();
	}
	
	//Nothing needs doing. our fields are initialized to our prototype values
	this.remoteIdMap = new atb.util.Map();
	this.localIdMap = new atb.util.Map();
	this.objectsMap = new atb.util.Map();
	this.localIdList_ = [];
	this.remoteIdList = [];
};

/**
 * returns the new localId to which 'withValue' is now bound.
**/
atb.datastore.Storage.prototype.createObject = function(withValue)
{
	withValue = atb.util.ReferenceUtil.applyDefaultValue(withValue, null);
	var usingId = this.generateNextLocalId_();
	
	this.objectsMap.put(usingId, withValue);
	return usingId;
};

atb.datastore.Storage.prototype.updateObject = function(localId, withValue)
{
	if (!this.isValidLocalId_(localId))
	{
		throw new Error("bad localId: "+localId+", trying to updateObject with value: "+withValue);
	}
	//if (!this.hasObject
	//this.objectsMap.put(usingId, withValue);
	this.objectsMap.put(localId, withValue);
};
//^lolforgot the closing brace!

atb.datastore.Storage.prototype.hasObject = function(localId)
{
	return this.objectsMap.has(localId);
};

atb.datastore.Storage.prototype.getObject = function(localId)
{
	return this.objectsMap.get(localId);
};

atb.datastore.Storage.prototype.isLocalIdBound = function(localId)
{
	return this.localIdMap.has(localId);
};

atb.datastore.Storage.prototype.isRemoteIdBound = function(remoteId)
{
	return this.remoteIdMap.has(remoteId);
};

atb.datastore.Storage.prototype.toRemoteId = function(localId)
{
	if (!this.localIdMap.has(localId))
	{
		return false;
	}
	else
	{
		return this.localIdMap.get(localId);
	}
};

atb.datastore.Storage.prototype.allocateRemote = function(remoteId)
{
	//debugPrint("allocateRemote:( remote: "+remoteId+")");
	return this.toLocalId(remoteId, true);
};

atb.datastore.Storage.prototype.toRemoteIds = function(localIds)
{
	var ret = [];
	for (var i=0, l=localIds.length; i<l; i++)
	{
		var localId = localIds[i];
		var remoteId = this.toRemoteId(localId);
		if (remoteId === null)
		{
			//Q: what to do...?lol..?!
			//is/should this actually a warning...??:
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "(atb.datastore.Storage.prototype.toRemoteIds): missing remoteId for localId = "+localId);
			continue;
		}
		ret.push(remoteId);
	}
	return ret;
};

//atb.datastore.Storage.prototype.toLocalIds = function(remoteIds, opt_fillWithValue)
atb.datastore.Storage.prototype.toLocalIds = function(remoteIds, opt_fillWithValueFunc)
{
	//var fillWithValueFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_fillWithValueFunc, null);
	
	var ret = [];
	for(var i=0, l =remoteIds.length; i<l; i++)
	{
		var remoteId = remoteIds[i];
		//var fillValue = null;
		//if (fillWithValueFunc!== null)
		var localId = this.toLocalId(remoteId, true, opt_fillWithValueFunc);
		//fillValue);//opt_fillWithValue);
		ret.push(localId);
	}
	return ret;
		/*toLocalId(remoteId, false);
		if (localId===false)
		{
			this.createLocalObject
		}
		*/
		//this.allocateRemote(remoteId);//toLocalId(remoteId, true);
	//}
};

//atb.datastore.Storage.prototype.toLocalId = function(remoteId, opt_bAllocate, opt_putValue)
//atb.datastore.Storage.prototype.toLocalId = function(remoteId, opt_bAllocate, opt_putValueFunc)
atb.datastore.Storage.prototype.toLocalId = function(remoteId, opt_bAllocate, opt_putValueFunc)
{
	//by default don't allocate a localId for it and return false:
	opt_bAllocate = atb.util.LangUtil.forceBoolean(opt_bAllocate, false);
	opt_putValueFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_putValueFunc, null);
	//	////var fillWithValueFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_fillWithValueFunc, null);
	
	
	//debugPrint("toLocalId: (local: "+localId+", opt_bAllocate: "+opt_bAllocate+")");
	
	var localId;
	if (!this.remoteIdMap.has(remoteId))
	{
		if (opt_bAllocate)
		{
			//on-demand allocation requested and required, generate our result:
			//opt_putValueFunc
			//localId = this.createObject(opt_putValue);
			localId = this.createObject(null);
			if (opt_putValueFunc !== null)
			{
				//function(localId, remoteId):
				var fillWithValue = opt_putValueFunc(localId, remoteId);
				this.updateObject(localId, fillWithValue);
				//^LOL!
			}
			//null);
			//this.bindLocal(localId, remoteId);
			this.bind(localId, remoteId);
		}
		else
		{
			//report failure:
			return false;
		}
	}
	else
	{
		//retrieve result:
		localId = this.remoteIdMap.get(remoteId);
	}
	return localId;
	
};

atb.datastore.Storage.prototype.isValidLocalId = function(localId)
{
	return this.isValidLocalId_(localId);//lolhack!
};

atb.datastore.Storage.prototype.bind = function(localId, remoteId)
{
	//debugPrint("bind: (local: "+localId+", remote: "+remoteId+")");
	if (!this.isValidLocalId_(localId))
	{
		throw new Error("bad localId: "+localId+", trying to bind to remoteId: "+remoteId);
	}
	
	if (atb.util.ReferenceUtil.isBadReferenceValue(remoteId))
	{
		throw new Error("atb.datastore.Storage::bind(): bad remoteId! localId: "+localId+"; remoteId: "+remoteId);
	}
	if (atb.util.ReferenceUtil.isBadReferenceValue(localId))
	{
		throw new Error("atb.datastore.Storage::bind(): bad localId! localId: "+localId+"; remoteId: "+remoteId);
	}
	//debugPrint(
	this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_NOTICE, "bind: (local: "+localId+", remote: "+remoteId+")");
	
	
	if (this.remoteIdMap.has(remoteId))
	{
		var existingLocalIdBinding = this.remoteIdMap.get(remoteId);
		if (existingLocalIdBinding !== localId)
		{
			//we just tried to rebind to a different local id. this is almost certainly an error!
			throw new Error("remoteId already bound to another localId! remoteId: "+remoteId+", tryingToBindToLocalId: "+localId+", butAlreadyBoundToLocalId: "+existingLocalIdBinding);
		}
		else
		{
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "Warning: rebinding a localId to the same remoteId! localId: "+localId+", remoteId: "+remoteId);
		}
		
		//Q: should we try and warn if binding a localId to more than once remoteId...??YES, probably!
	}
	//if (this.localIDMap.has(localId))
	if (this.localIdMap.has(localId))
	{
		var existingRemoteIdBinding = this.localIdMap.get(localId);
		if (existingRemoteIdBinding !== remoteId)
		{
			throw new Error("localId already bound to another remoteId! localId: "+localId+", tryingToBindToRemoteId: "+remoteId+", existingRemoteIdBinding: "+existingRemoteIdBinding);
		}
		else
		{
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "Warning: rebinding a localId to the same remoteId! localId: "+localId+", remoteId: "+remoteId);
		}
	}
	//what of bad remoteIds...?
	/*
	if (!this.remoteIdMap.has(remoteId))
	{
		this.remoteIdList.push(remoteId);
	}
	*/
	this.remoteIdMap.put(remoteId, localId);
	this.localIdMap.put(localId, remoteId);
};


atb.datastore.Storage.prototype.getLocalIdList = function()
{
	//todo: maybe copy me...?
	return this.localIdList_;
};

atb.datastore.Storage.prototype.getRemoteIdList = function()
{
	return this.remoteIdList;
};

atb.datastore.Storage.prototype.allocateLocalId = function()
{//^LOLvetternamkol!
	return this.createObject(null);
};
	//this.dss.createObject(null);
	//var localId = this.dss.allocateLocalId();
////////////////// Private Methods: //////////////////////////////

/**
 * @private
**/
atb.datastore.Storage.prototype.generateNextLocalId_ = function()
{
	var ret = this.localIdCounter_;
	this.localIdCounter_ += 1;
	
	
	this.localIdList_.push(ret);
	
	return ret;
};

atb.datastore.Storage.prototype.isValidLocalId_ = function(localId)
{
	//TODO: ?=check that the id is also of a valid type, etc...?
	
	var minLocalIdValue = 0;
	return ((localId >= minLocalIdValue) && (localId < this.localIdCounter_));
};

///////////////////Member Fields: ////////////////////////////////

/**
 * a counter, incremented once per local id. Hopefully it'll never overflow in the course of a single user session.
 * @private
**/
atb.datastore.Storage.prototype.localIdCounter_ = 0;

/**
 * a mapping from remoteIds to localIds. Note that the localIds MIGHT not yet be bound to a value.
 * @private
**/
atb.datastore.Storage.prototype.remoteIdMap = null;//remoteIdMap = new atb.util.Map();

/**
 * a reverse mapping from localIds to remoteIds.
 * @private
**/
atb.datastore.Storage.prototype.localIdMap = null;//new atb.util.Map();

/**
 * a mapping from localIds to objects.
 * @private
**/
atb.datastore.Storage.prototype.objectsMap = null;//new atb.util.Map();

/**
 * a list of all the localIds, to allow us to return that list quickly.
 * @private
**/
atb.datastore.Storage.prototype.localIdList_ = null;//[];


atb.datastore.Storage.prototype.remoteIdList = null;

////////////Function aliases:///////////////////////
atb.datastore.Storage.prototype.getRemoteId = atb.datastore.Storage.prototype.toRemoteId;

//Q: do we want to do anything special w/. ids to ensure remote and local ids can't get mixed up without us throwing errors...?
//atb.DataStoreStorage.prototype.localIdPrefix
//Q: what of singletons...lol...?!?!...
//lolidguiedlol..>>?userisessionguid...?
//lolpromises...?
