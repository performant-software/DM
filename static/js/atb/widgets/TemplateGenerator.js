goog.provide("atb.widgets.TemplateGenerator");

/**
 * @fileOverview A library of static template generating utility methods.
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");
goog.require("atb.util.LangUtil");

goog.require("atb.util.Map");
goog.require("atb.util.ObjectMap");

goog.require("jquery.jQuery");

/**
 * @namespace this provides some handy tools for generating html templates.
 *
 * One particular "data structure" which is used by most 
 * of the methods in this module is "struct_tree", which is explained below.
 <pre> 
 {struct_tree} ::=
 {
	
	{domElement} .element (OPTIONAL) - if provided, this should be an existing dom element which will be used instead of creating another. .tag WILL be ignored if this is provided and valid.
	OR
	 {string} .tag (DEFAULT: "div")  - passed to document.createElement (default of 'div' is to ensure we can always create something, otherwise it would be optional)
	
	AND POSSIBLY ALL OF:
	
	 {string} .html (OPTIONAL) - used to set innerHTML early in the tags initialization
	 {string} .key (OPTIONAL) - a user defined key to put this into the dict as. (not inserted into the dict, if this is null. think of this kinda like an "id", but only for the scope of the dictionary, and not needing to be at all unique per doc, just per template (hopefully, per dict, anyways!)
	 {string|array<string>} .css (OPTIONAL) - css class name(s).
	 {object} .style (OPTIONAL) - key/value pairs to copy into the tag's .style property.
	 {object} .events (OPTIONAL) - jquery event setter method names for keys, and event-handler functions for the values(handlers will be invoked in the scope of 'scope', and passed the raising event, as provided by jquery. the return value, if not null/undefined, will also be returned explicitly to the handler.
	 {object} .attribs (OPTIONAL) - key/value pairs to forward to the tags's setAttribute method.
	 {array<struct_tree>} .children (OPTIONAL) - an array of nested struct_tree's (ie, nested copies of this data structure. any children will be appended to this tag.)	 
 };
 
 * Example:
 var someDomNode = document.createElement("div");
 var someDomNode2 = document.getElementById("someId"); //assumes that node already exists
 
 var myTreeDef = {
	tag: "div",
	html: "hello, world!",
	key: "exampleKey1",
	style: {
		color: "red",
		background: "#00ff00"
	},
	css: [
		"example-css-class-1",
		"another-example-css-class"
	],
	events: {
		click: function(event)
		{
			//Note: 'this' refers to the scope object
			// (some code here)
		},
		mouseleave: function(event)
		{
			// (some code here)
		}
	},
	children: [
		{
			tag: "span",
			children: [
				{
					element: someDomNode,
					style: {
						fontStyle: "italic"
					},
					events: {
						//maybe some events here
					},
					children: [
						{
							tag: "a",
							attribs: {
								href: "about:blank"
							},
							html: "goto a blank page"
						}
					]
				}
			]
		},
		{
			element: someDomNode2
		},
		{
			tag: "br"
		}
	]
 };
 ///End Example.
 </pre>
 * Note: the above example is merely illustrative. It might actually not compile, and is not exhaustive, nor complete, just one example to help
 * the reader visualize whats going on.
 *
**/
atb.widgets.TemplateGenerator = atb.widgets.TemplateGenerator;	//Note: this otherwise pointless assignment seems to allow JSDoc to find this 'namespace'.



