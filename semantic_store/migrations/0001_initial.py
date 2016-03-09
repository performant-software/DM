# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'LockedResource'
        db.create_table(u'semantic_store_lockedresource', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('identifier', self.gf('django.db.models.fields.CharField')(max_length=80, db_index=True)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('locked_on', self.gf('django.db.models.fields.DateField')()),
        ))
        db.send_create_signal(u'semantic_store', ['LockedResource'])

        # Adding model 'PublicProject'
        db.create_table(u'semantic_store_publicproject', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('identifier', self.gf('django.db.models.fields.CharField')(max_length=80, db_index=True)),
            ('key', self.gf('django.db.models.fields.CharField')(max_length=20)),
        ))
        db.send_create_signal(u'semantic_store', ['PublicProject'])

        # Adding model 'ProjectPermission'
        db.create_table(u'semantic_store_projectpermission', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('identifier', self.gf('django.db.models.fields.CharField')(max_length=80, db_index=True)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('permission', self.gf('django.db.models.fields.CharField')(max_length=10)),
        ))
        db.send_create_signal(u'semantic_store', ['ProjectPermission'])

        # Adding unique constraint on 'ProjectPermission', fields ['user', 'identifier', 'permission']
        db.create_unique(u'semantic_store_projectpermission', ['user_id', 'identifier', 'permission'])

        # Adding index on 'ProjectPermission', fields ['user', 'identifier', 'permission']
        db.create_index(u'semantic_store_projectpermission', ['user_id', 'identifier', 'permission'])

        # Adding model 'Text'
        db.create_table(u'semantic_store_text', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('identifier', self.gf('django.db.models.fields.CharField')(max_length=80, db_index=True)),
            ('project', self.gf('django.db.models.fields.CharField')(max_length=80, null=True)),
            ('title', self.gf('django.db.models.fields.CharField')(db_index=True, max_length=200, null=True, blank=True)),
            ('content', self.gf('django.db.models.fields.TextField')(default='', null=True, blank=True)),
            ('valid', self.gf('django.db.models.fields.BooleanField')(default=True, db_index=True)),
            ('timestamp', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('last_user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
        ))
        db.send_create_signal(u'semantic_store', ['Text'])

        # Adding index on 'Text', fields ['identifier', 'valid']
        db.create_index(u'semantic_store_text', ['identifier', 'valid'])

        # Adding model 'UploadedImage'
        db.create_table(u'semantic_store_uploadedimage', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('imagefile', self.gf('django.db.models.fields.files.ImageField')(max_length=100)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('isPublic', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal(u'semantic_store', ['UploadedImage'])


    def backwards(self, orm):
        # Removing index on 'Text', fields ['identifier', 'valid']
        db.delete_index(u'semantic_store_text', ['identifier', 'valid'])

        # Removing index on 'ProjectPermission', fields ['user', 'identifier', 'permission']
        db.delete_index(u'semantic_store_projectpermission', ['user_id', 'identifier', 'permission'])

        # Removing unique constraint on 'ProjectPermission', fields ['user', 'identifier', 'permission']
        db.delete_unique(u'semantic_store_projectpermission', ['user_id', 'identifier', 'permission'])

        # Deleting model 'LockedResource'
        db.delete_table(u'semantic_store_lockedresource')

        # Deleting model 'PublicProject'
        db.delete_table(u'semantic_store_publicproject')

        # Deleting model 'ProjectPermission'
        db.delete_table(u'semantic_store_projectpermission')

        # Deleting model 'Text'
        db.delete_table(u'semantic_store_text')

        # Deleting model 'UploadedImage'
        db.delete_table(u'semantic_store_uploadedimage')


    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'content_type__app_label', u'content_type__model', u'codename')", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        u'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'semantic_store.lockedresource': {
            'Meta': {'object_name': 'LockedResource'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.CharField', [], {'max_length': '80', 'db_index': 'True'}),
            'locked_on': ('django.db.models.fields.DateField', [], {}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        },
        u'semantic_store.projectpermission': {
            'Meta': {'unique_together': "(('user', 'identifier', 'permission'),)", 'object_name': 'ProjectPermission', 'index_together': "(('user', 'identifier', 'permission'),)"},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.CharField', [], {'max_length': '80', 'db_index': 'True'}),
            'permission': ('django.db.models.fields.CharField', [], {'max_length': '10'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        },
        u'semantic_store.publicproject': {
            'Meta': {'object_name': 'PublicProject'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.CharField', [], {'max_length': '80', 'db_index': 'True'}),
            'key': ('django.db.models.fields.CharField', [], {'max_length': '20'})
        },
        u'semantic_store.text': {
            'Meta': {'object_name': 'Text', 'index_together': "(('identifier', 'valid'),)"},
            'content': ('django.db.models.fields.TextField', [], {'default': "''", 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.CharField', [], {'max_length': '80', 'db_index': 'True'}),
            'last_user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'project': ('django.db.models.fields.CharField', [], {'max_length': '80', 'null': 'True'}),
            'timestamp': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'db_index': 'True', 'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'valid': ('django.db.models.fields.BooleanField', [], {'default': 'True', 'db_index': 'True'})
        },
        u'semantic_store.uploadedimage': {
            'Meta': {'object_name': 'UploadedImage'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'imagefile': ('django.db.models.fields.files.ImageField', [], {'max_length': '100'}),
            'isPublic': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        }
    }

    complete_apps = ['semantic_store']