goog.provide("atb.util.LangUtil");

goog.require("atb.util.ReferenceUtil");
//goog.require("goog");
//atb.util.LangUtil.callForEach(onThisScope, callThisFunction, onEachOfThese, withTheseArguments)
//goog.require("atb.ut
/**
 * calls a function on a vector of items, and returns an array result from each.
**/
atb.util.LangUtil.callForEach = function(onThisScope, callThisFunction, onEachOfThese)
{
	var results = [];
	for(var i=0, l=onEachOfThese.length; i<l; i++)
	{
		var arg = onEachOfThese[i];
		var resultItem = callThisFunction.call(onThisScope, arg);
		results.push(resultItem);
	};
	return results;
};

atb.util.LangUtil.forceBoolean = function(boolExpr, opt_default)
{
	//Q: // atb.util.ReferenceUtil.isBadReferenceValue //would it be faster to check that before doing the defaults for opt_default, i wonder...?
	
	//opt_default allows us to give a default value for null/undefined values of boolExpr
	opt_default = atb.util.ReferenceUtil.applyDefaultValue(opt_default, false);
	
	// "!!" is to force it to a boolean (double-negation):
	return !!atb.util.ReferenceUtil.applyDefaultValue(boolExpr, opt_default);
};

atb.util.LangUtil.callForEachOrSingular = function(onThisScope, callThisFunction, onEachOrSingleNonArrayValue, opt_alwaysCollectSingletonResultsIntoAnArray)
{
	opt_alwaysCollectSingletonResultsIntoAnArray = atb.util.LangUtil.forceBoolean(opt_alwaysCollectSingletonResultsIntoAnArray, false);
	//opt_alwaysCollectSingletonResultsIntoAnArray = !!atb.util.ReferenceUtil.applyDefaultValue(opt_alwaysCollectSingletonResultsIntoAnArray, false);
	
	var bSingular = (goog.typeOf(onEachOrSingleNonArrayValue) !== "array");
	if (bSingular)
	{
		var rawResult = callThisFunction.call(onThisScope, onEachOrSingleNonArrayValue);
		if (opt_alwaysCollectSingletonResultsIntoAnArray)
		{
			return [rawResult];
		}
		else
		{
			return rawResult;
		}
	}
	else
	{
		return atb.util.LangUtil.callForEach(onThisScope, callThisFunction, onEachOrSingleNonArrayValue);
	}
};

atb.util.LangUtil.copyArray = function(arr, opt_copyElementFunc)
{
	var copyElementFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_copyElementFunc,null);
	
	arr = atb.util.ReferenceUtil.applyDefaultValue(arr, []);
	var ret = [];
	
	for (var i=0, l=arr.length; i<l; i++)
	{
		var obj = arr[i];
		if (copyElementFunc !== null)
		{
			obj = copyElementFunc(obj);
		}
		ret.push(obj);
		//arr[i]);
	}
	
	return ret;
};


//function forEach(obj, callFunction, opt_bGetValue)//Key)

//atb.widgets.TemplateGenerator.
/*
atb.util.LangUtil.advancedForEach =function(obj, callFunction, opt_bGetValue)//Key)
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
*/

/**
 * Note: some of the below functions might get changed significantly.
 *
**/

atb.util.LangUtil.isArray=function(obj)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	
	//from: http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
	return Object.prototype.toString.call(obj) === '[object Array]';
}

atb.util.LangUtil.isString = function(obj)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	//hack:
	//return (obj instanceof String);
	return (typeof(obj) == "string");
};

atb.util.LangUtil.isDate = function(obj)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	
	//hack:
	return (obj instanceof Date);
};

//atb.util.LangUtil.isObject = function(obj)

//atb.util.LangUtil.isObject = function(obj)
//atb.util.LangUtil.isGeneralObject = function(obj)
//atb.util.LangUtil.isObject = function(obj)
atb.util.LangUtil.isObject = function(obj)
{//not quite isobject...more of is a key/value pair'd object...
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	/*
	if (atb.util.LangUtil.isArray(obj))
	{
		return false;
	}*/
	
	if (typeof(obj)=="object")
	{
		return true;
	}
	return false;
};

