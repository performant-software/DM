//goog.provide("atb.datastore.LocalReference");

goog.provide("atb.datastore.ResourceReference");

goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.LangUtil");
//goog.require("atb.DataStore");

//atb.datastore.ResourceReference = function(set_promiseKey, set_ds, localId, opt_remoteId)
//atb.datastore.ResourceReference = function(set_secret, set_ds, localId, opt_remoteId)
atb.datastore.ResourceReference = function(set_secret, set_ds, localId, opt_remoteId)
{
	//this.promiseKey = set_
	this.secret_ = atb.util.ReferenceUtil.applyDefaultValue(set_secret, null);
	
	if (atb.util.ReferenceUtil.isNotInstanceOfClass(set_ds, atb.DataStore))
	{
		throw new Error("atb.datastore.ResourceReference::ResourceReference(): bad set_ds!");
	}
	
	this.dataStore = set_ds;
	this.localId = localId;
	//this.remoteId = atb.util.ReferenceUtil.applyDefaultValue(opt_remoteId);//lol!
	this.remoteId = atb.util.ReferenceUtil.applyDefaultValue(opt_remoteId, null);
};

/**
 * Non-private, but only a secret owner can invoke. Therefore, only the dataobject owning me can invoke me:
 * 
**/
atb.datastore.ResourceReference.prototype.notifyRemoteIdModified = function(prove_shared_secret, set_remoteId)
{
	prove_shared_secret = atb.util.ReferenceUtil.applyDefaultValue(prove_shared_secret,null);
	if (prove_shared_secret !== this.secret_)
	{
		throw new Error("atb.datastore.ResourceReference.prototype.notifyRemoteIdModified(): incorrect prove_shared_secret!");
	}
	
	//strangely, this means that a later call to resolveId after the id has been resolved, before the event fires, might finish before a queued call to it...
	this.remoteId = set_remoteId;//hack
};


atb.datastore.ResourceReference.prototype.hasRemoteId = function()
{
	return (this.remoteId !== null);
};

atb.datastore.ResourceReference.prototype.getLocalId = function()
{
	return this.localId;
};

/*atb.datastore.ResourceReference.prototype.getRemoteId = function()
{
	if (!this.
	return this.remoteId;
};
*/

atb.datastore.ResourceReference.prototype.resolveRemoteId = function(opt_callAfter)
{
	//if (this.remoteId == null)
	var callAfter = atb.util.ReferenceUtil.applyDefaultValue(opt_callAfter, null);
	
	if (this.hasRemoteId())
	{
		//callAfter(this.removeId);//lol!
		callAfter(this.remoteId);
	}
	else
	{
		var self = this;
		this.dataStore.generateRemoteIds([this.getLocalId()], function(objects)
		{
			var remoteId = objects[0].getRemoteId();
			self.remoteId = remoteId;
			opt_callAfter(remoteId);
		});
	}
};

//atb.datastore.ResourceReference.prototype.getRemoteId_ = function()
atb.datastore.ResourceReference.prototype.getRemoteId_assertExists_ = function()
{
	if (!this.hasRemoteId())
	{
		throw new Error("resourceReference::getRemoteId_assertExists_(): assertion was false. localId:"+this.getLocalId());
	}
	return this.remoteId;
	//getRemoteId_assertExists_
	//if (this.remoteId 
};
/*
atb.datastore.ResourceReference.prototype.getDataObject
{

};*/
//atb.datastore.ResourceReference.prototype.retrieveDataObject = function(callback)
//atb.datastore.ResourceReference.prototype.retrieveDataObject = function(opt_callback)
atb.datastore.ResourceReference.prototype.resolveDataObject = function(opt_callback)
{
	var callback = atb.util.ReferenceUtil.applyDefaultValue(opt_callback, null);
	var localId = this.getLocalId();
	//var dataObj = this.dataStore.getDataObject(localId);
	if (this.dataStore.isIncompleteObject(localId))
	{
		//loltimetoulol..?
		
		//loltimeoutevent for resovlve...retry...?
		//atb.DataStore.prototype.resolveObjects// = function(remoteIdList, taskFunction)
		//if (!this.hasRemoteId())
		//{
		//}
		this.resolveRemoteId(function(remoteId)
		{
			this.dataStore.resolveObjects([remoteId],function(dataEvent)
			{
				if (dataEvent.isCompletionEvent())
				{
					var dataObj = dataEvent.getDataObjects()[0];
					//assert: dataObj is now valid...!?
					if (callback !== null)
					{
						callback(dataObj);
					}
				}
			});
		});
	}
	else
	{
		callback(this.dataStore.getDataObject(localId));
	}
	//is(
	//getDataObject
	//if 
};

//lolblockionwratlol..?modifylsfinaloparallelasynctask..?
//atb.datastore.ResourceReference.prototype.resolveDataObject
