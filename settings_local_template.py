import os
import sys


DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
#        'NAME': 'dm',
        'NAME': 'dm_test',
        'USER': 'dm_user',
        'PASSWORD': 'dm_user_password',
        'HOST': 'localhost',             # Set to empty string for localhost.
        'PORT': '',                      # Set to empty string for default.
    },
}

sys.path.insert(0, '/Users/shannon/python_lib/dm/')

#DIRNAME = os.path.dirname(__file__)
DIRNAME = '/Users/shannon/python_lib/dm/'
sys.path.append(DIRNAME)

BASE_URL = "/"

MEDIA_ROOT = os.path.join(DIRNAME, 'media/')

MEDIA_URL = BASE_URL + 'media/'

STATIC_ROOT = os.path.join(DIRNAME, 'static')

STATIC_URL = BASE_URL + 'static/'

# uncomment if you decide to use francescortiz/image
#IMAGE_CACHE_ROOT = os.path.join(DIRNAME, 'image_cache')

# Additional locations of static files
STATICFILES_DIRS = (
)

TEMPLATE_DIRS = (
    os.path.join(DIRNAME, 'templates'),
)

ADMINS = (
    ('Shannon Bradshaw', 'shannon.bradshaw@gmail.com'),
)

MANAGERS = ADMINS

SITE_ID = 1

SITE_ATTRIBUTES = {
    'hostname': 'localhost:8000'
}

# uncomment if you decide to use francescortiz
#IMAGE_DEFAULT_FORMAT='JPEG'
#IMAGE_DEFAULT_QUALITY=100