atb.util.LangUtil.isNonPrimitiveValue = function(obj)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	//return (typeof(obj)=="object");
	
	
	if (atb.util.LangUtil.isDate(obj))
	{
		return true;
	}
	
	if (atb.util.LangUtil.isArray(obj))//HACK
	{
		return true;
	}
	
	if (atb.util.LangUtil.isString(obj))
	{
		return true;
	}
	
	if (atb.util.LangUtil.isObject(obj))
	{
		return true;
	}
	
	
	return false;
	//atb.util.LangUtil.isObject
	//return !atb.util.ReferenceUtil.isBadReferenceValue(obj.prototype);//HACK
	
	//hack:
	//return (obj instanceof Date);
};
atb.util.LangUtil.isFunction = function(obj)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(obj))
	{
		return false;
	}
	
	return (typeof(obj) == "function");
};

atb.util.LangUtil.isPrimitiveValue = function(v)
{
	if (atb.util.ReferenceUtil.isBadReferenceValue(v))
	{
		//return false;//null/undefined...?
		return true;
	}
	else
	{
		//return !atb.util.LangUtil.isObject(v);//HACK
		return !atb.util.LangUtil.isNonPrimitiveValue(v);//HACK
		//return typeof(
	}
	
};
//atb.util.ReferenceUtil.deepCopyRawObject = function(input)
//atb.util.ReferenceUtil.copyObject = function(input)

//atb.util.LangUtil.copyObject = function(input. opt_customCopyFunc)
atb.util.LangUtil.copyObject = function(input, opt_customCopyFunc)
{
	var customCopyFunc = atb.util.ReferenceUtil.applyDefaultValue(opt_customCopyFunc, null);
	
	if (customCopyFunc === null)
	{
		customCopyFunc = atb.util.LangUtil.copyObject_;
	}
	else
	{
		/*if (customCopyFunc !== atb.util.LangUtil.copyObject_)
		{
			var rawCustomCopyFunc = customCopyFunc;
			customCopyFunc = function(obj)
			{
				var ret = customCopyFunc(obj);
				//if (atb.util.ReferenceUtil.isBadReferenceValue(ret))
				if (atb.util.ReferenceUtil.isUndefined(ret))
				{
					//if (!atb.util.ReferenceUtil.isBadReferenceValue(obj))
					if (!atb.util.ReferenceUtil.isUndefined(obj))
					{
						ret = 
					}
				}
			};
			
		}*/
	}
	return atb.util.LangUtil.copyObject_(input, customCopyFunc);
};

//atb.util.LangUtil.defaultCopyObject = atb.util.LangUtil.copyObject_;
//atb.util.LangUtil.copyObject_ = function(input. customCopyFunc)
atb.util.LangUtil.copyObject_ = function(input, customCopyFunc)
{//lolundertested:
	//var debugPrint = function(msg){alert(msg);};//hack
	var debugPrint = function(msg){alert("Case: "+msg);};//hack
	
	//debugPrint("copyObject!");//hack
	
	if (atb.util.ReferenceUtil.isBadReferenceValue(input))
	{
		//debugPrint("[BAD REFERENCE VALUE: "+input+"]");
		return input;//no need to copy null/undefined
	}
	else if (atb.util.LangUtil.isArray(input))
	{
		//debugPrint("ARRAY");
		//return atb.util.LangUtil.copyArray(input, atb.util.ReferenceUtil.copyObject);
		return atb.util.LangUtil.copyArray(input, customCopyFunc);
	}
	else if (atb.util.LangUtil.isString(input))
	{
		//debugPrint("STRING");
		return ""+input;//HACK
	}
	else if (atb.util.LangUtil.isPrimitiveValue(input))
	{
		//lolimmutable check...???
		
		debugPrint("PRIMITIVE");
		
		//copy of a primitive is the primitive:
		return input;
	}
	else if (atb.util.LangUtil.isDate(input))
	{
		//is this correct...?:
		//debugPrint("DATE");//ok
		return new Date(input);//hack
	}
	else if (atb.util.LangUtil.isFunction(input))
	{
		return input;//don't bother to copy it ...lol!
		//or rebind...?lol
	}
	else
	{
		//debugPrint("OBJECT");
		//assume object:
		//if (
		//var output = {}
		// = function(srcObject, opt_bCopyOwnPropsOnly, opt_dst, opt_copyElementFunc, opt_bCopyPrototype)
		
		//var output = atb.util.ReferenceUtil.copySimpleObject(input, true, null, atb.util.LangUtil.copyObject, true);
		var output = atb.util.ReferenceUtil.copySimpleObject(input, true, null, customCopyFunc, true);
		//customCopyFunc
		return output;
	}
};


