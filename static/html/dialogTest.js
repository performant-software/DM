goog.require("atb.widgets.DialogWidget");
goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.Map");
goog.require("atb.util.LangUtil");
goog.require("atb.util.ObjectMap");
goog.require("atb.debug.DebugTools");
goog.require("atb.widgets.TemplateGenerator");

var templateConfig = {
	tag: "div",
	style: {
		color: "red",
		//background: "blue",
		background: "gray",
		borderColor: "black",
		borderStyle: "solid",
		borderWidth: "1px"
	},
	events: {
		"mouseleave": function(event)
		{
			debugPrint("mouseexit");
		},
		"mouseenter": function(event)
		{
			debugPrint("mouseentry");
		}
	},
	
	children: [
		{
			tag: "a",
			attribs: {
				"href": "about:blank"
			},
			html: "goto blank page"
		},
		
		{
			tag: "br"
		},
		
		{
			tag: "a",
			html: "test3",
			attribs: {
				"href": "#"
			},
			events: {
				"click": function(event)
				{
					debugPrint("test3 clicked!");
				}
			}
		}
	]
};
	
function initTestPage()
{
	//var templateObject = {};
	document.body.style.padding = "5%";
	addLink("test dialog box", showTestDialogBox);
	
	
	var theDialog = new atb.widgets.DialogWidget();
	var info = atb.widgets.TemplateGenerator.makeTemplate(templateConfig);
	//, templateObject);
	
	//var map = info.map;
	var root = info.root;
	//templateObject.map = map;
	//templateObject.root = root;
	
	//if (true)
	if (false)
	{
		document.body.appendChild(root);//testing hack for now!
	}
	else
	{
		theDialog.setContentNode(root);
		theDialog.setCaption("Test Widget Content:");
		//theDialog.setModal(true);
		theDialog.setModal(false);
		theDialog.show();
	}
}

function showTestDialogBox()
{
	//var theDialog = new atb.widgets.DialogPage();
	var theDialog = new atb.widgets.DialogWidget();
	theDialog.setContent("hello, world!");
	theDialog.setCaption("The Caption");
	theDialog.setModal(true);
	theDialog.show();
}

function addLink(caption, func)
{
	var anchor = document.createElement("a");
	anchor.innerHTML = ""+caption;
	anchor.setAttribute("href", "#");
	jQuery(anchor).click(func);
	document.body.appendChild(anchor);
	document.body.appendChild(document.createElement("br"));	////lolhack!
}

function forEach(obj, callFunction, opt_bGetValue)//Key)
{
	//opt_bGetKey = 
	var scope = obj;//null;
	var ret = [];
	opt_bGetValue = atb.util.LangUtil.forceBoolean(opt_bGetValue, true);
	for(var k in obj)
	{
		var args = [k];
		if (opt_bGetValue)
		{
			var v = obj[k];
			args.push(v);
		}
		var result;
		result = callFunction.apply(scope, args);
		if (!atb.util.ReferenceUtil.isBadReferenceValue(result))
		{
			ret.push(result);
		}
		//var 
		//callFunction(obj, k);
	}
	return ret;
};














///////////old-junk below:///////////////


//struct info:
	//tag"", key"", css[]|"", style{}, children[], events{}, html"", attribs{}
	//css: "colorful1",
	
	//tag;
	//lotimeaottolol!
	/*
	template.map = map;
	template.root = root;
	*/
	
	//lol!
	//var nd = 
	//theDialog.setContentNode(nd);
	
//lolow!

//};

//key for lol...?

//function tag(tag, opt_innerHTML, opt_children)




///////////////////////////////lol:



