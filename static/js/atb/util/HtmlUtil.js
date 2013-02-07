goog.provide("atb.util.HtmlUtil");

goog.require("goog.ui.IdGenerator");
goog.require("atb.util.ReferenceUtil");


//var id = goog.ui.IdGenerator.instance.getNextUniqueId();

atb.util.HtmlUtil.generateUniqueId = function(opt_maxTries, opt_magicPrefix)
{

	var defaultMagicPrefix = "jakgioajdg_iafhngiaetj9ej_gi9agha9gh9__gdahgidha";//Hopefully this won't ever occur legitimately in a document!
	//todo: maybe append the timeofday as well...?
	
	opt_magicPrefix = atb.util.ReferenceUtil.applyDefaultValue(opt_maxTries, defaultMagicPrefix);
	opt_maxTries = atb.util.ReferenceUtil.applyDefaultValue(opt_maxTries, -1);
	//var bFoundResult = false;
	var numTried = 0;
	
	var appid;
	var testID;
	var testNode;
	
	do
	{
		appid = goog.ui.IdGenerator.instance.getNextUniqueId();
		testID = opt_magicPrefix + appid;
		
		//testNode = atb.util.ReferenceUtil.applyDefaultValue( document.getElementById(testID, null));
		testNode = atb.util.ReferenceUtil.applyDefaultValue( document.getElementById(testID), null);
		//^LOL
		//alert(""+testNode);//unefined
		//break;
		if (testNode === null)
		{
			return testID;
		}
	} while((opt_maxTries === -1)||(numTried++ < opt_maxTries));
	
	return null;//not found!
};