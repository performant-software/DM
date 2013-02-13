import datetime
from django.contrib.auth.models import User
from django.db import models
from permissions import Permission

# class Url(models.Model):
#     url = models.URLField(max_length=2000)
#     fetched = models.DateTimeField(auto_now=True)

class ProjectPermission(models.Model):
    identifier = models.CharField(max_length=2000)
    user = models.ForeignKey(User)
    permission = models.CharField(max_length=64, choices=Permission.choices)

class Text(models.Model):
    identifier = models.CharField(max_length=2000)
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    valid = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)


# class NamespaceBinding(models.Model):
#     prefix = models.CharField(max_length=20, primary_key=True)
#     uri = models.TextField(db_index=True)
    
#     class Meta:
#         managed = False
#         db_table = "%s_namespace_binds" % graph.store._internedId
