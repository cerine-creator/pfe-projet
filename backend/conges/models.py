from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings

# --- 1. REFERENTIELS (NOMENCLATURES) ---

class Structure(models.Model):
    libelle = models.CharField(max_length=150)
    niveau = models.CharField(max_length=50) # Ex: Direction, Sous-direction, Service
    
    # La relation 'self' permet de créer une hiérarchie (Ex: Un Service a pour parent une Sous-direction)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sous_structures')

    # Le responsable de la structure (Gérable via le panel Admin)
    responsable = models.OneToOneField(
        'Employe', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='structure_dirigee', 
        help_text="Le chef / responsable de cette structure",
        limit_choices_to={'compte__role__in': ['responsable_hierarchique', 'responsable_rh', 'directeur_rh']}
    )

    class Meta:
        verbose_name = 'Structure'
        verbose_name_plural = 'Structures'

    def __str__(self):
        return f"{self.libelle} ({self.niveau})"

class Fonction(models.Model):
    libelle = models.CharField(max_length=150)

    class Meta:
        verbose_name = 'Fonction'
        verbose_name_plural = 'Fonctions'

    def __str__(self):
        return self.libelle

class TypeConge(models.Model):
    nomType = models.CharField(max_length=100) # Ex: Annuel, Exceptionnel, Maladie
    est_exceptionnel = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Type de congé'
        verbose_name_plural = 'Types de congés'

    def __str__(self):
        return self.nomType

class Exercice(models.Model):
    libelle = models.CharField(max_length=50, unique=True) # Ex: "2023/2024"
    date_debut = models.DateField(null=True, blank=True) # Ex: 1er Juillet
    date_fin = models.DateField(null=True, blank=True)   # Ex: 30 Juin
    est_cloture = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Exercice'
        verbose_name_plural = 'Exercices'

    def __str__(self):
        return self.libelle

# --- 2. ACTEURS ET DROITS ---

class Employe(models.Model):
    CATEGORIE_CHOICES = [
        ('sol', 'Personnel au Sol (30j)'),
        ('navigant', 'Personnel Navigant (45j)'),
        ('sud', 'Personnel au Sud (45j)'),
    ]

    matricule = models.CharField(max_length=20, unique=True, null=True, blank=True)
    nomEmpl = models.CharField(max_length=100)
    prenomEmpl = models.CharField(max_length=100)
    numTel = models.CharField(max_length=20, blank=True, null=True)
    dateRecrutement = models.DateField()
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='sol', help_text="Détermine le quota de congés annuel (30j ou 45j)")
    
    # Liens avec les nomenclatures
    structure = models.ForeignKey(Structure, on_delete=models.PROTECT, related_name='employes', verbose_name="Structure")
    fonction = models.ForeignKey(Fonction, on_delete=models.PROTECT, related_name='employes', verbose_name="Fonction")
    
    class Meta:
        verbose_name = 'Employé'
        verbose_name_plural = 'Employés'

    def __str__(self):
        return f"{self.prenomEmpl} {self.nomEmpl}"

class DroitConge(models.Model):
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='droits_conges')
    exercice = models.ForeignKey(Exercice, on_delete=models.CASCADE, related_name='droits_globaux')
    
    nbrJCumule = models.FloatField(default=0, help_text="Reliquats des exercices précédents")
    nbrJConsome = models.FloatField(default=0, help_text="Jours pris cette année")
    nbrJRes = models.FloatField(default=0, help_text="Solde restant")

    class Meta:
        verbose_name = 'Droit au congé'
        verbose_name_plural = 'Droits aux congés'
        unique_together = ('employe', 'exercice') # Un employé n'a qu'une seule ligne de droit par exercice

    def __str__(self):
        return f"Droits {self.employe} - {self.exercice}"

# --- 3. GESTION DES DEMANDES DE CONGES ---

class Justificatif(models.Model):
    fichierJustificatif = models.FileField(upload_to='justificatifs/')

    class Meta:
        verbose_name = 'Justificatif'
        verbose_name_plural = 'Justificatifs'

