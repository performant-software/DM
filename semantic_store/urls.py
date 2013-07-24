from django.conf.urls.defaults import patterns, url, include
import semantic_store.views

urlpatterns = patterns('',
    url(r'^resources(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.resources, 
        name="semantic_store_resources"),


    url(r'^projects/(?P<project_uri>.+)/annotations(?:/(?P<anno_uri>.+))?/?$', 
        semantic_store.views.project_annotations, 
        name="semantic_store_project_annotations"),

    url(r'^projects/(?P<project_uri>.+)/texts(?:/(?P<text_uri>.+))?/?$', 
        semantic_store.views.project_texts, 
        name="semantic_store_project_texts"),

    url(r'^projects/(?P<uri>.+)/resources(?:/(?P<resource_identifier>.+))?/?$', 
        semantic_store.views.projects, 
        name="semantic_store_project_resources"),

    url(r'^projects(?:/(?P<uri>.+))/remove_triples?/?$',
        semantic_store.views.remove_project_triples,
        name="semantic_store_projects_remove_triples"),

    url(r'^projects(?:/(?P<uri>.+)/)?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),

    url(r'^projects(?:/(?P<uri>.+))?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),


    url(r'^users(?:/(?P<username>.+))/remove_triples?/?$',
        semantic_store.views.remove_user_triples,
        name="semantic_store_user_remove_triples"),

    url(r'^users(?:/(?P<username>.+)/)?/?$', 
        semantic_store.views.users,
        name="semantic_store_users_with_slash"),

    url(r'^users(?:/(?P<username>.+))?/?$', 
        semantic_store.views.users,
        name="semantic_store_users"),
    

    url(r'^annotations(?:/(?P<anno_uri>.+))?/?$', 
        semantic_store.views.annotations, 
        name="semantic_store_annotations"),


    url(r'^import/?$',
        semantic_store.views.import_old_data,
        name="import_old_data"),
)
