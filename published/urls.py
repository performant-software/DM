from django.conf.urls import patterns, url
import published.views

urlpatterns = patterns('',
    url(r'^key/(?P<key>[^/]+)?/?$', 
         published.views.public_project, 
         name="published_public_project")
                       
)

