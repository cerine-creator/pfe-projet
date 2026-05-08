from django.urls import path
from .views import LoginView, LogoutView, WhoAmIView, TokenRefreshCookieView, RegisterView, HeartbeatView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', WhoAmIView.as_view(), name='auth-me'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='auth-token-refresh'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('heartbeat/', HeartbeatView.as_view(), name='auth-heartbeat'),
]
