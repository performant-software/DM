goog.require("atb.debug.DebugTools");
goog.require("atb.debug.DebugUtil");
goog.require("atb.util.Map");

goog.require("atb.WebService");
goog.require("atb.DataStore");

var dataStore = null;
var lastLocalId = null;



function initTest()
{
	var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "annotation.drew.edu/";
	//var webServiceURI = location.href.substring(0,location.href.lastIndexOf("/") + 1) + "/";//HACK
	//);//HACK
    var webService = new atb.WebService(webServiceURI);
	
	dataStore = new atb.DataStore(webService);
	
	testDS(dataStore);
	//alert(this["requestFunction"]);//lolundefined, as expected...
}



function doCommit()
{
	if (dataStore === null)
	{
		debugPrint("null dataStore!");
		return;
	}
	
	dataStore.commitAll(function()
	{
		debugPrint("doCommit() completed!");
	});
}



function userRequestedCommit()
{
	if (doCommit!==null)
	{
		doCommit();
	}
	else
	{
		debugPrint("doCommit is null!");
	}
}



function userRequestedDumpDataStoreMethods()
{
	debugViewObject({});//hack
	//debugViewer.bOnlyShowFunctions = true;//lolhack!
	debugViewer.bAutoSortKeys=false;
	////debugViewObject(atb.DataStore.prototype);
	debugViewObject(atb.DataStore.prototype, "prototype of atb.DataStore");
	/*
	prototype of atb.DataStore: [object Object]
          [+]createLocalObject: [function]
          [+]isIncompleteObject: [function]
          [+]hasLocalId: [function]
          [+]getDataObject: [function]
          [+]selectDataObjects: [function]
          [+]commitAll: [function]
          [+]commit: [function]
          [+]updateLocalObject: [function]
          [+]getLocalObject: [function]
          [+]toLocalId: [function]
          [+]toRemoteId: [function]
          [+]cancelResolver: [function]
          [+]resolveObjects: [function]
	
	*/
	
	/*
	prototype of atb.DataStore: 
	      [+]createLocalObject: function (opt_withValue, opt_contentType)
          [+]isIncompleteObject: function (localId)
          [+]hasLocalId: function (localId)
          [+]getDataObject: function (localId)
          [+]selectDataObjects: function (query, opt_customArgs)
          [+]commitAll: function (opt_onCompleteFunc, opt_bDelayObjectCollection)
          [+]commit: function (localIds, opt_onCompleteFunc, opt_bDelayObjectCollection)
          [+]updateLocalObject: function (localId, set_value)
          [+]getLocalObject: function (localId)
          [+]toLocalId: function (remoteId)
          [+]toRemoteId: function (localId)
          [+]cancelResolver: function (listenerId)
          [+]resolveObjects: function (remoteIdList, taskFunction) 
	*/
	
	//Q: do i want a method to add custom data object loaded listeners...?
	//and/or a modified objects listener...?
	//..maybe also some content-type handlers/etc... hmmmm...//mergers etc., too...???
	//maybe rename to get resource//etc..lol...!?!s
	//lolmaybeexpunge stuff...!?!...?
	//lol...?
}



function userRequestedModification()
{
	if (dataStore === null)
	{
		debugPrint("null dataStore!");
		return;
	}
	
	var itemId = prompt("modify what localId?", ""+lastLocalId);
	if (itemId === null)
	{
		debugPrint("user aborted modification!");
		return;
	}
	else if (!dataStore.hasLocalId(itemId))
	{
		debugViewObject(dataStore.getLocalObject(itemId),"no such localId: '"+itemId+"'...?:");
		debugPrint("no such localId: '"+itemId+"'...");
		return;
	}
	else
	{
		var localId = itemId;
		lastLocalId = localId;
		var obj = dataStore.getLocalObject(localId);
		dataStore.updateLocalObject(localId, obj);
		debugPrint("the user 'modified' localId: "+localId);
		debugViewObject(obj, "the user just modified this object");
	}
}



function userRequestedSelectDataObjectsTest()
{
	var results = dataStore.selectDataObjects({
		where: function(inDataStore, dataObj, customArgs, moreQueryInfo)
		{
			if (dataObj.wasModifiedLocally())
			{
				return true;
			}
		},
		limit: 100
	});
	debugViewObject(results, "query results");
}



