goog.provide("atb.datastore.DataObject");

/**
 * @fileOverview Represnts a single data object.
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");
goog.require("atb.debug.DebugFilter");
//goog.require("atb.DataStore");
//goog.require("atb.datastore.ResourceReference");

/**
 * creates a new Data Object.
 *
 * @param {atb.DataStore} set_ds The datastore owning us, which also just created us.
 * @param {localId} set_localId Our localId.
 * @param {config} config Mostly some metadata-state info. (probably poorly named...lol!)
 * @param {atb.debug.DebugFilter =} opt_setDebugFilter An optional debug filter to control our debug output.
 * 
 * @public
 * @constructor
**/
atb.datastore.DataObject = function(set_ds, set_localId, config, opt_setDebugFilter)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(set_ds) || (!(set_ds instanceof atb.DataStore)))
	{
		throw new Error("DataObject::DataObject() bad set_ds! set_localId="+set_localId+"; config="+config);
	}
	
	if (
		atb.util.ReferenceUtil.isBadReferenceValue(set_localId) ||
		atb.util.ReferenceUtil.isBadReferenceValue(config)
	){
		throw new Error("DataObject::DataObject() bad set_localId and/or config! set_localId="+set_localId+"; config="+config);
	}
	
	this.ds = set_ds;
	
	this.debugFilter = atb.util.ReferenceUtil.applyDefaultValue(opt_setDebugFilter, null);
	if (this.debugFilter === null)
	{
		this.debugFilter = new atb.debug.DebugFilter();
	}
	
	/*
	config: {
		lastModified: <datetime>,
		content: <(opt - dataobject is "incomplete" if omitted or null:)opaque data, but probably not null/undefined for sane values>,
		contentType: <string(maybe?/enum/constants...?)>,
		remoteId: <(opt)remoteId>
	};
	*/
	this.bDirty = false;
	this.dirtyCounter = 0;
	
	this.lastModified = config.lastModified;
	this.content = atb.util.ReferenceUtil.applyDefaultValue(config.content, null);
	this.contentType = config.contentType;
	this.remoteId = atb.util.ReferenceUtil.applyDefaultValue(config.remoteId, null);
	this.localId = set_localId;
	
	this.promise = {};
	this.resourceReference = new atb.datastore.ResourceReference(this.promise, this.ds, this.localId, this.remoteId);
};



/**
 * Checks if we're holding an incomplete value.
 * Incomplete values are cause by either being still in the process of retrieving the content from the server,
 *  or having created an object locally without giving it a value.
 *
 * @return {boolean} True, iff we're an incomplete object (holding a null content value atm}
 * @public
**/
atb.datastore.DataObject.prototype.isIncompleteObject = function()
{
	return (this.content === null);
};
atb.datastore.DataObject.prototype.isIncomplete = atb.datastore.DataObject.prototype.isIncompleteObject;


/**
 * A private method which forwards to the datastore, and tries to get the current time. mainly used to allow markingDirty to set the last modified time
 * (Q: do we REALLY want to do that though, i wonder...??)...
 * @private
**/
atb.datastore.DataObject.prototype.computeNow_=function()
{
	return this.ds.computeNow();//hack
};



/**
 * sets the modified-locally flag.
**/
atb.datastore.DataObject.prototype.markDirty = function()
{
	this.lastModified = this.computeNow_();
	//TODO: take into account time relative to the server...?, based on elapsed time on client side...?
	this.bDirty = true;
	this.dirtyCounter++;
};



/**
 * along with unmarkIfDirtyCounterMatches, this can be used for a simple mark and sweep cleaning of the dirty flag when committing (Assuming no overflow...lol!)
 *
 * part of some code designed to allow a mark & sweep style approach to updating the modified status of an object in the presence of an asynchronous "save" task, which could 
 * give us time to re-modify values locally...(maybe...?)
 * @return {number} the "mark" value read for this local-modification counter.
**/
atb.datastore.DataObject.prototype.readDirtyCounter = function()
{
	return this.dirtyCounter;
};



/**
 * the sweep part of our mark & sweep un-dirtying when saved technique.
 * Note: if this is not at the specified dirtyCounter value then this does nothing, as taht implies it was modified since we 
 * marked it as having sent it off (in the marked-time's state) to be recorded on the server...
 *
 * This should be invoked AFTER the server has sucessfully recieved our commit request 
 *
 * @param {number} fromDirtyCounter the "mark" value for this object for which we can say it is now clean if it hasen't been changed since then.
**/
atb.datastore.DataObject.prototype.unmarkDirtyIfDirtyCounterMatches = function(fromDirtyCounter)
{
	if (this.dirtyCounter === fromDirtyCounter)
	{
		this.bDirty=false;
	}
};



