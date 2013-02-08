# Django settings for imsage project.

from settings_local import *

# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
TIME_ZONE = None

LANGUAGE_CODE = 'en-us'

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Make this unique, and don't share it with anybody.
SECRET_KEY = '9^8+n@e+y-*#dklu^++qp$-jo@!)2_q-$r6)3l&=w59ps@e7s$'

TEMPLATE_DEBUG = DEBUG
USE_COMPILED_JS = False

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
#    'south',
    'semantic_store',
    'accounts',
    'workspace',
#    'fts',
#    'django_rdflib',
#    'rdflib_postgresql',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)


# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.contrib.auth.context_processors.auth',
    'django.contrib.messages.context_processors.messages',
    'django.core.context_processors.request',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

RDFLIB_STORE_IDENTIFIER = 'rdfstore'
RDFLIB_STORE_GRAPH_URI = 'http://dm.drew.edu/rdfstore'

#FTS_BACKEND = 'pgsql://' # or 'simple://' # or 'dummy://' 
#FTS_CONFIGURE_ALL_BACKENDS = False
#DATABASE_ENGINE = 'postgresql_psycopg2'

LOGIN_REDIRECT_URL = '/'

ROOT_URLCONF = 'urls'

SOUTH_TESTS_MIGRATE = False
                
# from django.contrib.auth.models import User
# user = User.objects.create_user('sbradshaw', 'shannon.bradshaw@gmail.com', 
#                                 'shannon')
# user.is_staff = True
# user.save()


