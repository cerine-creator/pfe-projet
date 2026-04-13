from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Custom User model remplaçant l'utilisateur Django par défaut.
    Porte les 4 rôles métier via TextChoices.
    Le rôle Administrateur Système utilise is_staff + is_superuser natifs.
    """

    class Role(models.TextChoices):
        EMPLOYE = 'employe', 'Employé'
        RESPONSABLE_HIERARCHIQUE = 'responsable_hierarchique', 'Responsable Hiérarchique'
        RESPONSABLE_RH = 'responsable_rh', 'Responsable RH'
        DIRECTEUR_RH = 'directeur_rh', 'Directeur RH'

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.EMPLOYE,
        verbose_name='Rôle métier',
    )

    # Lien vers le profil RH (optionnel — l'admin système n'a pas forcément de profil Employé)
    employe = models.OneToOneField(
        'conges.Employe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compte',
        verbose_name='Profil Employé',
    )

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
