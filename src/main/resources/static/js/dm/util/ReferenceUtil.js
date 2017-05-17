//ReferenceUtil
goog.provide("dm.util.ReferenceUtil");

dm.util.ReferenceUtil.isUndefined = function(testValue)
{
	var undef; //purposefully undefined
	return (testValue === undef);
};

dm.util.ReferenceUtil.isBadReferenceValue = function(testValue)
{
	var undef; //purposefully undefined
	//var tempArray = [];
	return ((testValue === null) || (testValue === undef))// || (testValue == missingArrayElement));
	//^there must be a better way...
};

dm.util.ReferenceUtil.applyDefaultValue = function(value, defaultValue)
{
	if (dm.util.ReferenceUtil.isBadReferenceValue(value))//or maybe something simpler...?
	{
		return defaultValue;
	}
	return value;
};

dm.util.ReferenceUtil.copySimpleObject = function(srcObject, opt_bCopyOwnPropsOnly, opt_dst, opt_copyElementFunc, opt_bCopyPrototype)
{
	opt_bCopyOwnPropsOnly = dm.util.ReferenceUtil.applyDefaultValue(opt_bCopyOwnPropsOnly, true);
	opt_bCopyOwnPropsOnly = !!opt_bCopyOwnPropsOnly;
	
	var bCopyPrototype = dm.util.LangUtil.forceBoolean(opt_bCopyPrototype, false);
	
	var copyElementFunc = dm.util.ReferenceUtil.applyDefaultValue(opt_copyElementFunc, null);
	
	//var ret = dm.util.ReferenceUtil.applyDefaultValue(opt_dst, {});
	var ret = dm.util.ReferenceUtil.applyDefaultValue(opt_dst, null);
	
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
	
	if (!dm.util.ReferenceUtil.isBadReferenceValue(srcObject))
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

//dm.util.ReferenceUtil.mergeOptions = function(dst, primarySource, secondarySource, opt_bCopyOwnPropsOnly)
dm.util.ReferenceUtil.mergeOptions = function(primarySource, secondarySource, opt_dst, opt_bCopyOwnPropsOnly)
{
	opt_bCopyOwnPropsOnly = dm.util.ReferenceUtil.applyDefaultValue(opt_bCopyOwnPropsOnly, true);
	opt_bCopyOwnPropsOnly = !!opt_bCopyOwnPropsOnly;
	
	
	var dst = dm.util.ReferenceUtil.applyDefaultValue(opt_dst, {});
	/*if (dm.util.ReferenceUtil.isBadReferenceValue(dst))
	{
		dst = {};
	}
	else */
	
	primarySource = dm.util.ReferenceUtil.applyDefaultValue(primarySource, null);
	secondarySource = dm.util.ReferenceUtil.applyDefaultValue(secondarySource, null);
	
	if ((dst === primarySource) || (dst === secondarySource))
	{
		if ((dst === primarySource)&&(dst === secondarySource))
		{
			return dst; //no changes warranted.
		}
		
		//copy these to preserve semantics:
		if (dst === primarySource)
		{
			primarySource = dm.util.ReferenceUtil.copySimpleObject(primarySource);
		}
		else if (dst === secondarySource)
		{//^a more sane distribution, since dst==primary==secondary is insane anyways, so leaving dst unchanged kinda makes sense there...!
			secondarySource = dm.util.ReferenceUtil.copySimpleObject(secondarySource);
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
		dst = dm.util.ReferenceUtil.copySimpleObject(secondarySource, opt_bCopyOwnPropsOnly, dst);
	}
	
	if (primarySource !== null)
	{
		dst = dm.util.ReferenceUtil.copySimpleObject(primarySource, opt_bCopyOwnPropsOnly, dst);
		/*for(var k in primarySource)
		{
			
		}*/
	}
	
	//^lol..probably some extra cases around there...!?
	return dst;
};

//dm.util.ReferenceUtil.isNotInstanceOfClass = function(testValue, classConstructorFunction)
dm.util.ReferenceUtil.isNotInstanceOfClass = function(testValue, classConstructorFunction)
{
	if (dm.util.ReferenceUtil.isBadReferenceValue(testValue))
	{
		return true;
	}
	return (!(testValue instanceof classConstructorFunction));
};

dm.util.ReferenceUtil.isInstanceOfClass = function(testValue, classConstructorFunction)
{
	return !dm.util.ReferenceUtil.isNotInstanceOfClass(testValue, classConstructorFunction);
	/*
	if (dm.util.ReferenceUtil.isBadReferenceValue(testValue))
	{
		return false;
	}
	return (testValue instanceof classConstructorFunction);
	*/
};
