from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authentification JWT lue depuis un cookie HttpOnly au lieu du header Authorization.
    Anti-XSS : le JavaScript ne peut pas lire ce cookie.
    Fallback vers le header Authorization pour le DRF Browsable API (dev uniquement).
    """

    def authenticate(self, request):
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access')
        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            # Fallback: essaie le header Authorization (utile pour tester avec DRF Browsable API)
            return super().authenticate(request)

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
