goog.provide("dm.util.ObjectMap");

/**
 * @fileOverview a wrapper to treat an object like a map.
 *
 * @author John O'Meara
**/

goog.require("dm.util.Map");


/**
 * Creates a new map wrapping the specified object.
 *
 * @param {object} wrapObj The object to wrap as a map.
 * 
 * @public
 * @constructor
**/
dm.util.ObjectMap = function(wrapObj)//, opt)
{
	dm.util.Map.call(this);
	this.data = wrapObj; //overwrite data in superclass
	this.bHasKeys = false;//we're gonna be lazy and not generate them for now. we can still "get" and "has" tho, which is of primary interest to most uses of this
	//this.bSizeUnknown
	this.bEmptyUnknown = true;
	
	//this.count = 
}

goog.inherits(dm.util.ObjectMap, dm.util.Map);

dm.util.ObjectMap.prototype.get = function(key, opt_defaultValue)
{
	var ret = dm.util.Map.prototype.get.call(this, key);
	if (ret === null)
	{
		opt_defaultValue = dm.util.ReferenceUtil.applyDefaultValue(opt_defaultValue, null);//lolhack!
		return opt_defaultValue;
	}
	return ret;
};

dm.util.ObjectMap.prototype._genKeysOnce = function()
{
	//avoid this initially by being lazy
	if (!this.bHasKeys)
	{
		this.count= this.keys.length;//hack - reset our count 
		this.bHasKeys = true;
		var bWasEmpty = (this.keys.length < 1);
		for(var k in this.data)
		{
			if ((bWasEmpty)||(!this.has(k)))
			{
				this.keys.push(k);
				this.count++;
			}
			//this.count++;
		}
		this.bEmptyUnknown = false;
	}
};

dm.util.ObjectMap.prototype.preMutate = function()
{
	//stop being lazy:
	if (!this.bHasKeys)
	{
		this._genKeysOnce();
	}
};

dm.util.ObjectMap.prototype.isEmpty = function()
{
	if (this.bEmptyUnknown)
	{
		for(var k in wrapObj)
		{
			//if we have at least one item, we're non-empty:
			this.count = 1;
			break;//thats all we need to know for now!
		}
		this.bEmptyUnknown = false;
	}
	return (this.count > 0);//don't call size since that requires us to stop being lazy!
};

dm.util.ObjectMap.prototype.size = function()
{
	this.preMutate();
	return this.count;
};

dm.util.ObjectMap.prototype.getKeys = function()
{
	this.preMutate();
	//fail://return this.key;
	return this.keys;
};