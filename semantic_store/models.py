import datetime
from django.db import models


class Url(models.Model):
    url = models.URLField(max_length=2000)
    fetched = models.DateTimeField(auto_now=True)


# class NamespaceBinding(models.Model):
#     prefix = models.CharField(max_length=20, primary_key=True)
#     uri = models.TextField(db_index=True)
    
#     class Meta:
#         managed = False
#         db_table = "%s_namespace_binds" % graph.store._internedId
