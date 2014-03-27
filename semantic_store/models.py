from django.contrib.auth.models import User
from django.db import models

from bs4 import BeautifulSoup

from settings import IMAGE_UPLOAD_LOCATION

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
        index_together = (
            ('user', 'identifier', 'permission'), # since DM constantly checks this to see if a user has proper permissions
        )

    def __unicode__(self):
        return 'User %s may %s project %s' % (self.user, self.get_permission_display().lower(), self.identifier)

class Text(models.Model):
    identifier = models.CharField(max_length=2000, db_index=True)
    project = models.CharField(max_length=2000, null=True)
    title = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    content = models.TextField(blank=True, null=True, default=lambda:'')
    valid = models.BooleanField(default=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    last_user = models.ForeignKey(User)

    class Meta:
        index_together = (
            ('identifier', 'valid'),
        )

    def __unicode__(self):
        return '"%s", uri:"%s" (%s %s by %s)' % (
            self.title,
            self.identifier,
            self.timestamp,
            ('valid' if self.valid else 'invalid'), self.last_user
        )

    def plain_content(self):
        soup = BeautifulSoup(self.content)

        return ' '.join(soup.body.stripped_strings)

class UploadedImage(models.Model):
    # TODO: Make custom image names  <http://stackoverflow.com/questions/15140942/django-imagefield-change-file-name-on-upload>
    imagefile=models.ImageField(upload_to=IMAGE_UPLOAD_LOCATION.rstrip('/'))
    owner=models.ForeignKey(User)
    isPublic=models.BooleanField(default=False)

    def __str__(self):
        return self.imagefile.name[len(IMAGE_UPLOAD_LOCATION):]

