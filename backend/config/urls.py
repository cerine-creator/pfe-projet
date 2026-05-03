from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from conges import views as conges_views

router = DefaultRouter()
# Les nomenclatures (Listes pour les formulaires React)
router.register('structures', conges_views.StructureViewSet, basename='structure')
router.register('fonctions', conges_views.FonctionViewSet, basename='fonction')
router.register('types-congés', conges_views.TypeCongeViewSet, basename='typeconge')
router.register('exercices', conges_views.ExerciceViewSet, basename='exercice')

# Les entités principales
router.register('employes', conges_views.EmployeViewSet, basename='employe')
router.register('demandes', conges_views.DemandeCongeViewSet, basename='demande')
router.register('titres', conges_views.TitreCongeViewSet, basename='titre')
router.register('notifications', conges_views.NotificationViewSet, basename='notification')

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),   # Login, Logout, Me, Refresh, Register
    path('api/', include(router.urls)),             # Toutes les autres APIs
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)