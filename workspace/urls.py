from django.conf.urls import patterns, include, url
import semantic_store.views

urlpatterns = patterns('',
    url(r"^project_forward/$", "semantic_store.views.projects"),
    url(r"^$", 'workspace.views.workspace', name='workspace'),

)
