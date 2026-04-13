from rest_framework.permissions import BasePermission
from .models import CustomUser


class IsEmploye(BasePermission):
    """Tout utilisateur authentifié avec un rôle métier valide."""
    message = 'Accès réservé aux employés authentifiés.'

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsResponsableHierarchique(BasePermission):
    """Responsable hiérarchique d'équipe."""
    message = 'Accès réservé aux responsables hiérarchiques.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.Role.RESPONSABLE_HIERARCHIQUE
        )


class IsResponsableRH(BasePermission):
    """Responsable des Ressources Humaines."""
    message = 'Accès réservé aux responsables RH.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.Role.RESPONSABLE_RH
        )


class IsDirecteurRH(BasePermission):
    """Directeur des Ressources Humaines — accès stratégique complet."""
    message = 'Accès réservé au Directeur RH.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.Role.DIRECTEUR_RH
        )


class IsHRStaff(BasePermission):
    """Responsable RH OU Directeur RH — pour les opérations RH générales."""
    message = "Accès réservé à l'équipe RH."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                CustomUser.Role.RESPONSABLE_RH,
                CustomUser.Role.DIRECTEUR_RH,
            ]
        )


class IsHRStaffOrAdmin(BasePermission):
    """Responsable RH, Directeur RH ou Superadmin Django."""
    message = "Accès réservé à l'équipe RH ou à l'administrateur système."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.role in [
            CustomUser.Role.RESPONSABLE_RH,
            CustomUser.Role.DIRECTEUR_RH,
        ]
