goog.provide("atb.util.DomTraverser");
goog.require("atb.util.Set");
goog.require("atb.util.Map");

//atb.util.DomTraverser = function(commonAncestor, start, end)
atb.util.DomTraverser = function(start, end)
{
	//this.commonAncestor = commonAncestor;
	this.start = start;
	this.end = end;
	this.commonAncestor = this.findCommonAncestor(this.start, this.end);
	
	this.endAncestor = this.findFirstAncestorBefore(this.end, this.commonAncestor);
	this.results = [];
	this.bFoundStart = false;
	this.bFoundEnd = false;
	this.bFoundEndAncestor = false;
	this.performTheSearch_(this.commonAncestor);
	 
	/*
	var hack = this.commonAncestor.firstChild;
	while(hack!==null)
	{
		var curHack = hack;
		hack = hack.nextSibling;
		
		if (curHack.nodeName.toLowerCase() == "style")
		{
			curHack.parentNode.removeChild(curHack);
		}
	}
	*/
	
	//this.commonAncestor.style.color = "#0000ff";//HACK;
	//fix hack:
	
	//TODO: check for the need to split nodes/tags...?!
	
	//debugPrint(""+this.dbgToPrintableHTMLString(this.commonAncestor.innerHTML));
	this.fixSearchResultsHack_();
};

atb.util.DomTraverser.prototype.fixSearchResultsHack_ = function()
{
	//debugPrint("!!");
	//return;
	//debugPrint("!!!2");
	
	var tmpArray = this.results;
	this.results = [];
	for(var i=0,l=tmpArray.length; i<l; i++)
	{
		var nd = tmpArray[i];
		//if (nd.firstChild !== null)
		{
			var testNd = nd.firstChild;
			var bFoundIt = true;
			while(testNd !== null)
			{
				if (!atb.util.DomTraverser.hasNodeHelper_(tmpArray, testNd))
				{
					bFoundIt=false;
					break;
				}
				testNd = testNd.nextSibling;
			}
			
			if (bFoundIt)
			{
				this.results.push(nd);
			}
			else
			{
				/*
				nd.style.color = "#ff0000";//discarded
				var parent = nd.parentNode;
				var tmpEl = document.createElement("span");
				tmpEl.style.color="#ff0000";
				parent.replaceChild(tmpEl, nd);
				tmpEl.appendChild(nd);
				
				debugPrint("discarding node: ");
				//debugPrint(""+this.dbgToPrintableHTMLString(nd.outerHtml));
				debugPrint(""+this.dbgToPrintableHTMLString(nd.innerHTML));
				debugPrint("");
				*/
			}
		}
	}
	
};

//atb.util.DomTraverser.prototype.findFirstAncestorBefore(node, beforeAncestor)
//atb.util.DomTraverser.prototype.findAncestorChainBefore(node, beforeAncestor)
//atb.util.DomTraverser.prototype.findAnce
atb.util.DomTraverser.prototype.findAncestorChainBefore=function(node, beforeAncestor)
{
	var ret = [];
	while(node != beforeAncestor)
	{
		ret.push(node);
		node = node.parentNode;
		if (beforeAncestor !== null)//if beforeAncestor is null, we're going to the root, anyways!
		{
			if (node==null)
			{
				debugPrint("Warning: out of ancestors!");
				break;
			}
		}
	}
	
	//ensure it starts at ancestors and goes to descendents:
	var ret_reversed = [];
	//for(var i=0,l=ret.length; i<l; i++)
	for(var i=ret.length-1; i>-1; i--)
	{
		ret_reversed.push(ret[i]);
	}
	
	return ret_reversed;
};

atb.util.DomTraverser.prototype.findCommonAncestor = function(nodeA, nodeB)
{
	var ancestryA = this.findAncestorChainBefore(nodeA, null);
	var ancestryB = this.findAncestorChainBefore(nodeB, null);
	
	var gcfAncestor = null;
	for(var ia=0, la = ancestryA.length; ia<la; ia++)
	{
		var ansestorA = ancestryA[ia];
		for(var ib=0, lb = ancestryB.length; ib<lb; ib++)
		{
			var ansestorB = ancestryB[ib];
			if (ansestorA === ansestorB)
			{
				gcfAncestor = ansestorA;//= ansestorB;
			}
		}
	}
	return gcfAncestor;
};

atb.util.DomTraverser.prototype.findFirstAncestorBefore=function(node, before)
{
	//var chain = findAncestorChainBefore(node,before);
	var chain = this.findAncestorChainBefore(node,before);
	if (chain.length < 1)
	{
		return null;
	}
	return chain[0];
};

