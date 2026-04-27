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

    def clean(self):
        super().clean()
        if self.employe:
            # 1. Protection Structure RH
            if self.role in [self.Role.RESPONSABLE_RH, self.Role.DIRECTEUR_RH]:
                if self.employe.structure and not getattr(self.employe.structure, 'est_structure_rh', False):
                    raise ValidationError({
                        'role': "Un compte avec le rôle RH doit obligatoirement être rattaché à une structure Ressources Humaines (cochez est_structure_rh de la structure de cet employé)."
                    })
            
            # 2. Protection Cohérence Rôle / Fonction
            if self.role != self.Role.EMPLOYE:
                fonction_str = self.employe.fonction.libelle.lower()
                role_str = self.get_role_display().lower()
                
                # on découpe le rôle pour vérifier les mots importants (responsable, directeur, rh, etc)
                mots_attendus = [m for m in role_str.split() if len(m) > 2]
                
                # Pour éviter les problèmes avec les fautes de frappe (ex: "Responable" sans 's'),
                # on utilise une validation souple : on vérifie juste sur les 5 premières lettres (ex: "respo")
                match = any(mot[:5] in fonction_str for mot in mots_attendus)
                
                if not match:
                    raise ValidationError({
                        'role': f"Incohérence : Le rôle attribué '{self.get_role_display()}' ne correspond pas du tout à la fonction officielle de l'employé ('{self.employe.fonction.libelle}'). Veuillez corriger la fonction ou le rôle."
                    })

            # 3. Protection d'Unicité : 1 Structure = 1 Seul Chef hiérarchique principal
            # NOTE Exception : L'utilisateur nous confirme qu'il peut y avoir PLUSIEURS collaborateurs 
            # avec le rôle 'responsable_rh' dans la structure RH, donc on ne bloque pas pour eux.
            if self.role in [self.Role.RESPONSABLE_HIERARCHIQUE, self.Role.DIRECTEUR_RH]:
                struct = self.employe.structure
                if struct and struct.responsable and struct.responsable != self.employe:
                    raise ValidationError({
                        'role': f"ALERTE : La structure '{struct.libelle}' a déjà un chef désigné ({struct.responsable.nomEmpl} {struct.responsable.prenomEmpl}). Un seul chef direct autorisé par structure."
                    })

    def save(self, *args, **kwargs):
        self.clean()
        # Automatiquement forcer le username à être l'email de l'entreprise
        if self.email:
            self.email = self.email.lower()
            if not self.username or self.username != self.email:
                self.username = self.email
        
        super().save(*args, **kwargs)
        
        # === Auto-assignation Logique ===
        # Si on attribue un rôle de chef et que la structure n'a pas encore de responsable défini
        if self.role in [self.Role.RESPONSABLE_HIERARCHIQUE, self.Role.DIRECTEUR_RH]:
            if self.employe and self.employe.structure:
                structure = self.employe.structure
                if not structure.responsable:
                    structure.responsable = self.employe
                    structure.save()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
