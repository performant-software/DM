//Begin File atb.datastore.ContentTypes
goog.provide("atb.datastore.ContentTypes");

/**
 * @fileOverview an enum of sorts for ContentType(s).
 * TODO: add more/revise the types already listed here...?
 *
 * @author John O'Meara
**/

goog.require("atb.util.ReferenceUtil");


/**
 * @namespace An enumeration of ContentType(s) for resources.
 * Not yet complete at all.
**/
//atb.datastore.ContentTypes = atb.datastore.ContentTypes;




/////////////our fields:///////////////



/**
 * no type assigned yet, or the type has not been retrieved yet. (for incomplete objects)
**/
atb.datastore.ContentTypes.TYPE_NULL = "null";

/**
 * meant to be for maker objects which are attached to a map...
**/
atb.datastore.ContentTypes.TYPE_MARKER = "marker";

/**
 * meant to be for an "annotation" - the connective linkage between several other things....
**/
atb.datastore.ContentTypes.TYPE_ANNOTATION = "annotation";
/**
 *meant to be for annotations in a body of text 
**/
//atb.datastore.ContentTypes.TYPE_TEXT_BLOCK = "quote";
atb.datastore.ContentTypes.TYPE_TEXT_BLOCK = "textHighlight";

/**
 * meant to be for map 'image' resource things...
**/
//atb.datastore.ContentTypes.TYPE_TEXT_MAP_RESOURCE = "map_resource";
atb.datastore.ContentTypes.TYPE_TEXT_MAP_RESOURCE = "image";

/**
 * meant to be for written content. maybe text-doc is a bit too misleading given .txt vs .html...
**/
atb.datastore.ContentTypes.TYPE_TEXT_TEXT_DOCUMENT_RESOURCE = "text_document_resource";


atb.datastore.ContentTypes.TYPE_USER_RESOURCE = "user";

/**
 * a magical-catchall for unknown types. Okay, maybe not magical, but anyways...
**/
atb.datastore.ContentTypes.TYPE_UNKNOWN = "unknown";


/**
 * a list of our constant-value(s).
 * 
**/
atb.datastore.ContentTypes.VALUES = [
	atb.datastore.ContentTypes.TYPE_NULL,
	atb.datastore.ContentTypes.TYPE_MARKER,
	atb.datastore.ContentTypes.TYPE_ANNOTATION,
	atb.datastore.ContentTypes.TYPE_TEXT_BLOCK,
	atb.datastore.ContentTypes.TYPE_TEXT_MAP_RESOURCE,
	atb.datastore.ContentTypes.TYPE_TEXT_TEXT_DOCUMENT_RESOURCE,
	
	atb.datastore.ContentTypes.TYPE_USER_RESOURCE,//lolnew-based on dataformats.txt
	
	atb.datastore.ContentTypes.TYPE_UNKNOWN
];

/**
 * @deprecated Not really sure what i was thinking with this.
 * checks to see if the testValue is in the enum's VALUES list.
**/
atb.datastore.ContentTypes.isEnumConstant = function(testValue)
{
	testValue = atb.util.ReferenceUtil.applyDefaultValue(testValue, null);
	if (testValue === null)
	{
		return false;	
	}
	
	var arr = atb.datastore.ContentTypes.VALUES;
	for(var i=0, l=arr.length; i<l; i++)
	{
		var knownValue = arr[i];
		if (knownValue == testValue)
		{
			return true;
		}
	}
	return false;
};
