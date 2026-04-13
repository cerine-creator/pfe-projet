from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Interface Admin pour la gestion des utilisateurs.
    Ajoute le champ 'role' et 'employe' à l'interface standard.
    """
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']

    fieldsets = UserAdmin.fieldsets + (
        ('Rôle & Profil RH', {
            'fields': ('role', 'employe'),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Rôle & Profil RH', {
            'fields': ('role', 'employe'),
        }),
    )
