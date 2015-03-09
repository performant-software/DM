from django.conf.urls import patterns, url
import accounts.views

urlpatterns = patterns(
    '',
    url(r'^login/$', 
        accounts.views.sign_in,
        name="accounts_sign_in"),
    url(r'^create/$', accounts.views.create_user, name="accounts_create"),
    url(r'^logout/$', 
        accounts.views.sign_out,
        name="accounts_sign_out"),
    )
