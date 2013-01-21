from django.conf.urls.defaults import patterns, url, include
import django.contrib.auth.views
import semantic_store.views


semantic_store_patterns = patterns('',
    url(r'^manifest/(?P<uri>.+)/$', 
        semantic_store.views.manifest, 
        name="semantic_store_manifest"),
)
