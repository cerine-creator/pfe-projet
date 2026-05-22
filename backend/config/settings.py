import os
from pathlib import Path
from datetime import timedelta
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-=l$%45w-u$_!n-gshpui8tio2@hfi%5)f$^jd5wy&m_+1j1+o4')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ─── Applications ─────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Project apps
    'accounts',
    'conges',
]

# ─── Custom User Model ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.CustomUser'

# ─── Middleware ────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── Database ──────────────────────────────────────────────────────────────────

DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600
    )
}

# ─── Password Validation ───────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalization ──────────────────────────────────────────────────────

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

# ─── Static and Media Files (Django 4.2+) ─────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
    'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
}

# Dummy variable required by django-cloudinary-storage package which hasn't updated to Django 5.1+ STORAGES API
STATICFILES_STORAGE = 'whitenoise.storage.StaticFilesStorage'

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.StaticFilesStorage",
    },
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
cors_origins_str = os.environ.get(
    'DJANGO_CORS_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173'
)
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',')]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ─── Django REST Framework ────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'accounts.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/day',
        'user': '10000/day',
        'login': '30/minute',
    },
}

# ─── JWT Configuration ────────────────────────────────────────────────────────

SIMPLE_JWT = {
    'AUTH_COOKIE': 'access',
    'REFRESH_COOKIE': 'refresh',
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=24),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'UPDATE_LAST_LOGIN': True,
}

WHITENOISE_MIMETYPES = {
    '.svg': 'image/svg+xml'
}