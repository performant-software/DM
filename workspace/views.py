from django.http import HttpResponse
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.contrib.auth.models import User
from json import dumps
from semantic_store.views import projects

@login_required
def workspace(request):
    context = RequestContext(request,
                             {'use_compiled_js': settings.USE_COMPILED_JS})    
#    return render_to_response("workspace/workspace.html", context_instance=context)

    # Creates a list of usernames that can be understood by JS
    # Requires json.dumps to send to html file
    users = []
    for u in User.objects.filter():
        users.append(u.username)

    return render_to_response("fluid_workspace/workspace.html", 
                              {'js_users':dumps(users),}, 
                              context_instance=context, )

def prints(request):
    projects(request)
    return HttpResponse("Success")
