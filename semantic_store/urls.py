from django.conf.urls import patterns, url
import semantic_store.views

urlpatterns = patterns('',
    url(r'^projects/(?P<project_uri>[^/]+)/annotations(?:/(?P<anno_uri>[^/]+))?/?$', 
        semantic_store.views.project_annotations, 
        name="semantic_store_project_annotations"),

    url(r'^projects/(?P<project_uri>[^/]+)/texts(?:/(?P<text_uri>[^/]+))/specific_resource/(?P<specific_resource>[^/]+)/?$', 
        semantic_store.views.text_specific_resource, 
        name="semantic_store_text_specific_resource"),

    url(r'^projects/(?P<project_uri>[^/]+)/texts(?:/(?P<text_uri>[^/]+))?/?$', 
        semantic_store.views.project_texts, 
        name="semantic_store_project_texts"),

    url(r'^projects/(?P<project_uri>[^/]+)/canvases/create/?$',
        semantic_store.views.CanvasUpload.as_view(),
        name="semantic_store_canvas_create"),
                       
    url(r'^projects/(?P<project_uri>[^/]+)/canvases(?:/(?P<canvas_uri>.+))/rename',
        semantic_store.views.rename_project_canvas,
        name="semantic_store_project_canvases_rename"),

    url(r'^projects/(?P<project_uri>[^/]+)/canvases(?:/(?P<canvas_uri>.+))/remove_triples$',
        semantic_store.views.remove_project_canvas_triples,
        name="semantic_store_project_canvases_remove_triples"),

    url(r'^projects/(?P<project_uri>[^/]+)/canvases(?:/(?P<canvas_uri>.+))/specific_resource/(?P<specific_resource>.+)?/?$',
        semantic_store.views.canvas_specific_resource,
        name="semantic_store_canvas_specific_resource"),

    url(r'^projects/(?P<project_uri>[^/]+)/canvases(?:/(?P<canvas_uri>.+))/transcription/(?P<transcription_uri>.+)?/?$',
        semantic_store.views.CanvasTranscription.as_view(),
        name="semantic_store_canvas_transcription"),

    url(r'^projects/(?P<project_uri>[^/]+)/canvases(?:/(?P<canvas_uri>.+))?/?$',
        semantic_store.views.project_canvases,
        name="semantic_store_project_canvases"),

    url(r'^projects/(?P<project_uri>[^/]+)/manuscripts(?:/(?P<manuscript_uri>.+))?/?$',
        semantic_store.views.Manuscript.as_view(),
        name="semantic_store_project_manuscripts"),

    url(r'^projects/(?P<uri>[^/]+)/resources(?:/(?P<resource_identifier>[^/]+))?/?$', 
        semantic_store.views.projects, 
        name="semantic_store_project_resources"),

    url(r'^projects(?:/(?P<uri>[^/]+))/remove_triples?/?$',
        semantic_store.views.remove_project_triples,
        name="semantic_store_projects_remove_triples"),
                       
    url(r'^projects(?:/(?P<uri>[^/]+))/removed?/?$',
        semantic_store.views.cleanup_removed_link,
        name="semantic_store_projects_cleanup_removed_link"),

    url(r'^projects(?:/(?P<uri>[^/]+))/cleanup?/?$',
        semantic_store.views.cleanup_project_orphans,
        name="semantic_store_projects_cleanup_orphans"),
                       
    url(r'^projects(?:/(?P<uri>[^/]+))/share?/?$',
        semantic_store.views.project_share,
        name="semantic_store_projects_project_share"),
   
    url(r'^projects(?:/(?P<project_uri>[^/]+))/download\.(?P<extension>[\w\d]+)$',
        semantic_store.views.ProjectDownload.as_view(),
        name="semantic_store_projects_download"),

    url(r'^projects(?:/(?P<project_uri>[^/]+))/search_autocomplete$',
        semantic_store.views.SearchAutocomplete.as_view(),
        name="semantic_store_search_autocomplete"),

    url(r'^projects(?:/(?P<project_uri>[^/]+))/search$',
        semantic_store.views.TextSearch.as_view(),
        name="semantic_store_text_search"),

    url(r'^projects(?:/(?P<uri>[^/]+)/)?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),

    url(r'^projects(?:/(?P<uri>[^/]+))?/?$', 
        semantic_store.views.projects,
        name="semantic_store_projects"),


    url(r'^users(?:/(?P<username>[^/]+))/remove_triples?/?$',
        semantic_store.views.remove_user_triples,
        name="semantic_store_user_remove_triples"),

    url(r'^users(?:/(?P<username>[^/]+)/)?/?$', 
        semantic_store.views.users,
        name="semantic_store_users_with_slash"),

    url(r'^users(?:/(?P<username>[^/]+))?/?$', 
        semantic_store.views.users,
        name="semantic_store_users"),
    

    url(r'^annotations(?:/(?P<anno_uri>[^/]+))?/?$', 
        semantic_store.views.annotations, 
        name="semantic_store_annotations"),
                       
)