function testDS(ds)
{
	var localId;
	var remoteId;
	
	var obj;
	obj = {caption: "test_object_1"};
	localId = ds.createLocalObject(obj);
	var localId_ok1 = localId;
	
	obj = {caption: "test_object_2"};
	localId = ds.createLocalObject(obj);
	
	lastLocalId = localId;//lolhack!!
	
	var doRequest = function()
	{
		//var remoteIdsToResolve = [1,2,3,4,5];
		var remoteIdsToResolve = [];
		for(var i=0; i<12; i++)
		{
			var remoteId;
			remoteId = ""+i;
			remoteIdsToResolve.push(remoteId);
		}
		var resolverId;
		
		var taskFunction = function(taskEvent)
		{
			if (taskEvent.isCompletionEvent())
			{
				var objects = taskEvent.getDataObjects();
				for(var i=0, l=objects.length; i<l; i++)
				{
					var dataObj = objects[i];
					if (i == 0)
					{
						dataObj.setContent({
							desc: "testing overwriting an object locally"
						});
					}
				}
				/*
				var bDoCommitsAfter = true;
				if (bDoCommitsAfter)
				{
					doCommit();
					//debugPrint("
				}
				else
				{
					debugViewObject(objects, "all task objects");
				}*/
				debugViewObject(objects, "all task objects");
			}
			else
			{
				//probably a progress event...?
			}
		};
		resolverId = ds.resolveObjects(remoteIdsToResolve, taskFunction);
		/*
		var localId_num0 = ds.toLocalId(remoteIdsToResolve[0]);
		debugPrint("is incomplete num0: "+ds.isIncompleteObject(localId_num0));//true--ok
		debugPrint("is incomplete localId_ok1: "+ds.isIncompleteObject(localId_ok1));//false--ok
		*/
	};
	
	doRequest();
}





//much older testing code (Note: might not still work/be sane):

/*
function testDSS0()
{
	
	//lol first bug:
	var a = new atb.DataStoreStorage();
	var b = new atb.DataStoreStorage();
	alert(a.localIdMap === b.localIdMap);
	alert(a.localIdMap);
	a.localIdMap.put("akey", "avalue");
	alert("b.get('akey') = "+b.localIdMap.get("akey"));//same...lol!//fail!
	
}
function testDSS()
{
	//debugViewObject({a:"hello,world!"});
	
	//localIdMap
	
	var testRemoteData = {
		a: { bRemote: true, caption: "a"},
		b: { bRemote: true, caption: "b"},
		c: { bRemote: true, caption: "c"}
	};
	
	var testLocalData = {
		local_1: { caption: "local_1" },
		local_2: { caption: "local_2" },
		local_3: { caption: "local_3" },
		local_4: { caption: "local_4" }
	};
	var dss = new atb.DataStoreStorage();
	var localDataLocalIds = [];
	var remoteDataLocalIds = [];
	var allLocalIds = [];
	var localId;
	var obj;
	var k;
	var remoteIds = [];
	
	//for(var k in testLocalData)
	for(k in testLocalData)
	{
		obj = testLocalData[k];
		
		
		localId = dss.createObject(obj);
		localDataLocalIds.push(localId);
		allLocalIds.push(localId);
	}
	
	var remoteId;
	var localId2;
	for(k in testRemoteData)
	{
		remoteId = k;
		obj = testRemoteData[remoteId];
		localId = dss.allocateRemote(remoteId);
		debugPrint("");
		localId2  =localId;//null;//hack
		localId2 = dss.allocateRemote(remoteId);
		
		debugPrint("");
		atb.debug.DebugUtil.debugAssertion(localId === localId2, "localId !== localId2; after two calls to dss.allocateRemote(); remoteId: "+remoteId+", localId="+localId+", localId2="+localId2);
		//dss.bind(localId, remoteId);
		debugPrint("");
		
		allLocalIds.push(localId);
		remoteDataLocalIds.push(localId);
		remoteIds.push(remoteId);
		
		dss.updateObject(localId, obj);
	}
	var lastLocalId = allLocalIds[allLocalIds.length-1];
	
	//debugViewObject(dss.getObject(lastLocalId));
	
	var keys = dss.getLocalIdList();
	var i, l;
	
	var tmp;
	tmp = {};
	for(i=0, l=keys.length; i<l; i++)
	{
		//var key = keys[i];
		k = keys[i];
		obj = dss.getObject(k);
		//key);
		tmp[k] = obj;
	}
	debugViewObject(tmp);
	
	for(i=0, l=remoteIds.length; i<l; i++)
	{
		remoteId = remoteIds[i];
		localId = dss.toLocalId(remoteId);
		if (localId === false)
		{
			obj = "<i>(remoteId unbound: '"+remoteId+"')</i>";//HACK
		}
		else
		{
			obj = dss.getObject(localId);
		}
		//debugPrint(obj);
		debugPrint("remoteId: "+remoteId);
		debugPrint("localId: "+localId);
		debugPrintObject(obj);
		debugPrint("&nbsp;");
		//debugPrint("");
	}
	return dss;//hack
}
*/
/*
function testMaps()
{
	var m = new atb.util.Map();
	var key1 = "key";
	var key2 = "k";
	var key3 = 0;
	var key4 = ""+ key3;
	
	m.put(key1, "ok");
	var test1 = m.get(key2);
	key2 += "ey";
	var test2 = m.get(key2);
	debugPrint("test1: "+test1);
	debugPrint("test2: "+test2);
	
	//m.put(key3, "#");
	m.put(key4, "#");
	var test3 = m.get(key3);
	debugPrint("test3: "+test3);
	var test4 = m.get(key4);
	debugPrint("test4: "+test4);
}*/