atb.util.LangUtil.test__copyObject = function()
{
	//alert(""+atb.util.LangUtil.isObject(new Date()));//false...wtf!
	//alert(""+atb.util.LangUtil.isObject({}));//false...wtf!
	//alert(""+atb.util.LangUtil.isObject(new Object()));//false...wtf!
	//alert(""+({}.prototype));
	//alert(typeof());
	
	
	//alert(typeof("hello"));//string
	//alert(typeof({}));//object
	////alert(""+atb.util.LangUtil.isDate(new Date()));
	
	//alert(""+atb.util.LangUtil.isObject({}));//false...wtf!
	//var msg = "";
	
	var testValue;
	var testCopy;
	var msg;
	var nl = "\n";
	var expectedMsg;
	var tmp = null;
	
		
	//Object type:
		/*
		//ok:
		//json style objects:
		//empty case:
		testValue = {};
		
		
		
		expectedMsg = "";
		expectedMsg += "[object Object] isArray?false"+nl;
		expectedMsg += "[object Object] isObject?true"+nl;
		expectedMsg += "[object Object] isString?false"+nl;
		expectedMsg += "[object Object] isDate?false"+nl;
		expectedMsg += "[object Object] isFunction?false"+nl;
		expectedMsg += "[object Object] isPrimitiveValue?false"+nl;

		msg = "";
		msg+=""+testValue+" isArray?"+atb.util.LangUtil.isArray(testValue)+nl;//false
		msg+=""+testValue+" isObject?"+atb.util.LangUtil.isObject(testValue)+nl;//treu
		msg+=""+testValue+" isString?"+atb.util.LangUtil.isString(testValue)+nl;//false
		msg+=""+testValue+" isDate?"+atb.util.LangUtil.isDate(testValue)+nl;//false
		msg+=""+testValue+" isFunction?"+atb.util.LangUtil.isFunction(testValue)+nl;//false
		msg+=""+testValue+" isPrimitiveValue?"+atb.util.LangUtil.isPrimitiveValue(testValue)+nl;//false
		if (msg !== expectedMsg)
		{
			alert("Warning: msg doesn't match expectations!\n"+msg);
		}
		
		testCopy = atb.util.LangUtil.copyObject(testValue);
		tmp = testValue;
		testValue = testCopy;
		
		msg = "";
		msg+=""+testValue+" isArray?"+atb.util.LangUtil.isArray(testValue)+nl;//false
		msg+=""+testValue+" isObject?"+atb.util.LangUtil.isObject(testValue)+nl;//treu
		msg+=""+testValue+" isString?"+atb.util.LangUtil.isString(testValue)+nl;//false
		msg+=""+testValue+" isDate?"+atb.util.LangUtil.isDate(testValue)+nl;//false
		msg+=""+testValue+" isFunction?"+atb.util.LangUtil.isFunction(testValue)+nl;//false
		msg+=""+testValue+" isPrimitiveValue?"+atb.util.LangUtil.isPrimitiveValue(testValue)+nl;//false
		if (msg !== expectedMsg)
		{
			alert("Warning: msg(testCopy) doesn't match expectations!\n"+msg);
		}
		testValue = tmp;
		tmp = null;//hack
		
		
		//if (testValue == testCopy)
		if (testValue === testCopy)
		{
			alert("WARNING(object empty case): testValue === testCopy");
		}
		
		testValue["abc"]=123;
		alert("[copy]"+testCopy+".abc = "+testCopy.abc);//undefined
		alert("[orig]"+testValue+".abc = "+testValue.abc);//123
		*/
		//alert((testValue instanceof testConstructor);// atb.util.Set));
		//alert((testCopy instanceof testConstructor);//atb.util.Set));
		/*s
		var testConstructor = function()
		{
		};
		testConstructor.prototype.desu = "Desu.";
		
		testValue = new testConstructor();//atb.util.Set();
		testCopy = atb.util.LangUtil.copyObject(testValue);
		alert(""+(testValue instanceof testConstructor));//true
		alert(""+(testCopy instanceof testConstructor));//true
		
		alert(""+testValue.desu);//currently: "Desu."
		alert(""+testCopy.desu);//currently: "Desu."
		*/
	//Number type:
		testValue = 3.14;
		/*
		alert(""+testValue+" isArray?"+atb.util.LangUtil.isArray(testValue));//false
		alert(""+testValue+" isObject?"+atb.util.LangUtil.isObject(testValue));//false
		alert(""+testValue+" isString?"+atb.util.LangUtil.isString(testValue));//false
		alert(""+testValue+" isDate?"+atb.util.LangUtil.isDate(testValue));//false
		alert(""+testValue+" isFunction?"+atb.util.LangUtil.isFunction(testValue));//false
		alert(""+testValue+" isPrimitiveValue?"+atb.util.LangUtil.isPrimitiveValue(testValue));//true
		*/
		
		/*
		//ok:
		testCopy = atb.util.LangUtil.copyObject(testValue);
		
		alert("original: "+testValue);//3.14
		alert("the copy:"+testCopy);//3.14
		testValue += 4;
		alert("original(modified):"+testValue);//7.14 (--ish)
		alert("the copy(original modified): "+testCopy); //3.14
		*/
	
	//Array type:
		testValue = [1,2,3];
		
		/*
		alert(""+testValue+" isArray?"+atb.util.LangUtil.isArray(testValue));//true
		alert(""+testValue+" isObject?"+atb.util.LangUtil.isObject(testValue));//true // should this be so...?
		alert(""+testValue+" isString?"+atb.util.LangUtil.isString(testValue));//false
		alert(""+testValue+" isPrimitiveValue?"+atb.util.LangUtil.isPrimitiveValue(testValue));//false
		*/
		/*
		alert("original, before being modified/copied:"+testValue);//1,2,3
		testCopy = atb.util.LangUtil.copyObject(testValue);
		alert("the copy(before modify original):"+testCopy);//1,2,3
		testValue.push("new item");
		alert("original, after being modified:"+testValue);//1,2,3,"new item"
		alert("the copy(after modify original): "+testCopy);//1,2,3
		//OK!
		*/
		
	
	//String type:
		//alert("\"hello\" isobject? "+atb.util.LangUtil.isObject("hello"));//true
		//alert("\"hello\" isstring? "+atb.util.LangUtil.isString("hello"));//true
		//alert("\"hello\" isprimitive? "+atb.util.LangUtil.isPrimitiveValue("hello"));//false
		
		//actual test:
			//alert("copystring?"+atb.util.LangUtil.copyObject("hello"));//seems ok
	
	
	
	//Date type:
		//alert("date isobject?"+atb.util.LangUtil.isObject(new Date()));//true
		//alert("newdate isdate?"+atb.util.LangUtil.isDate(new Date()));//true
		
		//actual test:
			//alert("copydate?"+atb.util.LangUtil.copyObject(new Date()));//seems ok!
		
		
	////////////////
	
	//alert(""+atb.util.LangUtil.isObject(new Date()));//false...wtf!
	
	//alert("hello: "+atb.util.LangUtil.isObject("hello"));//false...wtf!
	
	////alert(""+atb.util.LangUtil.copyObject(new Date()));//seems ok!
	
	
	
	//true//false...wtf!
	//debugPrint
	//atb.util.LangUtil.
	//alert(""+copyObject(new Date()));
	//alert(""+atb.util.LangUtil.copyObject(new Date()));
};

atb.util.LangUtil.bindFunction = function(func, opt_scope)
{
	opt_scope = atb.util.ReferenceUtil.applyDefaultValue(opt_scope, null);
	if (opt_scope !== null)
	{
		return function()
		{
			return func.apply(opt_scope, arguments);
		};
	}
	else
	{
		return func;
	}
};


//atb.util.LangUtil.test__copyObject();//hack

atb.util.LangUtil.ALWAYS_RETURN_AN_ARRAY = true; //used with 'atb.util.LangUtil.callForEachOrSingular'.