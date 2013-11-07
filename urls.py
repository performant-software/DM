# project urls module

from django.conf.urls import patterns, url, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponseRedirect
import workspace
import accounts
import semantic_store

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^workspace/', include(workspace.urls)),
    url(r'^accounts/', include(accounts.urls)),
    url(r'^store/', include(semantic_store.urls)),
    url(r'^$', lambda request: HttpResponseRedirect('/workspace/'))
) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

