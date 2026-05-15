from django.utils import timezone
from datetime import timedelta
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

        # Vérification de session active avec Heartbeat
        # On autorise la connexion si is_logged_in est True MAIS que l'activité date de plus de 60 secondes
        if user.is_logged_in:
            now = timezone.now()
            # Si last_activity est défini et qu'il date de moins de 60 secondes, on bloque
            if user.last_activity and (now - user.last_activity) < timedelta(seconds=60):
                return Response({
                    'detail': f"Session déjà active : Le compte {user.username} est actuellement utilisé sur un autre appareil ou navigateur. Veuillez fermer l'autre session pour continuer."
                }, status=403)
            # Sinon (activité trop vieille), on considère que la session est orpheline, on laisse passer
        
        # Marquer comme connecté et initialiser last_activity
        user.is_logged_in = True
        user.last_activity = timezone.now()
        user.save(update_fields=['is_logged_in', 'last_activity'])

        refresh = RefreshToken.for_user(user)

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Stratégie double :
        # - body : access + refresh pour le tokenStore en mémoire (frontend cross-origin)
        # - cookies HttpOnly : fallback pour les clients same-origin (anti-XSS natif)
        response = Response({
            'message': 'Connexion réussie.',
            'user': UserSerializer(user).data,
            'access': access_token,
            'refresh': refresh_token,
        })

        jwt_settings = settings.SIMPLE_JWT
        is_secure = not settings.DEBUG  # HTTPS seulement en production

        # Cookie access token (courte durée) — fallback pour les clients same-origin
        response.set_cookie(
            key=jwt_settings['AUTH_COOKIE'],
            value=access_token,
            max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )

        # Cookie refresh token (longue durée)
        response.set_cookie(
            key=jwt_settings['REFRESH_COOKIE'],
            value=refresh_token,
            max_age=int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Supprime les deux cookies — le JWT devient inaccessible immédiatement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Marquer comme déconnecté
        user = request.user
        user.is_logged_in = False
        user.save(update_fields=['is_logged_in'])

        response = Response({'message': 'Déconnexion réussie.'})
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie(settings.SIMPLE_JWT['REFRESH_COOKIE'])
        return response


class HeartbeatView(APIView):
    """
    Endpoint pour maintenir la session active (Heartbeat).
    Met à jour last_activity toutes les 30 secondes côté frontend.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.last_activity = timezone.now()
        user.is_logged_in = True  # Sécurité supplémentaire
        user.save(update_fields=['last_activity', 'is_logged_in'])
        return Response({'status': 'active'})


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
    Lit le refresh token depuis le cookie OU le body JSON et retourne
    un nouvel access token dans le body ET en cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Priorité : body JSON > cookie (pour les clients cross-origin)
        refresh_token = (
            request.data.get('refresh')
            or request.COOKIES.get(settings.SIMPLE_JWT['REFRESH_COOKIE'])
        )

        if not refresh_token:
            return Response({'detail': 'Refresh token manquant.'}, status=401)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
            new_refresh = str(token)  # ROTATE_REFRESH_TOKENS=True génère un nouveau refresh
        except TokenError:
            return Response({'detail': 'Token de rafraîchissement invalide ou expiré.'}, status=401)

        response = Response({'access': new_access, 'refresh': new_refresh})
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
