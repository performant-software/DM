from django.contrib.auth.models import User
from django.db import models
from permissions import Permission

class ProjectPermission(models.Model):
    identifier = models.CharField(max_length=2000)
    user = models.ForeignKey(User)
    permission = models.CharField(max_length=64, choices=Permission.choices)

class Text(models.Model):
    identifier = models.CharField(max_length=2000, db_index=True)
    title = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    content = models.TextField(blank=True, null=True)
    valid = models.BooleanField(default=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    last_user = models.ForeignKey(User)