/**
function isInnerNode(infoMap)
{
	return infoMap.has("children");
}

function makeLeaf(scope, templateDict, infoMap)
{
	var info = infoMap;
	
	//var createTagOfType = info.get("tag", "div")
	//debugViewObject(info.data);
	var tag = info.get("tag", "div")
	var html = info.get("html");
	var key = info.get("key");
	var css = info.get("css");
	var style = info.get("style");
	var events = info.get("events");
	var attribs = info.get("attribs");
	
	var ret = makeHTML(tag);
	//createTagOfType);
	//alert(""+html);
	//alert(""+style);
	//alert(""+css);
	var i, l;
	var keys;
	//var jqt;
	var jqt = jQuery(ret);
		
	
	if (html !== null)
	{
		ret.innerHTML = ""+ html;
	}
	
	if (css !== null)
	{
		//jqt = jQuery(ret);

		if (isArray(css))
		{
			for(i=0, l=css.length; i<l; i++)
			{
				jqt.addClass(css[i]);
			}
		}
		else if (css !== null)
		{
			jqt.addClass(css);
		}
	}
	
	if (style !== null)
	{
		var styleMap = new atb.util.ObjectMap(style);
		keys =styleMap.getKeys();
		for(i=0, l=keys.length; i<l; i++)
		{
			var k = keys[i];
			var v = styleMap.get(k);
			ret.style[k] = v;
		}
	}
	
	if (key !== null)
	{
		templateDict.put(key, ret);
	}
	
	if (attribs !== null)
	{
		var attribsMap = new atb.util.ObjectMap(attribs);
		keys = attribsMap.getKeys();
		
		for(i=0, l=keys.length; i<l; i++)
		{
			var k = keys[i];
			var v = attribsMap.get(k);
			//tag.setAttribute(k, v);
			ret.setAttribute(k, v);
		}
	}
	
	if (events !== null)
	{
		var eventsMap = new atb.util.ObjectMap(events);
		keys = eventsMap.getKeys();
		
		var generator = function(scope, v, templateDict)
		{
			return function(eventInfo)
			{
				var rawRet = v.call(scope, eventInfo, templateDict);
				if (!atb.util.ReferenceUtil.isBadReferenceValue(rawRet))
				{
					return rawRet;
				}
			};
		};
		
		for(i=0, l=keys.length; i<l; i++)
		{
			var k = keys[i];
			var v = eventsMap.get(k);
			//assuming jq[k] is an event-registering func:..lol!
			
			jqt[k](generator(scope, v, templateDict));
		}
	}
	
	return ret;
}

function processNode(scope, templateDict, infoObj)
{
	var infoMap = new atb.util.ObjectMap(infoObj);
	var tag = makeLeaf(scope, templateDict, infoMap);//hack nonleafs work to..lol!
	if (isInnerNode(infoMap))
	{
		var children = infoMap.get("children", []);
		for(var i=0,l =children.length; i<l; i++)
		{
			var childObj = children[i];
			var childResult;
			child = processNode(scope, templateDict, childObj);
			tag.appendChild(child);
		}
	}
	return tag;
}

function makeTemplate(scope, tree)
{
	scope = atb.util.ReferenceUtil.applyDefaultValue(scope,null);
	if (scope === null)
	{
		scope = {};
	}
	
	var dict = new atb.util.Map();
	//var tag = processNode(dict, tree);
	var tag = processNode(scope, dict, tree);
	//var root_tags 
	//root_tags = forEach(tree, visitor,true);
	
	return {
		//tags: root_tags,
		//scope: scope,
		//obj: scope
		scope: scope,
		root: tag,
		map: dict
		//map: map
	};
};

function makeHTML(tag, opt_innerHTML, opt_children)
{
	var ret = document.createElement(tag);
	opt_innerHTML = atb.util.ReferenceUtil.applyDefaultValue(opt_innerHTML, null);
	opt_children = atb.util.ReferenceUtil.applyDefaultValue(opt_children, null);
	
	if (opt_innerHTML !== null)
	{
		ret.innerHTML = "" + opt_innerHTML;
	}
	
	if (opt_children !== null)
	{
		for(var i=0, l =opt_children.length; i<l; i++)
		{
			ret.appendChild(opt_children[i]);
		}
	}
	
	return ret;
}*/

/*
atb.widgets.TemplateGenerator.addLink = function(caption, func)
{
	var anchor = document.createElement("a");
	anchor.innerHTML = ""+caption;
	anchor.setAttribute("href", "#");
	jQuery(anchor).click(func);
	document.body.appendChild(anchor);
	document.body.appendChild(document.createElement("br"));	////lolhack!
}*/
//var map = new atb.util.Map(
	/*
	//lolok:!
	var undef;
	if (atb.util.ReferenceUtil.isUndefined(undef))
	{
		debugPrint("undef check: ok!");
	}
	else
	{
		throw new Error("atb.util.ReferenceUtil.isUndefined not working!");
	}
	
	if (atb.util.ReferenceUtil.isUndefined(""))
	{
		throw new Error("undef check: false positive!");
	}
	*/
	//body.padding = "5%";//hack
	//body.style.padding = "5%";//hack

	
	/*function isArray(obj)
{
	//HACK:
	return (
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj)) &&
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj.length)) &&
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj.push))
	);
}*/
	
/*
//lol:	
function test(obj)
{
	var map = new atb.util.ObjectMap(obj);//undefined with this..!//lolnowfilol!
	//map =new atb.util.Map();//null with this
	
	debugPrint("has html? " +map.has("html"));//false
	debugPrint("get('html')="+map.get("html"));//undefined...?!?
}*/