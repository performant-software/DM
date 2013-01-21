<?php
/**
 * DataStoreTest.php
 * A quick test I made to test interactions with the atb.datastore class.
 *
 * @author John O'Meara
**/
//Note: this page should be evaluated by php

//TODO: maybe change the content-type header to something more 'sane' for json...?



//Get the requested resourceId
$resourceId = @$_GET["resourceId"];
if ($resourceId === false)
{
	//no resourceId specified:
	$response_data = array(
		"status" => "error",
		"message" => "no resourceId was not passed into the queryString!"
	);
}
else
{
	//TODO: maybe grab these things from a database?
	$lastModified = 1;//hack
	$contentType = "unknown";//HACK
	
	//TODO: put something more useful in here, perhaps...?
	$opaque_content_object = array(
			"somekey" => "someValue",
			"desu" => 3,
			"id" => $resourceId
		);
	
	
	//prepare response:
	$response_data = array(
		"status" => "ok",
		"lastModified" => $lastModified,
		"contentType" => $contentType,
		"id" => $resourceId,
		"content" => $opaque_content_object
	);
}

//encode the data into the json format:
$json_output = json_encode($response_data);

//output the data:
echo $json_output;

//stop the script here (this is probably redundant, but...)
die();
?>