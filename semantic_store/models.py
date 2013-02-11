import datetime
from django.contrib.auth.models import User
from django.db import models
from permissions import Permissions


class Url(models.Model):
    url = models.URLField(max_length=2000)
    fetched = models.DateTimeField(auto_now=True)


class ProjectPermissions(models.Model):
    uri = models.URLField(max_length=2000)
    user = models.ForeignKey(User)
    permissions = models.CharField(max_length=64, choices=Permissions.choices)

# class NamespaceBinding(models.Model):
#     prefix = models.CharField(max_length=20, primary_key=True)
#     uri = models.TextField(db_index=True)
    
#     class Meta:
#         managed = False
#         db_table = "%s_namespace_binds" % graph.store._internedId
