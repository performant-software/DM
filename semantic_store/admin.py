from models import *
from django.contrib import admin


class ProjectPermissionAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'user', 'permission',)
    list_editable = ('permission',)
    list_filter = ('identifier', 'user', 'permission',)
    search_fields = ('identifier', 'user')
admin.site.register(ProjectPermission, ProjectPermissionAdmin)

class TextAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'title', 'valid', 'timestamp', 'last_user')
    list_editable = ('title', 'valid',)
    list_filter = ('valid',)
    search_fields = ('title', 'content',)
    date_hierarchy = 'timestamp'
admin.site.register(Text, TextAdmin)

class UploadedImageAdmin(admin.ModelAdmin):
    list_display = ('imagefile', 'owner', 'isPublic')
    list_display_links = ('imagefile',)
    list_editable = ('owner', 'isPublic')
    list_filter = ('owner', 'isPublic')
admin.site.register(UploadedImage, UploadedImageAdmin)