from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings

class Structure(models.Model):
    libelle = models.CharField(max_length=150)
    niveau = models.CharField(max_length=50) # ex: Direction, Sous-direction
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sous_structures')

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

class Employe(models.Model):
    nomEmpl = models.CharField(max_length=100)
    prenomEmpl = models.CharField(max_length=100)
    numTel = models.CharField(max_length=20, blank=True, null=True)
    dateRecrutement = models.DateField()
    
    structure = models.ForeignKey(Structure, on_delete=models.SET_NULL, null=True, blank=True, related_name='employes')
    fonction = models.ForeignKey(Fonction, on_delete=models.SET_NULL, null=True, blank=True, related_name='employes')
    
    class Meta:
        verbose_name = 'Employé'
        verbose_name_plural = 'Employés'

    def __str__(self):
        return f"{self.prenomEmpl} {self.nomEmpl}"

class TypeConge(models.Model):
    nomType = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Type de congé'
        verbose_name_plural = 'Types de congés'

    def __str__(self):
        return self.nomType

class Exercice(models.Model):
    libelle = models.CharField(max_length=50, unique=True) # ex: 2023/2024
    
    class Meta:
        verbose_name = 'Exercice'
        verbose_name_plural = 'Exercices'

    def __str__(self):
        return self.libelle

class DroitConge(models.Model):
    nbrJConsome = models.FloatField(default=0)
    nbrJRes = models.FloatField(default=0)
    nbrJCumule = models.FloatField(default=0)
    
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='droits_conges')
    exercice = models.ForeignKey(Exercice, on_delete=models.CASCADE, related_name='droits_globaux')

    class Meta:
        verbose_name = 'Droit au congé'
        verbose_name_plural = 'Droits aux congés'
        unique_together = ('employe', 'exercice')

    def __str__(self):
        return f"Droits {self.employe} - {self.exercice}"

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
    duree = models.FloatField(editable=False) 

    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='demandes')
    type_conge = models.ForeignKey(TypeConge, on_delete=models.SET_NULL, null=True, related_name='demandes')
    justificatif = models.ForeignKey(Justificatif, on_delete=models.SET_NULL, null=True, blank=True)
    
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente_resp')
    motif = models.CharField(max_length=30, choices=MOTIF_CHOICES, null=True, blank=True) 

    class Meta:
        verbose_name = 'Demande de congé'
        verbose_name_plural = 'Demandes de congé'
        ordering = ['-dateDemande']

    def clean(self):
        super().clean()
        if self.date_debut and self.date_fin:
            calcul_duree = (self.date_fin - self.date_debut).days + 1
            self.duree = calcul_duree
            
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

    class Meta:
        verbose_name = 'Titre de congé'
        verbose_name_plural = 'Titres de congé'

    def __str__(self):
        return f"Titre {self.ref} - {self.employe}"

class Notification(models.Model):
    dateNotif = models.DateField(auto_now_add=True)
    heureNotif = models.TimeField(auto_now_add=True)
    description = models.TextField()
    
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    lu = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-dateNotif', '-heureNotif']