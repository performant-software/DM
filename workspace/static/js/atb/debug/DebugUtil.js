goog.provide("atb.debug.DebugUtil");

goog.require("atb.util.ReferenceUtil");

atb.debug.DebugUtil.debugAssertion = function(bCondition, message)
{
	bCondition = (!!bCondition); //force to boolean
	if (bCondition === false)
	{
		throw new Error(message);
	}
};

//atb.debug.DebugUtil.assertValidObject = function(obj

atb.debug.DebugUtil.assertValidObject = function(obj, message)
{
	//calculate condition:
	var bCondition = (!atb.util.ReferenceUtil.isBadReferenceValue(obj));
	
	//forward to debugAssertion:
	return atb.debug.DebugUtil.debugAssertion(
		bCondition,
		message
	);
};

atb.debug.DebugUtil.assertNotValidObject = function(obj, message)
{
	//calculate condition:
	var bCondition = (!atb.util.ReferenceUtil.isBadReferenceValue(obj));
	bCondition = !bCondition; //negate value
	
	//forward to debugAssertion:
	return atb.debug.DebugUtil.debugAssertion(
		bCondition,
		message
	);
};