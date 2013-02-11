from django.conf.urls.defaults import patterns, include, url
import accounts.views

urlpatterns = patterns(
    '',
    url(r'^projects(?:/(?P<identifier>.+))?/?$', 
        accounts.views.manage_project, 
        name="accounts_manage_project"),
    url(r'^login/$', 
        accounts.views.sign_in,
        name="accounts_sign_in"),
    url(r'^logout/$', 
        accounts.views.sign_out,
        name="accounts_sign_out"),
    )
