from django.conf.urls.defaults import patterns, url, include
import semantic_store.views
from semantic_store.rdf_views import ProjectView, ProjectTextView, UserView

urlpatterns = patterns('',
    url(r'^resources(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.resources, 
        name="semantic_store_resources"),


    url(r'^repositories(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.repositories, 
        name="semantic_store_repositories"),

    url(r'^repositories/(?P<uri>.+)/annotations/?$', 
        semantic_store.views.repositories, 
        name="semantic_store_repositories"),


    url(r'^projects/(?P<project_uri>.+)/annotations(?:/(?P<anno_uri>.+))?/?$', 
        semantic_store.views.project_annotations, 
        name="semantic_store_project_annotations"),

    url(r'^projects/(?P<uri>.+)/texts(?:/(?P<text_identifier>.+))?/?$', 
        ProjectTextView.as_view(), 
        name="semantic_store_project_texts"),

    url(r'^projects/(?P<uri>.+)/resources(?:/(?P<resource_identifier>.+))?/?$', 
        semantic_store.views.projects, 
        name="semantic_store_project_resources"),

    url(r'^projects(?:/(?P<uri>.+)/)?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),

    url(r'^projects(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),


    url(r'^manuscripts(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.manuscripts, 
        name="semantic_store_manuscripts"),

    url(r'^manuscripts/(?P<uri>.+)/annotations/?$', 
        semantic_store.views.manuscript_annotations, 
        name="semantic_store_manuscripts"),


    url(r'^manuscript_collections(?:/(?P<uri>.+))/?$', 
        semantic_store.views.manuscript_collections, 
        name="semantic_store_manuscript_collections"),

    url(r'^manuscript_collections/(?P<uri>.+)/annotations/?$', 
        semantic_store.views.manuscript_collection_annotations, 
        name="semantic_store_manuscript_collection_annotations"),


    url(r'^collections(?:/(?P<uri>.+))/?$', 
        semantic_store.views.collections, 
        name="semantic_store_collections"),

    url(r'^collections/(?P<uri>.+)/annotations/?$', 
        semantic_store.views.collection_annotations, 
        name="semantic_store_collection_annotations"),


    url(r'^users(?:/(?P<username>.+))?/?$', 
        UserView.as_view(), 
        name="semantic_store_users"),

    url(r'^users/(?P<username>.+)/annotations/?$', 
        UserView.as_view(), 
        name="semantic_store_user_annotations"),


    url(r'^annotations(?:/(?P<anno_uri>.+))?/?$', 
        semantic_store.views.annotations, 
        name="semantic_store_annotations"),


    url(r'^import/?$',
        semantic_store.views.import_old_data,
        name="import_old_data"),
)
