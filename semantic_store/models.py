from django.contrib.auth.models import User
from django.db import models

class ProjectPermission(models.Model):
    PERMISSION_CHOICES = (
        ('r', 'Read'),
        ('w', 'Write'),
        ('a', 'Administer')
    )

    identifier = models.CharField(max_length=2000, db_index=True)
    user = models.ForeignKey(User, db_index=True)
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES)

    class Meta:
        unique_together = ('user', 'identifier', 'permission')

class Text(models.Model):
    identifier = models.CharField(max_length=2000, db_index=True)
    title = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    content = models.TextField(blank=True, null=True)
    valid = models.BooleanField(default=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    last_user = models.ForeignKey(User)

    class Meta:
        index_together = (
            ('identifier', 'valid'),
        )
