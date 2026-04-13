from django.db import models
from django.core.exceptions import ValidationError
from datetime import date


class Employe(models.Model):
    """
    Profil RH pur d'un employé.
    Ne contient AUCUNE logique d'authentification ni de rôle —
    c'est le CustomUser (app accounts) qui porte le rôle et le mot de passe.
    La relation est : CustomUser.employe → Employe (OneToOne depuis accounts).
    """

    # Informations personnelles et RH
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    matricule = models.CharField(max_length=20, unique=True, blank=True)

    # Solde et date d'embauche
    jours_conges_restants = models.FloatField(default=30)
    date_embauche = models.DateField()

    # Organisation
    service = models.CharField(max_length=100, blank=True)

    # Hiérarchie d'équipe — auto-référence pour savoir qui manage qui
    responsable = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipe',
        verbose_name='Responsable direct',
    )

    class Meta:
        verbose_name = 'Employé'
        verbose_name_plural = 'Employés'

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.matricule})"

    def calculer_conges_accumules(self):
        """Calcule 2.5 jours de congé par mois travaillé depuis la date d'embauche."""
        mois_travailles = (date.today().year - self.date_embauche.year) * 12
        mois_travailles += date.today().month - self.date_embauche.month
        return mois_travailles * 2.5

    def peut_demander_conge(self, duree):
        """Vérifie si l'employé a assez de jours restants."""
        return self.jours_conges_restants >= duree

    @property
    def equipe_sous_responsabilite(self):
        """Retourne tous les employés dont ce profil est le responsable direct."""
        return Employe.objects.filter(responsable=self)


class DemandeConge(models.Model):
    STATUT_CHOICES = [
        ('en_attente_responsable', 'En attente validation responsable'),
        ('validee_responsable', 'Validée par responsable'),
        ('en_attente_rh', 'En attente validation RH'),
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
    statut = models.CharField(
        max_length=30, choices=STATUT_CHOICES, default='en_attente_responsable'
    )

    # Champs d'audit
    date_soumission = models.DateTimeField(auto_now_add=True)
    date_validation_responsable = models.DateTimeField(null=True, blank=True)
    date_validation_rh = models.DateTimeField(null=True, blank=True)

    responsable_validation = models.ForeignKey(
        Employe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validations_responsable',
    )
    rh_validation = models.ForeignKey(
        Employe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validations_rh',
    )

    motif_refus = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Demande de congé'
        verbose_name_plural = 'Demandes de congé'
        ordering = ['-date_soumission']

    def __str__(self):
        return f"{self.employe} — {self.date_debut} → {self.date_fin} ({self.get_statut_display()})"

    @property
    def duree(self):
        """Nombre de jours ouvrés de la demande."""
        return (self.date_fin - self.date_debut).days + 1

    def valider_par_responsable(self, responsable_employe):
        """
        Étape 1 : Validation hiérarchique.
        responsable_employe : instance Employe dont le compte a le rôle responsable_hierarchique.
        """
        self.statut = 'validee_responsable'
        self.date_validation_responsable = date.today()
        self.responsable_validation = responsable_employe
        self.save()

    def approuver_par_rh(self, rh_employe):
        """
        Étape 2 : Approbation finale RH — déduit le solde de congés.
        rh_employe : instance Employe dont le compte a le rôle responsable_rh ou directeur_rh.
        """
        if not self.employe.peut_demander_conge(self.duree):
            raise ValidationError('Solde de congés insuffisant pour cette demande.')

        self.statut = 'validee'
        self.date_validation_rh = date.today()
        self.rh_validation = rh_employe
        self.employe.jours_conges_restants -= self.duree
        self.employe.save()
        self.save()

    def refuser(self, raison, utilisateur_employe):
        """Refus de la demande à n'importe quelle étape."""
        self.statut = 'refusee'
        self.motif_refus = raison
        self.save()


class Notification(models.Model):
    """Notifications automatiques entre utilisateurs du système."""

    destinataire = models.ForeignKey(
        Employe, on_delete=models.CASCADE, related_name='notifications'
    )
    message = models.TextField()
    lu = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    lien = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Notification'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Notif → {self.destinataire} : {self.message[:50]}"