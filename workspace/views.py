from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse

from semantic_store.forms import ImageForm, PublicImageForm
from semantic_store.models import UploadedImage

@login_required
def workspace(request):
    context = RequestContext(request, {
        'use_compiled_js': settings.USE_COMPILED_JS,
        'script_name': request.META['SCRIPT_NAME']
    })    
    return render_to_response("fluid_workspace/workspace.html", context_instance=context)

# View for uploading images
# TODO: Allow previously-uploaded images to be added to any of the user's projects
# TODO: Fold into a module 
def upload_image_view(request):
    if request.method=='POST':
        form = ImageForm(request.POST, request.FILES)
        if form.is_valid():
            u= User.objects.get(username=request.user)
        
            form = PublicImageForm(request.POST, request.FILES)
            if form.is_valid():
                newdoc = UploadedImage(imagefile = request.FILES['imagefile'], owner=u, isPublic=True)
            else:
                newdoc = UploadedImage(imagefile = request.FILES['imagefile'], owner=u, )
        
            newdoc.save()
            return HttpResponseRedirect(reverse('workspace.views.upload_image_view'))
    else:
        form=ImageForm()
        
    my_images = UploadedImage.objects.filter(owner=User.objects.get(username=request.user))
    pub_images = UploadedImage.objects.filter(isPublic=True)
    
    return render_to_response(
    'uploader.html',
    {'my_images': my_images, 'form': form, 'pub_images': pub_images},
    context_instance=RequestContext(request))

def add_image(request):
    my_images = UploadedImage.objects.filter(owner=User.objects.get(username=request.user))
    pub_images = UploadedImage.objects.filter(isPublic=True)
    return render_to_response(
    'add_image.html',
    {'my_images': my_images, 'pub_images': pub_images},
    context_instance=RequestContext(request))