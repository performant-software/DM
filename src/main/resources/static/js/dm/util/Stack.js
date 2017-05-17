goog.provide("dm.util.Stack");

dm.util.Stack = function()
{
	this.data = [];
	this.count = 0;
};

dm.util.Stack.prototype.push = function(item)
{
	this.count++;
	this.data.push(item);
};

dm.util.Stack.prototype.pop = function()
{
	if (!this.isEmpty())
	{
		this.count--;
		var ret = this.data.pop();
		return ret;
	}
	else
	{
		return null;
	}
};

dm.util.Stack.prototype.size = function()
{
	return this.count;
};

dm.util.Stack.prototype.isEmpty =function()
{
	return (this.size()<1);
};

dm.util.Stack.prototype.maxN = function(n)
{
	if (!this.hasN(n))
	{
		return this.size();
	}
	else
	{
		n = Math.floor(n);
		return n;
	}
};

dm.util.Stack.prototype.hasN = function(n)
{
	n = Math.floor(n);
	return (n <= this.size());
};

dm.util.Stack.prototype.popN = function(n)
{
	n = Math.floor(n);
	var ret = [];
	if (n > this.size())
	{
		n = this.size();
	}
	for(var i=0; i<n; i++)
	{
		ret.push(this.pop());
	}
	return ret;
};

dm.util.Stack.prototype.pushAll = function(items)
{
	for (var i=0, l=items.length; i<l; i++)
	{
		this.push(items[i]);
	}
};


dm.util.Stack.prototype.consumeOtherStack = function(otherStack)
{
	if (otherStack === this)
	{
		throw new Error("dm.util.Stack.prototype.consumeOtherStack: trying to consume myself!");
	}
	
	while(!otherStack.isEmpty())
	{
		this.push(otherStack.pop());
	}
};

dm.util.Stack.prototype.popAll = function()
{
	return this.popN(this.size());
};

dm.util.Stack.prototype.copyToArrayFIFO = function()
{//Note: "queue" style ordering, NOT stack ordering!
	var ret = [];
	////for (var i=0, l=this.data.length; i<l;; i++)
	//lol^wondersthatosul..?
	for (var i=0, l=this.data.length; i<l; i++)
	{
		//put in reverse:
		ret.push(this.data[i]);
	}
	return ret;
};
//dm.util.Stack.prototype.copyToArray = function()

//dm.util.Stack.prototype.copyToArrayInPopOrder = function()
//dm.util.Stack.prototype.copyToArrayInStackOrder = function()
//copyToArrayInStackOrder
/*
dm.util.Stack.prototype.copyToArrayInPopOrder = function()
{
	var ret = [];
	for (var i=this.data.length-1; i>-1; i--)
	{
		//put in reverse:
		ret.push(this.data[i]);
	}
	//lolnotice this:
	return ret;//LOL!
};*/