atb.util.DomTraverser.prototype.performTheSearch_ = function(atNode)
{
	if (atNode === null)
	{
		return;
	}
	if (!this.bFoundStart)
	{
		if (atNode == this.start)
		{
			this.bFoundStart = true;
			//this.results.push(atNode);
		}
	}
	
	if (atNode == this.endAncestor)
	{
		this.bFoundEndAncestor = true;
	}
	
	//NOT ELSE HERE, b/c we want to accept changes inside of the above if block
	if (this.bFoundStart)
	{
		if (this.bFoundEnd)
		{
			return;
		}
		this.results.push(atNode);
		if (atNode == this.end)
		{
			this.bFoundEnd = true;
			return;
		}
	}
	
	//visit children first:
	if (atNode.firstChild !== null)
	{
		this.performTheSearch_(atNode.firstChild);
	}
	
	//next visit siblings:
	if (atNode.nextSibling !== null)
	{
		this.performTheSearch_(atNode.nextSibling);
	}
	
};

atb.util.DomTraverser.prototype.getTraversal = function()
{
	return this.results;
};

atb.util.DomTraverser.prototype.each = function(callback)//function()
{
	var moreArgs = [];
	//for(var i=1, l=arguments.length; i<l; i++)
	var i,l;
	for(i=1, l=arguments.length; i<l; i++)
	{
		moreArgs.push(arguments[i]);
	}
	var ret = [];
	//for(var i=
	for(i=0, l=this.results.length; i<l; i++)
	{
		var node;
		node=this.results[i];
		ret.push(callback.apply(node, moreArgs));
	}
	return ret;
};//);

//atb.util.DomTraverser.prototype.generateMinimumNodeSequence = function()
//atb.util.DomTraverser.prototype.findInArray = function

atb.util.DomTraverser.prototype.hasNode_= function(find_nd)
{
	
	var rawSeq = this.getTraversal();//.;
	return atb.util.DomTraverser.hasNodeHelper_(rawSeq, find_nd);
};

atb.util.DomTraverser.hasNodeHelper_ = function(rawSeq, find_nd)
{
	var i, l;
	for(i=0,l=rawSeq.length; i<l; i++)
	{
		//var nd = reqSeq[i];
		var nd = rawSeq[i];
		if (nd === find_nd)
		{
			return true;
		}
	}
	return false;
	
};

//atb.util.DomTraverser.prototype.replaceBunchWithCommonParent(bunch, setParent)//parentNode)
atb.util.DomTraverser.prototype.replaceBunchWithCommonParent=function(bunch, setParent)//parentNode)
{//lol@maybe have problems if we go up to the doc root... =/
	var first = bunch[0];
	//var second = bunch[1];
	var last = bunch[1];
	var parent = first.parentNode;
	var second = first.nextSibling;
	parent.replaceChild(setParent, first);
	setParent.appendChild(first);
	//setParent.appendChild(last);//HACK
	//return;
	
	if (first !== last)
	{
		var at = second;
		//debugPrint("at="+at);
		//if (at==last)
		//{
		//	debugPrint("at==last already!");
		//}
		//else
		//{
		//while(at !== last)
		var wasAt = null;
		do
		{
			wasAt = at;
			second = at.nextSibling;
			setParent.appendChild(at);
			at = second;
		} while(wasAt !== last);
		//}while(at !== last);
			//if (at == second)
			
			
		//}
	}
	
	/*if (first === second)
	{
		
		
	}
	else
	{
		parent
	}*/
}


atb.util.DomTraverser.prototype.eachTextNode = function(callback)
{
	var argumentsArr = [];
	for(var i=0,l=arguments.length; i<l; i++)
	{
		//argumentsArr[i]=arguments[i];
		argumentsArr.push(arguments[i]);
	}
	var ret = [];
	this.each(function()
	{
		var nd = this;
		var nodeType = nd.nodeType;
		if (nodeType === Node.TEXT_NODE)//===3
		{
			ret.push(callback.apply(this, argumentsArr));
		}
	});
	return ret;
};