/**
 * creates a template fragment, and returns the root tag, along with a scope and a map from user-defined "keys" to some of the tags in the template.
 * tree is a recursive data structure defined roughly as:
 * 
 * @param {struct_tree} tree See definition below. this is used to initialized a subtree of stuff.
 * @param {object =} opt_scope An optional scope 'object' to execute as the "this" scope for various event handlers, etc. If one is not passed in, we will create one which will be available in the return value struct as (ReturnValue).scope.
 * @param {atb.util.Map =} opt_useMap An optional map which will be used in preference to creating a new one, if provided. otherwise we just create a new one and use that. This is mainly provided to allow us to chain several calls together into the same "template", but with differing parent nodes.
 *
 * @return Returns an object containing:  
 * {
 * 		scope{object}:(the scope used), 
 * 		map{a atb.util.Map}: of the tags by their keys, as specified by a "key" field in a struct_tree entry.
 *		root{domElement}: (the html dom element for the root level evaluation of the tree parameter)
 * }
 *
 * @public
**/
atb.widgets.TemplateGenerator.makeTemplate = function(tree, opt_scope, opt_useMap)
{
	//ensure our scope is sane:
	var scope = atb.util.ReferenceUtil.applyDefaultValue(opt_scope,null);
	if (scope === null)
	{
		scope = {};
	}
	
	//ensure our dictionary has a sane value:
	var dict = atb.util.ReferenceUtil.applyDefaultValue(opt_useMap, null);
	if (dict === null)
	{	
		
		dict = new atb.util.Map();
	}
	else if (!(dict instanceof atb.util.Map))
	{
		//but what if non-null but yet, not a map you ask? then look no further:
		throw new Error("atb.widgets.TemplateGenerator.makeTemplate(): non-null,non-undefined opt_useMap value provided is NOT an instanceof atb.util.Map. opt_useMap: "+dict);
	}
	
	//evaluate our root tag:
	var tag;
	tag = atb.widgets.TemplateGenerator.processNode_(scope, dict, tree);
	
	//return the results:
	return {			//note: this curly must be on same line as the return keyword.
		scope: scope,
		root: tag,
		map: dict
	};
};



/**
 * A variation on makeTemplate, which basically creates an array of "root" tags instead of just one.
 *  therefore, trees should be an {array} of <struct_tree> items. 
 * Note that all of the template parts will use the same scope and dict.
 *
 * basically this is the array version of makeTemplate, provided to allow a "template" to have tags without a common parent.
 *
 * @param {array<struct_tree>} trees A list of struct_tree objects which will be processed sequentially, and whose relevant .roots will be stored in that same order into the returned tags array field of the returnValue.
 * @param {object =} opt_scope An optional object like in makeTemplate. Note that all the makeTemplate calls done in a given call will share ONE scope.
 * @param {atb.util.Map =} opt_useMap An optional map like in makeTemplate. Note that all the makeTemplate calls done in a given call will share ONE dict.
 *
 * @return {scope, dict, tags} -- (scope, dict are the same with makeTemplate, tags is an array of values, replacing 'root', with one per element of the trees array, containing  the root tag for that call to makeTemplate.
 *
 * see {atb.widgets.TemplateGenerator.makeTemplate} for more information.
 * @public
**/
atb.widgets.TemplateGenerator.makeTemplateArray = function(trees, opt_scope, opt_useMap)
{
	//sanitize our scope:
	var scope = atb.util.ReferenceUtil.applyDefaultValue(opt_scope,null);
	if (scope === null)
	{
		scope = {};
	}
	
	//sanitize our dictionary;
	var dict = atb.util.ReferenceUtil.applyDefaultValue(opt_useMap, null);
	if (dict === null)
	{	
		dict = new atb.util.Map();
	}
	else if (!(dict instanceof atb.util.Map))
	{
		//but what if non-null but yet, not a map you ask? then look no further:
		throw new Error("atb.widgets.TemplateGenerator.makeTemplateArray(): non-null,non-undefined opt_useMap value provided is NOT an instanceof atb.util.Map. opt_useMap: "+dict);
	}
	
	//generate our tags list by calling makeTemplate repeatedly:
	var tags = [];
	for (var i=0, l=trees.length; i<l; i++)
	{
		var tmp;
		tmp = atb.widgets.TemplateGenerator.makeTemplate(trees[i], scope, dict);
		tags.push(tmp.root);//only save the root tag, the scope and dict are shared across all the calls made to makeTemplate in this for loop.
	}
	
	//return the results:
	return {
		tags: tags,
		scope: scope,
		map: dict
	};
};



