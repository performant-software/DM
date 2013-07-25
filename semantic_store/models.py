from django.contrib.auth.models import User
from django.db import models
from permissions import Permission

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

class UserState(models.Model):
    user = models.ForeignKey(User)
    current_project = models.CharField(max_length=2000)
