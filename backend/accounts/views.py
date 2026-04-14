from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings

from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .permissions import IsHRStaffOrAdmin


class LoginView(APIView):
    """
    POST /api/auth/login/
    Vérifie les identifiants et positionne deux cookies HttpOnly :
    - access  : durée de vie courte (8h)
    - refresh : durée de vie longue (7j), pour renouveler l'access

    Throttling : 5 tentatives par minute (anti brute-force).
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        response = Response({
            'message': 'Connexion réussie.',
            'user': UserSerializer(user).data,
        })

        jwt_settings = settings.SIMPLE_JWT
        is_secure = not settings.DEBUG  # HTTPS seulement en production

        # Cookie access token (courte durée)
        response.set_cookie(
            key=jwt_settings['AUTH_COOKIE'],
            value=str(refresh.access_token),
            max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )

        # Cookie refresh token (longue durée)
        response.set_cookie(
            key=jwt_settings['REFRESH_COOKIE'],
            value=str(refresh),
            max_age=int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/api/auth/token/refresh/',
        )

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Supprime les deux cookies — le JWT devient inaccessible immédiatement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({'message': 'Déconnexion réussie.'})
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie(settings.SIMPLE_JWT['REFRESH_COOKIE'])
        return response


class WhoAmIView(APIView):
    """
    GET /api/auth/me/
    Retourne le profil de l'utilisateur courant via son cookie.
    Le frontend appelle cet endpoint au chargement de l'app pour
    restaurer la session sans stocker le rôle dans localStorage.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TokenRefreshCookieView(APIView):
    """
    POST /api/auth/token/refresh/
    Lit le refresh token depuis le cookie et retourne un nouvel access token
    en cookie. Le frontend n'a jamais accès aux tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['REFRESH_COOKIE'])

        if not refresh_token:
            return Response({'detail': 'Refresh token manquant.'}, status=401)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
        except TokenError:
            return Response({'detail': 'Token de rafraîchissement invalide ou expiré.'}, status=401)

        response = Response({'message': 'Token rafraîchi.'})
        jwt_settings = settings.SIMPLE_JWT

        response.set_cookie(
            key=jwt_settings['AUTH_COOKIE'],
            value=new_access,
            max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            path='/',
        )
        return response


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Création d'un nouvel utilisateur. Réservé aux administrateurs système.
    """
    permission_classes = [IsAuthenticated, IsHRStaffOrAdmin]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Utilisateur créé.', 'user': UserSerializer(user).data},
            status=201,
        )
