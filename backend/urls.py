from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from conges import views

router = DefaultRouter()
router.register('employes', views.EmployeViewSet)
router.register('demandes', views.DemandeCongeViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]