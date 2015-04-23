"""
Django settings for slhweb project.

For more information on this file, see
https://docs.djangoproject.com/en/1.7/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.7/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
from __future__ import absolute_import
import os
from .secret import *
from django.utils.translation import ugettext_lazy as _
from celery.schedules import crontab
BASE_DIR = os.path.dirname(os.path.dirname(__file__))


# Celery settings
BROKER_URL = 'amqp://slh:CESY6FnTDpOuzaYAfRz9NfcR@localhost/web_vhost'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'amqp'
CELERY_TASK_RESULT_EXPIRES = 18000

CELERYBEAT_SCHEDULE = {
    'Auto renew every day at 8 am': {
        'task': 'account.tasks.auto_renew',
        'schedule': crontab(minute=0, hour=8),
    },
}

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.7/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '@6-(ar-1i@mq1e9z2qd%hqhk%p+#nhiumho218c%&(y12-3yqa'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

TEMPLATE_DEBUG = True

ALLOWED_HOSTS = ['localhost']


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'crispy_forms',
    'account',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'slhweb.urls'

WSGI_APPLICATION = 'slhweb.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.7/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Internationalization
# https://docs.djangoproject.com/en/1.7/topics/i18n/

LANGUAGE_CODE = 'en'

TIME_ZONE = 'Asia/Hong_Kong'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/

STATIC_URL = '/static/'

STATIC_ROOT = os.path.join(BASE_DIR, 'static')

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "src"),
    os.path.join(BASE_DIR, 'bower_components'),
)

TEMPLATE_DIRS = (
    os.path.join(BASE_DIR, 'templates'),
)

LOCALE_PATHS = (
    os.path.join(BASE_DIR, 'locale/'),
)

LANGUAGES = (
    ('zh-hant', _('Traditional Chinese')),
    ('en', _('English')),
)

LANGUAGES_IN_LIST = [lang[0] for lang in LANGUAGES]

CRISPY_TEMPLATE_PACK = 'bootstrap3'