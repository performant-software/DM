goog.provide("dm.util.Set");

goog.require("dm.util.ReferenceUtil");
dm.util.Set = function()
{
	this.data = {};
	this.useValue = "VALUE";
	this.count = 0;
};

dm.util.Set.prototype.add = function(item)
{
	var ret = false;
	if (!this.contains(item))
	{
		this.count++;
		ret = true;
	}
	this.data[item] = this.useValue;
	return ret;
};

dm.util.Set.prototype.contains = function(item)
{
	var raw = this.data[item];
	raw = dm.util.ReferenceUtil.applyDefaultValue(raw, null);
	return (raw === this.useValue);
};

//alias:
dm.util.Set.prototype.has = dm.util.Set.prototype.contains;//HACK



dm.util.Set.prototype.remove = function(item)
{
	if (this.contains(item))
	{
		this.count--;
		delete this.data[item];
		return true;
	}
	else
	{
		return false;
	}
};

dm.util.Set.prototype.size = function()
{
	return this.count;
	//return this.data.length;
};

dm.util.Set.prototype.isEmpty = function()
{
	return (this.size()<1);
};

dm.util.Set.prototype.addAll = function(items)//array
{
	for(var i=0, l=items.length; i<l; i++)
	{
		//this.addItem(item);
		this.add(items[i]);//item);
	}
};

dm.util.Set.prototype.removeAll = function(items)
{
	var found = [];
	for(var i=0, l=items.length; i<l; i++)
	{
		//this.addItem(item);
		var item = items[i];
		if (this.remove(item))
		{
			found.push(item);
		}
	}
	return found;
};

dm.util.Set.prototype.intersectionWithArray = function(items)
{
	var found = [];
	for(var i=0, l=items.length; i<l; i++)
	{
		var item = items[i];
		if (this.contains(item))
		{
			found.push(item);
		}
	}
	return found;
};

dm.util.Set.prototype.toString = function()//nl)
{//^HACK
	var nl = "<br>\n";
	var ret = "";
	for(var k in this.data)
	{
		//var v;
		//v=this.data[k];
		ret += ""+k+nl;//lol
		//+": "+v+nl;//"<br/>\r\n";
	}
	return ret;
};

dm.util.Set.prototype.toArrayCopyUnordered = function()
{
	var ret = [];
	for(var k in this.data)
	{
		ret.push(k);
	}
	return ret;
};