/**
 * A variation on makeTemplate, which does not assume any root tags, and just simply returns the map and scope.
 *  treeMap should be an object containing key/value pairs, with the values being "trees" to parse with makeTemplate, 
 *	and the keys being a key to put the root tag created by that given call to makeTemplate into the dict as.
 *
 *  note that all of the created parts will use the same scope + dict, so basically this is just a way to create a map instead of a makeTemplateArray.
 *
 * @param {object<string ==> struct_tree>} treeMapObj An object which contains key/value pairs to put into the dict. (along with anything which has a key field already going into the dict)
 * @param {object =} opt_scope An optional object like in makeTemplate. Note that all the makeTemplate calls done in a given call will share ONE scope.
 * @param {atb.util.Map =} opt_useMap An optional map like in makeTemplate. Note that all the makeTemplate calls done in a given call will share ONE dict.
 *
 * @return {scope, dict} -- (no tag|tags field, they're all in the dict)
 *
 * see {atb.widgets.TemplateGenerator.makeTemplate} for more information.
 * @public
**/
atb.widgets.TemplateGenerator.makeTemplateMap = function(treeMapObj, opt_scope, opt_useMap)
{
	var treeMap = treeMapObj;//hack: renaming the formal parameter for some minor amount of increased clarity ... lol!
	
	//sanitize our scope:
	var scope = atb.util.ReferenceUtil.applyDefaultValue(opt_scope,null);
	if (scope === null)
	{
		scope = {};
	}
	
	//sanitize our dictionary;
	var dict = atb.util.ReferenceUtil.applyDefaultValue(opt_useMap, null);
	if (dict === null)
	{	
		dict = new atb.util.Map();
	}
	else if (!(dict instanceof atb.util.Map))
	{
		//but what if non-null but yet, not a map you ask? then look no further:
		throw new Error("atb.widgets.TemplateGenerator.makeTemplateMap(): non-null,non-undefined opt_useMap value provided is NOT an instanceof atb.util.Map. opt_useMap: "+dict);
	}

	//generate entries for our dict by processing each key/value pair, generating a makeTemplate result from each treeV, and putting its .root tag into the dict under name of the key.
	for (var k in treeMap)
	{
		//get the tree_struct to process for this loop iteration:
		var treeV = treeMap[k];
		
		//generate the makeTemplate sub-result
		var tmp;
		tmp = atb.widgets.TemplateGenerator.makeTemplate(treeV, scope, dict);
		
		//put it's .root into the dictionary:
		dict.put(k, tmp.root);
	}
	
	//return our results:
	return {
		scope: scope,
		map: dict
	};
}



/**
 * a bit more of an object-centric version of makeTemplate.
 *
 * @param {tree_struct|array<tree_struct>} tree_or_trees A tree_struct to pass along to makeTemplate|makeTemplateArray.
 * @param {object|atb.util.Map =} opt_asObject An object to use as both a scope and as a dict. If not provided, one will be created. If an atb.util.Map is provided, we will use that directly, otherwise we'll wrap the obj in an atb.util.ObjectMap before using it as a dictionary.
 * @param {string=} opt_intoObjectField The name of the field in the scope object to store our result. defaults to either "root" (if tree_or_tress is a tree_struct), or "tags" (if tree_or_trees is an array of tree_structs). Into the named field will go either the root tag, or the tags array, depending on the case which prevails.
 * 
 * @return {object} Returns the scope object.
 *
 * @public
**/
atb.widgets.TemplateGenerator.makeTemplateObject = function(tree_or_trees, opt_asObject, opt_intoObjectField)
{
	var bVectorMode = atb.widgets.TemplateGenerator.isArray_(tree_or_trees);
	
	var intoField = atb.util.ReferenceUtil.applyDefaultValue(opt_intoObjectField, null);
	if (intoField === null)
	{
		if(bVectorMode)
		{
			intoField = "tags";
		}
		else
		{
			intoField = "root";
		}
	}
	else
	{
		intoField = ""+intoField;
	}
	
	var obj = atb.util.ReferenceUtil.applyDefaultValue(opt_asObject, null);
	if (obj === null)
	{
		obj = {};
	}
	var dict;
	if (obj instanceof atb.util.Map)
	{
		dict = obj;//use it directly
	}
	else
	{
		dict = new atb.util.ObjectMap(obj);//wrap it
	}
	
	var tmp;
	var result;
	if (bVectorMode)
	{
		tmp = atb.widgets.TemplateGenerator.makeTemplateArray(tree_or_trees, obj, dict);
		result = tmp.tags;
	}
	else
	{
		tmp = atb.widgets.TemplateGenerator.makeTemplate(tree_or_trees, obj, dict);
		result = tmp.root;
	}
	
	obj[intoField] = result;
	return obj;
};