/**
 * returns true if we're listed as being locally modified (ie, "dirty").
 * @return {boolean} True, iff we've been modified locally (or created locally), without having been saved since.
 * @public
**/
atb.datastore.DataObject.prototype.wasModifiedLocally = function()
{
	//^todo: maybe find a better name for me...?
	return this.bDirty;
};



/**
 * returns a last-modified timestamp.
 * the related timestamp/etc code still needs a LOT of work and thinking, probably...!
**/
atb.datastore.DataObject.prototype.getLastModified = function()
{
	return this.lastModified;
};



/**
 * gets our raw content value. probably we might want to return a deep copy somewhere along the line to protect against modifying it directly, without marking stuff dirty by updating its value...
 * @return {?object} The content of our resource.
**/
atb.datastore.DataObject.prototype.getContent = function()
{
	return this.content;
};



/**
 * sets our raw content value. currently this is an opaque object holding our content-type-defined|specified value. might be null in some situations (notably for incomplete objects...!)
 * also marks this as dirty.
 * @param {object} set_content The new value for our content.
**/
atb.datastore.DataObject.prototype.setContent = function(set_content)
{
	this.setContentInternal(set_content);
	this.markDirty();
};

atb.datastore.DataObject.prototype.setContentInternal = function(set_content)
{
	if (set_content === null)
	{
		throw new Error("DataObject::setContent(null) invoked!");//lolhack!
	}
	this.content = set_content;
};

/**
 * returns our content type. please see {atb.datastore.ContentTypes}.
 * @return {string} The "name" or identity of our resource's 'content type'.
**/
atb.datastore.DataObject.prototype.getContentType =function()
{
	return this.contentType;
};



/**
 * returns our localId
 * @return {number} Our localId.
**/
atb.datastore.DataObject.prototype.getLocalId =function()
{
	return this.localId;
};



/**
 * returns our remoteId
 * @return {?number|string} Our remoteId. null if we don't have/haven't received one yet.
**/
atb.datastore.DataObject.prototype.getRemoteId = function()
{
	return this.remoteId;
};



/**
 * sets our remoteId. This should be done along with a .bind in the atb.datastore.Storage, probably.
 * probably not public, but rather for in-package usage by datastore & stuff...?
**/
atb.datastore.DataObject.prototype.setRemoteId = function(set_remoteId)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(set_remoteId))
	{
		throw new Error("trying to setRemoteId on a DataObject which to an invalid reference value: "+set_remoteId);
	}
	
	if (this.remoteId !== null)
	{
		if (this.remoteId != set_remoteId)
		{
			//overwriting id, so complain:
			throw new Error("trying to setRemoteId on a DataObject which already HAS a valid remoteId! current remoteId: "+this.remoteId+"; trying to assign remoteId: "+set_remoteId);
		}
		else
		{
			//same id, so only warn:
			this.debugFilter.debugMessage(atb.debug.DebugFilter.CAT_WARNING, "Warning: trying to setRemoteId on a DataObject which already HAS a valid remoteId (to the same value) current remoteId: "+this.remoteId);
		}
	}
	else
	{
		this.remoteId = set_remoteId;
		//this.resourceReference.notifyRemoteIdModified_(this.promise, this.remoteId);
		this.resourceReference.notifyRemoteIdModified(this.promise, this.remoteId);
		
		//probably
		this.markDirty();
	}
};



/**
 * returns a new 'version' of our config data, based on our current state.
 * @return {object} Something similar to the type of value we accept in our constructor's config argument, but with our current data instead. thus, also the origin of this function's somewhat odd name.
 * @protected
**/
atb.datastore.DataObject.prototype.getCurrentConfig = function()
{
	var ret = {
		lastModified: this.lastModified,//<datetime>,
		content: this.content,//<opaque data, but probably not null/undefined for sane values>,
		contentType: this.contentType,//<string(maybe?/enum/constants...?)>,
		remoteId: this.remoteId//<(opt)remoteId>
	};
	return ret;
};

atb.datastore.DataObject.prototype.getResourceReference = function()
{
	return this.resourceReference;
};


atb.datastore.DataObject.prototype.resolve = function(opt_callback)
{
	//var self = this;
	var callback = atb.util.ReferenceUtil.applyDefaultValue(opt_callback, null);
	return this.ds.resolveObjects([this.getLocalId()], function(objects)
	{
		callback(objects[0]);
	});
	//atb.DataStore.prototype.resolveObjects
	//callback = 
};


//lolincompleteobjectslol..?

//this.//lolcontent copy for modify check lol...?
//lol usagetype...???vs.data representationtypeslol..????

