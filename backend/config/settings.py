from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-=l$%45w-u$_!n-gshpui8tio2@hfi%5)f$^jd5wy&m_+1j1+o4'

DEBUG = True

ALLOWED_HOSTS = []

# ─── Applications ─────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Project apps
    'accounts',   # Auth & CustomUser — doit être avant conges
    'conges',     # Logique métier RH
]

# ─── Custom User Model ─────────────────────────────────────────────────────────
# Remplace l'utilisateur Django par défaut par notre CustomUser.
# DOIT être défini AVANT la première migration.
AUTH_USER_MODEL = 'accounts.CustomUser'

# ─── Middleware ────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # En premier pour gérer le CORS
    'django.middleware.security.SecurityMiddleware',
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
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
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

STATIC_URL = 'static/'

# ─── CORS ─────────────────────────────────────────────────────────────────────
# CORS_ALLOW_CREDENTIALS = True est OBLIGATOIRE pour que le navigateur
# envoie les cookies HttpOnly avec chaque requête cross-origin.

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

# Autorise le header Authorization (Bearer token) depuis le frontend cross-origin
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
        # Notre classe qui lit le JWT depuis le cookie HttpOnly
        'accounts.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Gestionnaire d'exceptions personnalisé — aucune stack trace vers le client
    'EXCEPTION_HANDLER': 'accounts.exceptions.custom_exception_handler',
    # Pagination par défaut
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Throttling global — protection anti-brute-force
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/day',      # Très large pour le dev
        'user': '10000/day',
        'login': '30/minute',    # Plus souple pour les tests
    },
}

# ─── JWT Configuration ────────────────────────────────────────────────────────

SIMPLE_JWT = {
    # Noms des cookies HttpOnly
    'AUTH_COOKIE': 'access',
    'REFRESH_COOKIE': 'refresh',
    # Durées de vie des tokens
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,      # Génère un nouveau refresh à chaque usage
    'BLACKLIST_AFTER_ROTATION': False,  # Pas de blacklist pour l'instant (SQLite)
    # Algorithme de signature
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    # Claims ajoutés au token
    'UPDATE_LAST_LOGIN': True,
}

# ─── Media Files (Justificatifs) ──────────────────────────────────────────────

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
