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
        'OPTIONS': {
            'autocommit': True
        }
    },
}

RDFLIB_DB_URI = 'mysql://username:password@hostname:port/database-name?other-parameter'
RDFLIB_DB_URI = 'sqlite:////absolute/path/to/foo.db'
RDFLIB_DB_URI = 'postgresql+psycopg2://user:pasword@hostname:port/database'

# Include vales for these URIS to use 4store as the triple store, rather than the rdflib sqlalchemy
# connector with the default database. (4store is far more space efficient).
FOUR_STORE_URIS = {
    'SPARQL': 'http://localhost:port/sparql/',
    'UPDATE': 'http://localhost:port/update/',
}

sys.path.insert(0, '/Users/shannon/python_lib/dm/')

#DIRNAME = os.path.dirname(__file__)
DIRNAME = '/Users/shannon/python_lib/dm/'
sys.path.append(DIRNAME)

BASE_URL = "/"

MEDIA_ROOT = os.path.join(DIRNAME, 'media/')

MEDIA_URL = BASE_URL + 'media/'

STATIC_ROOT = os.path.join(DIRNAME, 'static')

# This must be an absolute url
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

STORE_HOST = 'localhost:8081' #Could also be something like 'dm.drew.edu/beta' for subsite urls

LOGIN_REDIRECT_URL = '/'

# uncomment if you decide to use francescortiz
#IMAGE_DEFAULT_FORMAT='JPEG'
#IMAGE_DEFAULT_QUALITY=100

HAYSTACK_CONNECTIONS = {
    'default': {
        'ENGINE': 'haystack.backends.simple_backend.SimpleEngine',
        'INCLUDE_SPELLING': True
    },
}


