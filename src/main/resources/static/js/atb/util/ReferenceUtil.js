//ReferenceUtil
goog.provide("atb.util.ReferenceUtil");

atb.util.ReferenceUtil.isUndefined = function(testValue)
{
	var undef; //purposefully undefined
	return (testValue === undef);
};

atb.util.ReferenceUtil.isBadReferenceValue = function(testValue)
{
	var undef; //purposefully undefined
	//var tempArray = [];
	return ((testValue === null) || (testValue === undef))// || (testValue == missingArrayElement));
	//^there must be a better way...
};

atb.util.ReferenceUtil.applyDefaultValue = function(value, defaultValue)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(value))//or maybe something simpler...?
	{
		return defaultValue;
	}
	return value;
};

atb.util.ReferenceUtil.copySimpleObject = function(srcObject, opt_bCopyOwnPropsOnly, opt_dst, opt_copyElementFunc, opt_bCopyPrototype)
{
	opt_bCopyOwnPropsOnly = atb.util.ReferenceUtil.applyDefaultValue(opt_bCopyOwnPropsOnly, true);
	opt_bCopyOwnPropsOnly = !!opt_bCopyOwnPropsOnly;
	
	var bCopyPrototype = atb.util.LangUtil.forceBoolean(opt_bCopyPrototype, false);
	
	var copyElementFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_copyElementFunc, null);
	
	//var ret = atb.util.ReferenceUtil.applyDefaultValue(opt_dst, {});
	var ret = atb.util.ReferenceUtil.applyDefaultValue(opt_dst, null);
	
	if (ret == null)
	{
		if (bCopyPrototype)
		{
			var hack = function(){};
			
			//Note that this might not make sense to do in some cases:
			hack.prototype = new srcObject.constructor();//HACK
			ret = new hack();
		}
		else
		{
			ret=  {};
		}
	}
	
	if (!atb.util.ReferenceUtil.isBadReferenceValue(srcObject))
	{
		for (var k in srcObject)
		{
			if ((!opt_bCopyOwnPropsOnly) || (srcObject.hasOwnProperty(k)))
			{
				var v = srcObject[k];
				if (copyElementFunc !== null)
				{
					v = copyElementFunc(v);
				}
				ret[k] = v;
			}
		}
	}
	
	/*if (bActuallyCopyPrototype)
	{
		//alert("copyproto!");
		ret.prototype = srcObject.prototype;
	}*/
	return ret;
};

//atb.util.ReferenceUtil.mergeOptions = function(dst, primarySource, secondarySource, opt_bCopyOwnPropsOnly)
atb.util.ReferenceUtil.mergeOptions = function(primarySource, secondarySource, opt_dst, opt_bCopyOwnPropsOnly)
{
	opt_bCopyOwnPropsOnly = atb.util.ReferenceUtil.applyDefaultValue(opt_bCopyOwnPropsOnly, true);
	opt_bCopyOwnPropsOnly = !!opt_bCopyOwnPropsOnly;
	
	
	var dst = atb.util.ReferenceUtil.applyDefaultValue(opt_dst, {});
	/*if (atb.util.ReferenceUtil.isBadReferenceValue(dst))
	{
		dst = {};
	}
	else */
	
	primarySource = atb.util.ReferenceUtil.applyDefaultValue(primarySource, null);
	secondarySource = atb.util.ReferenceUtil.applyDefaultValue(secondarySource, null);
	
	if ((dst === primarySource) || (dst === secondarySource))
	{
		if ((dst === primarySource)&&(dst === secondarySource))
		{
			return dst; //no changes warranted.
		}
		
		//copy these to preserve semantics:
		if (dst === primarySource)
		{
			primarySource = atb.util.ReferenceUtil.copySimpleObject(primarySource);
		}
		else if (dst === secondarySource)
		{//^a more sane distribution, since dst==primary==secondary is insane anyways, so leaving dst unchanged kinda makes sense there...!
			secondarySource = atb.util.ReferenceUtil.copySimpleObject(secondarySource);
		}
		
		/*
		//Note: NOT ELSE IF, in case secondarySource was === to primarySource before the previous if!
		if (dst === secondarySource)
		{
		}
		*/
	}
	
	
	//copy secondary first, so that primary will simply overwrite us, if applicable...!
	if ((primarySource !== secondarySource) && (secondarySource !== null))
	{
		dst = atb.util.ReferenceUtil.copySimpleObject(secondarySource, opt_bCopyOwnPropsOnly, dst);
	}
	
	if (primarySource !== null)
	{
		dst = atb.util.ReferenceUtil.copySimpleObject(primarySource, opt_bCopyOwnPropsOnly, dst);
		/*for(var k in primarySource)
		{
			
		}*/
	}
	
	//^lol..probably some extra cases around there...!?
	return dst;
};

//atb.util.ReferenceUtil.isNotInstanceOfClass = function(testValue, classConstructorFunction)
atb.util.ReferenceUtil.isNotInstanceOfClass = function(testValue, classConstructorFunction)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(testValue))
	{
		return true;
	}
	return (!(testValue instanceof classConstructorFunction));
};

atb.util.ReferenceUtil.isInstanceOfClass = function(testValue, classConstructorFunction)
{
	return !atb.util.ReferenceUtil.isNotInstanceOfClass(testValue, classConstructorFunction);
	/*
	if (atb.util.ReferenceUtil.isBadReferenceValue(testValue))
	{
		return false;
	}
	return (testValue instanceof classConstructorFunction);
	*/
};
