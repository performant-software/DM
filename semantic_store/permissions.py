from semantic_store.models import ProjectPermission
from semantic_store.namespaces import NS, ns
from django.db import transaction, IntegrityError
from django.contrib.auth.models import User

PERMISSION_PREDICATES = (
    NS.perm.hasPermissionOver,
    NS.perm.mayRead,
    NS.perm.mayUpdate,
    NS.perm.mayDelete,
    NS.perm.mayAugment,
    NS.perm.mayAdminister
)

PERMISSION_URIS_BY_MODEL_VALUE = {
    'r': NS.perm.mayRead,
    'w': NS.perm.mayUpdate,
    'a': NS.perm.mayAdminister
}

PERMISSION_MODEL_VALUES_BY_URI = dict(zip(PERMISSION_URIS_BY_MODEL_VALUE.values(), PERMISSION_URIS_BY_MODEL_VALUE.keys()))

def grant_permission_by_uri(uri, project_uri, username=None, user=None):
    try:
        model_perm = PERMISSION_MODEL_VALUES_BY_URI[uri]
    except KeyError:
        pass
    else:
        grant_permission_by_model_code(model_perm, project_uri, username, user)

def grant_permission_by_model_code(model_perm, project_uri, username=None, user=None):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    if ProjectPermission.objects.filter(user=user, identifier=project_uri, permission=model_perm).count() == 0:
        ProjectPermission.objects.create(user=user, identifier=project_uri, permission=model_perm)

def grant_read_permissions(project_uri, username=None, user=None):
    grant_permission_by_model_code('r', project_uri, username, user)

def grant_write_permissions(project_uri, username=None, user=None):
    grant_permission_by_model_code('w', project_uri, username, user)

def grant_admin_permissions(project_uri, username=None, user=None):
    grant_permission_by_model_code('a', project_uri, username, user)

def grant_full_project_permissions(username, project_uri):
    user = User.objects.get(username=username)

    grant_read_permissions(project_uri, user=user)
    grant_write_permissions(project_uri, user=user)
    grant_admin_permissions(project_uri, user=user)

def revoke_permission_by_uri(uri, project_uri, username=None, user=None):
    try:
        model_perm = PERMISSION_MODEL_VALUES_BY_URI[uri]
    except KeyError:
        pass
    else:
        revoke_permission_by_model_code(model_perm, project_uri, username, user)

def revoke_permission_by_model_code(model_perm, project_uri, username=None, user=None):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    ProjectPermission.objects.filter(user=user, identifier=project_uri, permission=model_perm).delete()

def revoke_all_permissions(project_uri, username=None, user=None):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    ProjectPermission.objects.filter(user=user, identifier=project_uri).delete()

def has_permission_over(project_uri, username=None, user=None, permission=NS.perm.hasPermissionOver):
    if user is None:
        user = User.objects.get(username=username)
    if username is None:
        username = user.username

    if permission == NS.perm.hasPermissionOver:
        return ProjectPermission.objects.filter(user=user, identifier=project_uri).count() > 0
    else:
        try:
            perm_model_value = PERMISSION_MODEL_VALUES_BY_URI[permission]
        except KeyError:
            return False
        else:
            return ProjectPermission.objects.filter(user=user, identifier=project_uri, permission=perm_model_value).count() > 0

def is_abandoned_project(project_uri):
    """Returns true if no users have any permissions over the project"""
    return ProjectPermission.objects.filter(identifier=project_uri).count() == 0

def is_unowned_project(project_uri):
    """Returns true if no users are administrators of the project"""
    return ProjectPermission.objects.filter(identifier=project_uri, permission='a') == 0

