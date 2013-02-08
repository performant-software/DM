from django.conf.urls.defaults import patterns, url, include
import semantic_store.views

urlpatterns = patterns('',
    url(r'^manifests/(?P<uri>.+)(?:\.(?P<ext>.+))?/?$', 
        semantic_store.views.manifest, 
        name="semantic_store_manifest"),
    url(r'^annotations/(?P<dest_graph_uri>.+)/(?P<anno_uri>.+)/$', 
        semantic_store.views.annotations, 
        name="semantic_store_annotations"),
    url(r'^annotations/(?P<dest_graph_uri>.+)/$', 
        semantic_store.views.annotations, 
        name="semantic_store_annotations"),
)
