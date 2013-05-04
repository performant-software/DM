#! /bin/bash

django-admin.py clear_store --settings=dm.settings


django-admin.py harvest_collection_manifests --uri=http://manifests.ydc2.yale.edu/MetaManifest --url http://manifests.ydc2.yale.edu/MetaManifest.xml --manifest_file /Users/shannon/python_lib/dm/semantic_store/dummy_data/YaleMetaManifest.xml --store_host "localhost:8081" --rep_uri http://manifests.ydc2.yale.edu/Repository --rep_title "Yale University" --settings=dm.settings


django-admin.py harvest_collection_manifests --uri=http://ada.drew.edu/tandres/repos/SharedCanvas/Main/Collection --url http://ada.drew.edu/tandres/repos/SharedCanvas/Main/Collection.xml --manifest_file /Users/shannon/python_lib/dm/semantic_store/dummy_data/SharedCanvasCollection.xml --store_host "localhost:8081" --rep_uri http://shared-canvas.org/Repository --rep_title "Shared-canvas.org Demos" --settings=dm.settings

django-admin.py harvest_collection_manifests --uri=http://dms-data.stanford.edu/Parker/Collection --url http://dms-data.stanford.edu/Parker/Collection.xml --manifest_file /Users/shannon/python_lib/dm/semantic_store/dummy_data/ParkerMini.xml --store_host "localhost:8081" --rep_uri http://dms-data.stanford.edu/Repository --rep_title "Manuscripts Hosted by the Stanford University Libraries" --settings=settings


django-admin.py create_user --username testuser --email testuser@gmail.com --password "m@ggie" --store_host localhost:8081 --settings=dm.settings


django-admin.py add_resource_to_project --res http://manifests.ydc2.yale.edu/BeineckeMS10/Manifest --project "Default project" --username testuser --settings=dm.settings
