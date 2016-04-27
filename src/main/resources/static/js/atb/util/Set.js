goog.provide("atb.util.Set");

goog.require("atb.util.ReferenceUtil");
atb.util.Set = function()
{
	this.data = {};
	this.useValue = "VALUE";
	this.count = 0;
};

atb.util.Set.prototype.add = function(item)
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

atb.util.Set.prototype.contains = function(item)
{
	var raw = this.data[item];
	raw = atb.util.ReferenceUtil.applyDefaultValue(raw, null);
	return (raw === this.useValue);
};

//alias:
atb.util.Set.prototype.has = atb.util.Set.prototype.contains;//HACK



atb.util.Set.prototype.remove = function(item)
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

atb.util.Set.prototype.size = function()
{
	return this.count;
	//return this.data.length;
};

atb.util.Set.prototype.isEmpty = function()
{
	return (this.size()<1);
};

atb.util.Set.prototype.addAll = function(items)//array
{
	for(var i=0, l=items.length; i<l; i++)
	{
		//this.addItem(item);
		this.add(items[i]);//item);
	}
};

atb.util.Set.prototype.removeAll = function(items)
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

atb.util.Set.prototype.intersectionWithArray = function(items)
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

atb.util.Set.prototype.toString = function()//nl)
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

atb.util.Set.prototype.toArrayCopyUnordered = function()
{
	var ret = [];
	for(var k in this.data)
	{
		ret.push(k);
	}
	return ret;
};