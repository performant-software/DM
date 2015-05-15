"""
Lock management
"""
from semantic_store.models import LockedResource
from django.core.exceptions import ObjectDoesNotExist
from datetime import datetime
from semantic_store.utils import JsonResponse
from django.http import HttpResponse

import logging
logger = logging.getLogger(__name__)

def is_locked( uri ):
    """
    Check if the resources is currenty locked. Return a JSON 
    object with details
    """
    try:
        lock = LockedResource.objects.get(identifier=uri)
        resp = {'locked': True,  'user': lock.user.username, 'email': lock.user.email, 'date': str(lock.locked_on) }
        return JsonResponse(resp)
    except ObjectDoesNotExist:
        resp = {'locked': False}
        return JsonResponse(resp)
    
    
def lock(uri, user):
    """ Lock a resource for edit """
    try:
        lock = LockedResource.objects.get(identifier=uri)
        err =  "Resource is currently locked by %s" % lock.user
        return HttpResponse(status=409, content=err)
    except ObjectDoesNotExist:
        LockedResource.objects.create(identifier=uri, locked_on=datetime.now(), user=user)
        return HttpResponse(status=200)

def unlock(uri, user):
    """ Unlock the resource """
    try:
        if uri:
            print "Unlock resources %s from %s" % (uri,user.username)
            lock = LockedResource.objects.get(identifier=uri)
            lock.delete()
            return HttpResponse(status=200)
        else:
            print "Unlock all resources from %s" % user.username
            LockedResource.objects.filter(user=user).delete()
            return HttpResponse(status=200)
    except ObjectDoesNotExist:
        # if resource wasn't found this means it wasn't locked
        # to begin with. Say all is well.
        return HttpResponse(status=200)
    