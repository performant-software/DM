from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.conf import settings

@login_required
def workspace(request):
    context = RequestContext(request, {
        'use_compiled_js': settings.USE_COMPILED_JS,
        'script_name': settings.FORCE_SCRIPT_NAME
    })    
    return render_to_response("fluid_workspace/workspace.html", context_instance=context)