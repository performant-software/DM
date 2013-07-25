from models import *
from django.contrib import admin


class ProjectPermissionAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'user', 'permission',)
    list_editable = ('permission',)
    list_filter = ('identifier', 'user', 'permission',)
admin.site.register(ProjectPermission, ProjectPermissionAdmin)

class TextAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'title', 'valid', 'timestamp',)
    list_editable = ('title', 'valid',)
    list_filter = ('valid',)
    search_fields = ('title', 'content',)
admin.site.register(Text, TextAdmin)