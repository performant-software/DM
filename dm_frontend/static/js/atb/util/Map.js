goog.provide("atb.util.Map");


/**
 * @fileoverview a nice map data structure interface.
 * (I got sick of worrying about the contracts of associative arrays, etc)
 * TODO: considder a better backing implementation (possibly in google closure...?)
 *
 * @author John O'Meara
**/
goog.require("atb.util.ReferenceUtil");

atb.util.Map = function()
{
	this.data = {};
	this.keys = [];
};

atb.util.Map.prototype.get = function(key)
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

atb.util.Map.prototype.put = function(key, value)
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

atb.util.Map.prototype.has = function(key)
{
	var obj = this.getImpl(key, atb.util.Map.UNIQUE_VALUE);
	return (obj !== atb.util.Map.UNIQUE_VALUE);
};

atb.util.Map.prototype.remove = function(key)
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

atb.util.Map.prototype.size = function()
{
	return this.count;
};

atb.util.Map.prototype.isEmpty = function()
{
	return (this.size() < 1);
};
/*
atb.util.Map.prototype.getKeys = function()
{
	//or do we clone it...?
	return this.keys;
};
*/
//////////////////////////////////

atb.util.Map.prototype.removeImpl = function(key)
{
	this.preMutate();
	var removed = this.data[key];
	this.data[key] = atb.util.Map.UNIQUE_VALUE;
	delete this.data[key];
};


atb.util.Map.prototype.getImpl = function(key, defaultValue)
{
	var obj = this.data[key];
	if (atb.util.ReferenceUtil.isUndefined(obj))
	{
		return defaultValue;
	}
	return obj;
};

atb.util.Map.prototype.putImpl = function(key, value)
{
	this.preMutate();
	if (value === atb.util.Map.UNIQUE_VALUE)
	{
		throw new Error("atb.util.Map::putImpl(): value === atb.util.Map.UNIQUE_VALUE");
	}
	this.data[key] = value;
};

atb.util.Map.prototype.createImpl = function(key, index)
{
	//nothing to do...
};

atb.util.Map.prototype.preMutate = function()
{//this will shine for lazy subclasses!
};

//atb.util.Map.UNIQUE_VALUE

//Aliases:
atb.util.Map.prototype.getCount = atb.util.Map.prototype.size;
atb.util.Map.prototype.containsKey = atb.util.Map.prototype.has;
////atb.util.Map.prototype.getCount = atb.util.Map.prototype.size;

//Fields:
atb.util.Map.prototype.data = null;//{};
atb.util.Map.prototype.count = 0;
atb.util.Map.prototype.keys = null;//[];

//atb.util.Map.prototype.putImpl
//lolids...?
//atb.util.Map.VALUE_NULL = {};
//atb.util.Map.prototype.impl = {};

atb.util.Map.UNIQUE_VALUE = { "atb.util.Map.UNIQUE_VALUE": "uniqueness for all!"};
//atb.util.Map.UNIQUE_VALUE