goog.provide("atb.viewer.MarkerEditorAnnotationHack");
/*
//example output
{
    "id": uid requested from web service,
    "type": "anno",
    "anno": {
        "id": same uid as above,
        "bodies": [body id],
        "targets": [target ids associated with body id in dictionary]
    }
}
*/
goog.require("atb.temp.AnnotationRelation");
goog.require("atb.util.ReferenceUtil");

atb.viewer.MarkerEditorAnnotationHack = function()
{
	/*
	this.bodyItems = [];
	this.bodyMap = {};
	this.numIDsNeeded = 0;
	*/
	this.clearAllItems();//lolhack!
};

atb.viewer.MarkerEditorAnnotationHack.prototype.putTarget=function(bodyId, targetId)
{
	var bodyObj = this.createBody(bodyId);
	bodyObj.addAnnotationTarget(targetId);
};

atb.viewer.MarkerEditorAnnotationHack.prototype.createBody=function(bodyId)
{
	var ret = this.getBodyObject_(bodyId, true);
	return ret;
};

atb.viewer.MarkerEditorAnnotationHack.prototype.getBodyObject_=function(bodyId, bAutoCreate)
{
	var raw = this.bodyMap[bodyId];
	raw = atb.util.ReferenceUtil.applyDefaultValue(raw, null);
	if (raw===null)
	{
		if (bAutoCreate)
		{
			raw = new atb.temp.AnnotationRelation();
			this.numIDsNeeded++;
			raw.setAnnotationBody(bodyId);
			this.bodyItems.push(bodyId);
			this.bodyMap[bodyId] = raw;
		}
	}
	return raw;
};

atb.viewer.MarkerEditorAnnotationHack.prototype.composeSaveObject = function(usingServerIds)
{
	var ret = [];
	//var bFailed=false;
	////debugPrint("bodyItems.length = "+bodyItems.length+"; usingServerIds.length= "+usingServerIds.length);
	debugPrint("bodyItems.length = "+this.bodyItems.length+"; usingServerIds.length= "+usingServerIds.length);
	////if (this.bodyItems.length < usingServerIds.length)
	if (usingServerIds.length < this.bodyItems.length)
	{
		//	//throw new Error("too few ids! -- "+"bodyItems.length = "+bodyItems.length+"; usingServerIds.length= "+usingServerIds.length);
		////throw new Error("too few ids! -- "+"bodyItems.length = "+this.bodyItems.length+"; usingServerIds.length= "+usingServerIds.length);
		throw new Error("too few ids! -- "+"bodyItems.length = "+this.bodyItems.length+"; usingServerIds.length= "+usingServerIds.length);
	}
	for(var i=0, l=this.bodyItems.length; i<l; i++)
	{
		var bodyId = this.bodyItems[i];
		var item = this.getBodyObject_(bodyId, false);
		if (item === null)
		{
			debugPrint("missing item for bodyId: '"+bodyId+"'...!");//hack...lol!
			continue;
		}
		if (usingServerIds.length < 1)
		{
			debugPrint("too few serverids!");
			//bFailed=true;
			throw new Error("too few server ids!");
			break;
		}
		var usingServerId = usingServerIds.pop();
		var entry = this.generateOutputEntry(usingServerId, bodyId, item);
		ret.push(entry);
	}
	return ret;
	
};
atb.viewer.MarkerEditorAnnotationHack.prototype.generateOutputEntry = function(usingServerId, bodyId, forRelation)
{
	var targetIds = forRelation.getAnnotationTargets();
	var ret = {
		"id": usingServerId,	 		//uid requested from web service,
		"type": "anno",
		"anno": {
			"id": usingServerId,		//same uid as above,
			"bodies": [bodyId],			//body id],
			"targets": [ targetIds ]	//[target ids associated with body id in dictionary]
		}
	};
	return ret;
};
atb.viewer.MarkerEditorAnnotationHack.prototype.clearAllItems = function()
{
	this.bodyItems = [];
	this.bodyMap = {};
	this.numIDsNeeded = 0;
};

atb.viewer.MarkerEditorAnnotationHack.prototype.getNumServerIDsNeeded = function()
{
	return this.numIDsNeeded;
};
