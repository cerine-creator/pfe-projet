from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

def validate_air_algerie_email(value):
    if not value.endswith('@airalgerie.dz'):
        raise ValidationError(
            '%(value)s n\'est pas une adresse email d\'entreprise valide. Utilisez: prenom.nom@airalgerie.dz',
            params={'value': value},
        )

class CustomUser(AbstractUser):
    # Rendre l'email obligatoire, unique et utiliser le validateur strict
    email = models.EmailField(
        unique=True,
        validators=[validate_air_algerie_email],
        error_messages={
            'unique': "Un compte avec cet e-mail entreprise existe déjà.",
        }
    )

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

    def save(self, *args, **kwargs):
        # Automatiquement forcer le username à être l'email de l'entreprise
        if self.email:
            self.email = self.email.lower()
            if not self.username or self.username != self.email:
                self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
