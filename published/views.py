from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.conf import settings
from django.http import (
    HttpResponse,
    HttpResponseNotFound
)


def public_project(request, key):
    print "Public project %s" % key
    if request.method != 'GET':
        return HttpResponseNotAllowed(('GET'))
    
    try:
        uname = "guest_%s" % key
        user = authenticate(username=uname, password="pass")
        if user is not None:
            login(request, user)
            return redirect("/")
    
    except ObjectDoesNotExist:
        return HttpResponseNotFound()
    