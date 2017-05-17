goog.provide("dm.util.Map");


/**
 * @fileoverview a nice map data structure interface.
 * (I got sick of worrying about the contracts of associative arrays, etc)
 * TODO: considder a better backing implementation (possibly in google closure...?)
 *
 * @author John O'Meara
**/
goog.require("dm.util.ReferenceUtil");

dm.util.Map = function()
{
	this.data = {};
	this.keys = [];
};

dm.util.Map.prototype.get = function(key)
{
	if (!this.has(key))
	{
		return null;
	}
	else
	{
		return this.getImpl(key);
	}
};

dm.util.Map.prototype.put = function(key, value)
{
	this.preMutate();//put herelol!
	if (!this.has(key))
	{
		this.count++;
		var index = this.keys.length;
		this.keys.push(value);
		this.createImpl(key, index);
		/*this.putImpl(key, {
			value: value,
			index: index
		});*/
		//this.putImpl(key, value);//, index);
	}
	else
	{
	
		//this.getImpl
	}
	this.putImpl(key, value);//, index);
};

dm.util.Map.prototype.has = function(key)
{
	var obj = this.getImpl(key, dm.util.Map.UNIQUE_VALUE);
	return (obj !== dm.util.Map.UNIQUE_VALUE);
};

dm.util.Map.prototype.remove = function(key)
{
	this.preMutate();
	if (!this.has(key))
	{
		return false;
	}
	else
	{
		this.count--;
		this.removeImpl(key);
		var newKeys = [];
		//or todo?=cache index...?
		for(var i=0, l=this.keys.length; i<l; i++)
		{
			var atKey =this.keys[i];
			if (atKey !== key)
			{
				newKeys.push(atKey);
			}
		}
		this.keys=newKeys;
	}
};

dm.util.Map.prototype.size = function()
{
	return this.count;
};

dm.util.Map.prototype.isEmpty = function()
{
	return (this.size() < 1);
};
/*
dm.util.Map.prototype.getKeys = function()
{
	//or do we clone it...?
	return this.keys;
};
*/
//////////////////////////////////

dm.util.Map.prototype.removeImpl = function(key)
{
	this.preMutate();
	var removed = this.data[key];
	this.data[key] = dm.util.Map.UNIQUE_VALUE;
	delete this.data[key];
};


dm.util.Map.prototype.getImpl = function(key, defaultValue)
{
	var obj = this.data[key];
	if (dm.util.ReferenceUtil.isUndefined(obj))
	{
		return defaultValue;
	}
	return obj;
};

dm.util.Map.prototype.putImpl = function(key, value)
{
	this.preMutate();
	if (value === dm.util.Map.UNIQUE_VALUE)
	{
		throw new Error("dm.util.Map::putImpl(): value === dm.util.Map.UNIQUE_VALUE");
	}
	this.data[key] = value;
};

dm.util.Map.prototype.createImpl = function(key, index)
{
	//nothing to do...
};

dm.util.Map.prototype.preMutate = function()
{//this will shine for lazy subclasses!
};

//dm.util.Map.UNIQUE_VALUE

//Aliases:
dm.util.Map.prototype.getCount = dm.util.Map.prototype.size;
dm.util.Map.prototype.containsKey = dm.util.Map.prototype.has;
////dm.util.Map.prototype.getCount = dm.util.Map.prototype.size;

//Fields:
dm.util.Map.prototype.data = null;//{};
dm.util.Map.prototype.count = 0;
dm.util.Map.prototype.keys = null;//[];

//dm.util.Map.prototype.putImpl
//lolids...?
//dm.util.Map.VALUE_NULL = {};
//dm.util.Map.prototype.impl = {};

dm.util.Map.UNIQUE_VALUE = { "dm.util.Map.UNIQUE_VALUE": "uniqueness for all!"};
//dm.util.Map.UNIQUE_VALUE