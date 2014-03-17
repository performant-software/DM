from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
    url(r"^project_forward/$", "semantic_store.views.projects"),
    url(r"^$", 'workspace.views.workspace', name='workspace'),

    url(r'^add_image/$', "workspace.views.add_image", name="add_image"),
    url(r'^upload_image/$', "workspace.views.upload_image_view", name="upload_image"),

)
