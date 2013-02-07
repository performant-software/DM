goog.provide("atb.util.Stack");

atb.util.Stack = function()
{
	this.data = [];
	this.count = 0;
};

atb.util.Stack.prototype.push = function(item)
{
	this.count++;
	this.data.push(item);
};

atb.util.Stack.prototype.pop = function()
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

atb.util.Stack.prototype.size = function()
{
	return this.count;
};

atb.util.Stack.prototype.isEmpty =function()
{
	return (this.size()<1);
};

atb.util.Stack.prototype.maxN = function(n)
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

atb.util.Stack.prototype.hasN = function(n)
{
	n = Math.floor(n);
	return (n <= this.size());
};

atb.util.Stack.prototype.popN = function(n)
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

atb.util.Stack.prototype.pushAll = function(items)
{
	for (var i=0, l=items.length; i<l; i++)
	{
		this.push(items[i]);
	}
};


atb.util.Stack.prototype.consumeOtherStack = function(otherStack)
{
	if (otherStack === this)
	{
		throw new Error("atb.util.Stack.prototype.consumeOtherStack: trying to consume myself!");
	}
	
	while(!otherStack.isEmpty())
	{
		this.push(otherStack.pop());
	}
};

atb.util.Stack.prototype.popAll = function()
{
	return this.popN(this.size());
};

atb.util.Stack.prototype.copyToArrayFIFO = function()
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
//atb.util.Stack.prototype.copyToArray = function()

//atb.util.Stack.prototype.copyToArrayInPopOrder = function()
//atb.util.Stack.prototype.copyToArrayInStackOrder = function()
//copyToArrayInStackOrder
/*
atb.util.Stack.prototype.copyToArrayInPopOrder = function()
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