class DemandeConge(models.Model):
    MOTIF_CHOICES = [
        ('mariage_perso', 'Mariage personnel (5j)'),
        ('naissance', 'Naissance (3j)'),
        ('deces_enfant', 'Décès d\'un enfant (5j)'),
        ('deces_proche', 'Décès d\'un proche (3j)'),
        ('mariage_enfant', 'Mariage d\'un enfant (3j)'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('en_attente_resp', 'En attente Responsable'),
        ('en_attente_rh', 'En attente RH'),
        ('approuvee', 'Approuvée'),
        ('refusee', 'Refusée')
    ]

    dateDemande = models.DateField(auto_now_add=True)
    date_debut = models.DateField()
    date_fin = models.DateField()
    duree = models.FloatField(editable=False) # Calculé automatiquement (ne pas saisir manuellement)

    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='demandes')
    exercice = models.ForeignKey(Exercice, on_delete=models.SET_NULL, null=True, blank=True, related_name='demandes')
    type_conge = models.ForeignKey(TypeConge, on_delete=models.SET_NULL, null=True, related_name='demandes')
    justificatif = models.ForeignKey(Justificatif, on_delete=models.SET_NULL, null=True, blank=True)
    
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente_resp')
    motif = models.CharField(max_length=30, choices=MOTIF_CHOICES, null=True, blank=True) 

    class Meta:
        verbose_name = 'Demande de congé'
        verbose_name_plural = 'Demandes de congé'
        ordering = ['-dateDemande']

    def clean(self):
        # Cette fonction vérifie les règles AVANT d'enregistrer.
        super().clean()
        
        # 1. Calcul automatique de la durée
        if self.date_debut and self.date_fin:
            calcul_duree = (self.date_fin - self.date_debut).days + 1
            self.duree = calcul_duree
            
        # 2. Validation de l'exercice (Règle Air Algérie : Épuiser le passé d'abord)
        if self.exercice and self.employe:
            # On cherche s'il existe un exercice plus ancien (début avant l'exercice choisi)
            # où il reste des jours de congé non consommés.
            from .models import DroitConge
            anciens_droits_non_soldes = DroitConge.objects.filter(
                employe=self.employe,
                exercice__date_debut__lt=self.exercice.date_debut,
                nbrJRes__gt=0
            ).order_by('exercice__date_debut')

            if anciens_droits_non_soldes.exists():
                old_ex = anciens_droits_non_soldes.first().exercice
                raise ValidationError(
                    f"Action refusée : Vous avez encore un solde de {anciens_droits_non_soldes.first().nbrJRes} jours "
                    f"sur l'exercice {old_ex.libelle}. Vous devez les consommer en priorité."
                )

        # 3. Validation par motif exceptionnel
        if self.type_conge and 'exceptionnel' in self.type_conge.nomType.lower():
            if self.motif == 'mariage_perso' and self.duree > 5:
                raise ValidationError("Le mariage personnel limite le congé à 5 jours max.")
            elif self.motif == 'deces_enfant' and self.duree > 5:
                    raise ValidationError("Le décès d'un enfant limite le congé à 5 jours max.")
            elif self.motif in ['naissance', 'deces_proche', 'mariage_enfant'] and self.duree > 3:
                raise ValidationError("Ce motif exceptionnel est limité à 3 jours max.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Demande {self.employe} ({self.duree}j)"

class TitreConge(models.Model):
    ref = models.CharField(max_length=50, unique=True)
    dateDebut = models.DateField()
    dateFin = models.DateField()
    dureeT = models.FloatField()
    
    exercice = models.ForeignKey(Exercice, on_delete=models.CASCADE)
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='titres')
    demande = models.OneToOneField(DemandeConge, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name = 'Titre de congé'
        verbose_name_plural = 'Titres de congé'

    def __str__(self):
        return f"Titre {self.ref} - {self.employe}"

class Notification(models.Model):
    dateNotif = models.DateField(auto_now_add=True)
    heureNotif = models.TimeField(auto_now_add=True)
    description = models.TextField()
    
    # On lie la notification à l'UTILISATEUR (le compte connecté)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    lu = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-dateNotif', '-heureNotif']