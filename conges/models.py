from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from datetime import date

class Employe(models.Model):
    ROLE_CHOICES = [
        ('employe', 'Employé'),
        ('responsable_hierarchique', 'Responsable Hiérarchique'),
        ('responsable_rh', 'Responsable RH'),
    ]
    
    # Link to Django's built-in User for authentication
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    
    # Employee information
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    matricule = models.CharField(max_length=20, unique=True, blank=True)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='employe')
    
    # Leave balance
    jours_conges_restants = models.FloatField(default=30)
    date_embauche = models.DateField()
    
    # For managers: which employees they manage
    service = models.CharField(max_length=100, blank=True)
    responsable = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='equipe')
    
    def __str__(self):
        return f"{self.nom} ({self.get_role_display()})"
    
    def calculer_conges_accumules(self):
        """Calcule 2.5 jours par mois travaillé"""
        mois_travailles = (date.today().year - self.date_embauche.year) * 12
        mois_travailles += date.today().month - self.date_embauche.month
        return mois_travailles * 2.5
    
    def peut_demander_conge(self, duree):
        return self.jours_conges_restants >= duree
    
    @property
    def est_responsable(self):
        return self.role == 'responsable_hierarchique'
    
    @property
    def est_admin_rh(self):
        return self.role == 'responsable_rh'
    
    @property
    def equipe_sous_responsabilite(self):
        if self.est_responsable:
            return Employe.objects.filter(responsable=self)
        return Employe.objects.none()


class DemandeConge(models.Model):
    STATUT_CHOICES = [
        ('en_attente_responsable', 'En attente validation responsable'),
        ('validee_responsable', 'Validée par responsable'),
        ('en_attente_admin', 'En attente validation RH'),
        ('validee', 'Validée'),
        ('refusee', 'Refusée'),
        ('annulee', 'Annulée'),
    ]
    
    NATURE_CHOICES = [
        ('annuel', 'Congé annuel'),
        ('exceptionnel', 'Congé exceptionnel'),
    ]
    
    MOTIF_CHOICES = [
        ('mariage', 'Mariage'),
        ('naissance', 'Naissance'),
        ('deces', 'Décès'),
        ('maladie', 'Maladie'),
        ('autres', 'Autres'),
    ]
    
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='demandes')
    nature = models.CharField(max_length=20, choices=NATURE_CHOICES, default='annuel')
    motif = models.CharField(max_length=20, choices=MOTIF_CHOICES, blank=True, null=True)
    raison = models.TextField(blank=True)
    
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='en_attente_responsable')
    
    # Audit fields
    date_soumission = models.DateTimeField(auto_now_add=True)
    date_validation_responsable = models.DateTimeField(null=True, blank=True)
    date_validation_admin = models.DateTimeField(null=True, blank=True)
    
    responsable_validation = models.ForeignKey(Employe, on_delete=models.SET_NULL, null=True, blank=True, related_name='validations_responsable')
    admin_validation = models.ForeignKey(Employe, on_delete=models.SET_NULL, null=True, blank=True, related_name='validations_admin')
    
    # For rejection
    motif_refus = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.employe.nom} - {self.date_debut} à {self.date_fin}"
    
    @property
    def duree(self):
        return (self.date_fin - self.date_debut).days
    
    def valider_par_responsable(self, responsable):
        """Étape 1: Validation par le responsable"""
        if not responsable.est_responsable:
            raise ValidationError("Seul un responsable peut valider")
        self.statut = 'validee_responsable'
        self.date_validation_responsable = date.today()
        self.responsable_validation = responsable
        self.save()
    
    def approuver_par_admin(self, admin):
        """Étape 2: Approbation finale par l'admin RH"""
        if not admin.est_admin_rh and not admin.user.is_superuser:
            raise ValidationError("Seul l'administrateur RH peut approuver")
        
        if self.employe.peut_demander_conge(self.duree):
            self.statut = 'validee'
            self.date_validation_admin = date.today()
            self.admin_validation = admin
            self.employe.jours_conges_restants -= self.duree
            self.employe.save()
            self.save()
        else:
            raise ValidationError("Solde de congés insuffisant")
    
    def refuser(self, raison, utilisateur):
        self.statut = 'refusee'
        self.motif_refus = raison
        self.save()


class Notification(models.Model):
    """For automatic notifications between roles"""
    destinataire = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    lu = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    lien = models.CharField(max_length=200, blank=True)
    
    def __str__(self):
        return f"Notification pour {self.destinataire.nom}"