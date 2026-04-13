from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from conges import views as conges_views

router = DefaultRouter()
router.register('employes', conges_views.EmployeViewSet, basename='employe')
router.register('demandes', conges_views.DemandeCongeViewSet, basename='demande')
router.register('notifications', conges_views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),   # Login, Logout, Me, Refresh, Register
    path('api/', include(router.urls)),             # Employes, Demandes, Notifications
]