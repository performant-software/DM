import datetime
from django.db import models
from semantic_store import graph


class NamespaceBinding(models.Model):
    prefix = models.CharField(max_length=20, primary_key=True)
    uri = models.TextField(db_index=True)
    
    class Meta:
        managed = False
        db_table = "%s_namespace_binds" % graph.store._internedId
