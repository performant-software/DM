goog.provide("atb.temp.AnnotationRelation");

/**
 *@note(tandres) This file is only used by MarkerEditorAnnotationHack.js and should probably be deprecated
 */

atb.temp.AnnotationRelation = function()
{
	this.body = null;
	this.targets = [];
};

atb.temp.AnnotationRelation.prototype.setAnnotationBody = function(setId)
{
	this.body = setId;
};

atb.temp.AnnotationRelation.prototype.addAnnotationTarget = function(resourceId)
{
	this.removeAnnotationTarget(resourceId);//HACK to prevent duplicates
	this.targets.push(this.resourceId);
	//this.copyId(resourceId));
};
atb.temp.AnnotationRelation.prototype.addAnnotationTargets = function(resourceIds)
{
	for(var i=0, l = resourceIds.length; i<l; i++)
	{
		this.addAnnotationTarget(resourceIds[i]);
	}
};

atb.temp.AnnotationRelation.prototype.removeAnnotationTarget = function(resourceId)
{
	var newArray = [];
	for(var i=0, l = this.targets.length; i<l; i++)
	{
		var testItemId = this.targets[i];
		//if (testItemId !== resourceId)//compare them - does this want to be a function???
		if (this.compareIds(testItemId, resourceId))
		{
			//omit item
		}
		else
		{
			newArray.push(testItemId);
		}
	}
	this.targets = newArray;//use the modified copy.
};

atb.temp.AnnotationRelation.prototype.getAnnotationTargets = function()
{
	//hack: lets make a defensive copy:
	var ret = [];
	for(var i=0, l = this.targets.length; i<l; i++)
	{
		ret.push(this.copyId(this.targets[i]));
	}
	return ret;
};

atb.temp.AnnotationRelation.prototype.compareIds=function(id1, id2)
{
	return (id1==id2);
};

atb.temp.AnnotationRelation.prototype.copyId=function(id)
{
	return id;
};

atb.temp.AnnotationRelation.prototype.getAnnotationBody = function()
{
	return this.body;
};

atb.temp.AnnotationRelation.prototype.copy = function()
{
	var ret= new atb.temp.AnnotationRelation();
	ret.setAnnotationBody(this.copyId(this.getAnnotationBody()));
	ret.addAnnotationTargets(this.getAnnotationTargets());
	return ret;
};