/**
 * kinda like a combination of makeTemplateMap, and makeTemplateObject.
 *  However, instead of taking a tree_struct or array of treestructs like makeTemplateObject,
 *   instead it takes an object containing key/value pairs like the treeMapObj parameter to makeTemplateMap.
 * the return value, like makeTemplateObject, is the scope object. Since that object (or the map wrapping it, rather),
 *  is where the tags get mapped into, we don't need any special field to tell us what key to store it into.
 *
 * @param {object} treeMapObj See the parameter of the same name in makeTemplateMap.
 * @param {object|atb.util.Map =} opt_asObject See the parameter of the same name in makeTemplateObject.
 *
 * @return {object} Returns the scope object.
 *
 * @public
**/
atb.widgets.TemplateGenerator.makeTemplateMapObject = function(treeMapObj, opt_asObject)
{	
	var obj = atb.util.ReferenceUtil.applyDefaultValue(opt_asObject, null);
	if (obj === null)
	{
		obj = {};
	}
	
	var dict;
	if (obj instanceof atb.util.Map)
	{
		dict = obj;//use it directly
	}
	else
	{
		dict = new atb.util.ObjectMap(obj);//wrap it
	}
	
	atb.widgets.TemplateGenerator.makeTemplateMap(treeMapObj, obj, dict);
	return obj;
};




///////////////////// HELPER METHODS: /////////////////////////////////




/**
 * helper method to try and figure out if something is an array or not.
 * @private
**/
atb.widgets.TemplateGenerator.isArray_ = function(obj)
{
	//HACK:
	return (
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj)) &&
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj.length)) &&
				(!atb.util.ReferenceUtil.isBadReferenceValue(obj.push))
	);
}



/**
 * returns true if the infoMap is for an interior (non-leaf) node
 * @private
**/
atb.widgets.TemplateGenerator.isInnerNode_ = function(infoMap)
{
	return infoMap.has("children");
}



/**
 * generate a tag as if the infoMap were for a leaf. (it might not be one!)
 * @private
**/
atb.widgets.TemplateGenerator.makeLeaf_ = function(scope, templateDict, infoMap)
{
	var info = infoMap;
	var tag = info.get("tag", "div")
	var element = info.get("element");
	var html = info.get("html");
	var key = info.get("key");
	var css = info.get("css");
	var style = info.get("style");
	var events = info.get("events");
	var attribs = info.get("attribs");
	
	var ret = element;//first try and use this element
	if (ret===null)
	{
		//else, create a new tag element:
		ret = atb.widgets.TemplateGenerator.makeHTML_(tag);
	}
	
	var i, l;
	var keys;
	
	var jqt = jQuery(ret);
		
	if (html !== null)
	{
		ret.innerHTML = ""+ html;
	}
	
	if (css !== null)
	{
		if (atb.widgets.TemplateGenerator.isArray_(css))
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
				var rawRet = v.call(scope, eventInfo);
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



/**
 * handles the node, creating it and any possible children, as appropriate.
 * @private
**/
atb.widgets.TemplateGenerator.processNode_ = function(scope, templateDict, infoObj)
{
	var infoMap = new atb.util.ObjectMap(infoObj);
	var tag = atb.widgets.TemplateGenerator.makeLeaf_(scope, templateDict, infoMap);//hack: do it for non-leafs nodes too...
	if (atb.widgets.TemplateGenerator.isInnerNode_(infoMap))
	{
		var children = infoMap.get("children", []);
		for(var i=0,l =children.length; i<l; i++)
		{
			var childObj = children[i];
			var childResult;
			child = atb.widgets.TemplateGenerator.processNode_(scope, templateDict, childObj);
			tag.appendChild(child);
		}
	}
	return tag;
}



/**
 * helper to actually create a tag.
 * might become public at some point...lol...
 * this sorta semi-started my implementation inspiration for this templategenerator class when it evolved past it into the makeTemplate stuff...lol!
 * @private
**/
atb.widgets.TemplateGenerator.makeHTML_ = function(tag, opt_innerHTML, opt_children)
{
	//atb.widgets.TemplateGenerator.makeHTML = function(tag, opt_innerHTML, opt_children)//maybe make me public someday...???
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
}



/*
//not so useful-seeming anymore, in light of the code above...
atb.widgets.TemplateGenerator.addLink = function(caption, func)
{
	var anchor = document.createElement("a");
	anchor.innerHTML = ""+caption;
	anchor.setAttribute("href", "#");
	jQuery(anchor).click(func);
	document.body.appendChild(anchor);
	document.body.appendChild(document.createElement("br"));
}
*/