atb.util.DomTraverser.prototype.generateMinimumNodeBunchSequence = function()
{
	var startAncestry = this.findAncestorChainBefore(this.start, this.commonAncestor);
	var endAncestry = this.findAncestorChainBefore(this.end, this.commonAncestor);
	
	var rawSeq= this.getTraversal();
	var seqPrime = [];
	//for
	var i, l;
	var rawSeq = this.getTraversal();//.;
	for(i=0,l=rawSeq.length; i<l; i++)
	{
		var nd = rawSeq[i];
		
		if (this.hasNode_(nd.parentNode))
		{
			continue;
		}
		seqPrime.push(nd);
	}
	
	var raw_bunches = [];
	//var bunchStart = 
	for(i=0,l=seqPrime.length; i<l; i++)
	{
		var nd = seqPrime[i];
		//if (this.hasNode_(nd.previousSibling))
		//if (nd.previousSibling !==null)
		if (!this.hasNode_(nd.previousSibling))
		{
			//continue;
			raw_bunches.push(nd);
		}
		else if (!this.hasNode_(nd.nextSibling))
		{//else if is to ensure we don't add duplicates...?or hmmm,...?
			raw_bunches.push(nd);
		}
		//else if (!this.hasNode
	}
	
	var bunches = [];
	while(raw_bunches.length > 0)
	{
		var nd;
		nd = raw_bunches.pop();
		var numConsumed = 0;
		//var kyodai =[];
		var siblings = [];
		siblings.push(nd);
		var last =raw_bunches.length-1; 
		for(i=last; i>-1; i--)
		{
			var nd2;
			nd2=raw_bunches[i];
			
			//are they related...?://siblings...?:
			if (nd2.parentNode === nd.parentNode)
			{
				//related by a parent, so...:
				numConsumed+=1;
				siblings.push(nd2);
				raw_bunches[i] = raw_bunches[last];//move something from the end here...
				last -= 1;
				raw_bunches.pop();//remove the last now...!
			}
		}
		bunches.push(siblings);
		//for (var i=0; i<l; i++)
	}
	
	var ret = [];
	
	for(i=0, l=bunches.length; i<l; i++)
	{
		var aBunch;
		aBunch = bunches[i];
		if (aBunch.length ==2)//!= 2)
		{
			var first,second;
			first = aBunch[0];
			second=aBunch[1];//TODO: check which comes first...!?
			
			var bSwapNeeded = false;
			//fail://var tmp = first.parentNode.firstSibling;
			var tmp = first.parentNode.firstChild;
			while(tmp !== null)
			{
				if (tmp == first)
				{
					bSwapNeeded=false;//lol
					break;
				}
				else if (tmp == second)
				{
					bSwapNeeded=true;
					break;
				}
				tmp=tmp.nextSibling;
			}
			if (bSwapNeeded)
			{
				var tmp;
				tmp = first;
				first = second;
				second = tmp;
				bSwapNeeded=false;
			}
			ret.push([first,second]);
		}
		else if (aBunch.length == 1)
		{
			ret.push([aBunch[0],aBunch[0]]);
		}
		else if (aBunch.length < 1)
		{
			////else if (aBunch < 1)
			debugPrint("too few in aBunch!: "+aBunch.length)
		}
		else
		{
			//HACK for fallbacks:
			debugPrint("warning: multiple non-sequential siblings found!!!");
			//for(var j=0; jl =aBunch.length; j<jl; j++)
			for(var j=0, jl =aBunch.length; j<jl; j++)
			{
				var aItem =aBunch[j];
				ret.push([aItem,aItem]);
			}
		}
	}
	return ret;
	
	//var raw_bunches2 = 
	
	//var bunches
	
};

atb.util.DomTraverser.prototype.dbgToPrintableHTMLString=function(htmlString)
{//lolhackbased on code from editor.js:
	var htmlString2 = "";
	for(var i =0, l = htmlString.length; i<l; i++)
	{
		var ch = htmlString[i];
		if (ch == "<")
		{
			htmlString2 += "&lt;";
		}
		else
		{
			htmlString2 += ch;
		}
	}
	//debugPrint(htmlString2);
	return htmlString2;
};
	
		/*
		if (this.hasNode_(nd.prevSibling))
		{
			continue;
		}
		if (this.hasNode_(nd.nextSibling))
		{
		}*/
	/*
	var keyCounter = 0;
	var nd_map = new atb.util.Map();
	var id_seq = [];
	
	var i, l;
	for(i=0,l=rawSeq.length; i<l; i++)
	{
		var nd = reqSeq[i];
		var key = keyCounter;
		keyCounter += 1;
		nd_map.put(key, nd);
		id_seq.push(key);
		keySet.add(key);
	}
	*/
	/*
	var seen = new atb.util.Set();
	
	var i, l;
	for(i=0,l=rawSeq.length; i<l; i++)
	{
		seen.add(rawSeq[i]);
	}
	if (seen.has(rawSeq[0]))
	{
	}
	*/
	
	
	
	//var ret = [];
	//var all = this.
	//for(
	
	
	//part 1: include only nodes which are descendants of siblings to the start ancestry chain before the common ancestor
		//each into a node
	
	//part 2: include all nodes that are direct siblings of the startAncestor, until we get to the endAncestor.
		//into one node
	
	//part 3: include only nodes which are siblings to the end ancestry chain before the common ancestor
		//each into a node
//};




/*
atb.util.DomTraverser.prototype.traversal = function()
{
	
};
*/