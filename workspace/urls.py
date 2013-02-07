from django.conf.urls.defaults import patterns, include, url
import workspace.views

urlpatterns = patterns(
    '',
    url(r"^$", 'workspace.views.workspace', name='workspace'),
    )
