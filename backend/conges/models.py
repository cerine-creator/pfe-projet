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

    est_structure_rh = models.BooleanField(
        default=False, 
        help_text="Cochez cette case pour indiquer que c'est le département des Ressources Humaines. Seuls les membres d'une structure RH peuvent avoir le rôle RH."
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

class JourFerie(models.Model):
    libelle = models.CharField(max_length=100)
    date = models.DateField(unique=True)
    est_fixe = models.BooleanField(default=True, help_text="Si vrai, revient chaque année à la même date (ex: 1er Mai)")

    class Meta:
        verbose_name = 'Jour Férié'
        verbose_name_plural = 'Jours Fériés'
        ordering = ['date']

    def __str__(self):
        return f"{self.libelle} ({self.date})"

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

    def clean(self):
        super().clean()
        from datetime import date
        if self.dateRecrutement:
            if self.dateRecrutement.year < 1947:
                raise ValidationError("La date de recrutement ne peut pas être antérieure à la création d'Air Algérie (1947).")
            if self.dateRecrutement > date.today():
                raise ValidationError("La date de recrutement ne peut pas être dans le futur.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.matricule:
            import datetime
            year = datetime.date.today().year
            # On cherche le dernier matricule de cette année pour incrémenter
            last_emp = Employe.objects.filter(matricule__startswith=f'AH-{year}-').order_by('id').last()
            if last_emp and last_emp.matricule:
                try:
                    last_num = int(last_emp.matricule.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
            self.matricule = f'AH-{year}-{new_num:04d}'
        super().save(*args, **kwargs)

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
        ('refusee', 'Refusée'),
        ('expiree', 'Expirée'),
    ]

    dateDemande = models.DateField(auto_now_add=True)
    date_debut = models.DateField()
    date_fin = models.DateField()
    duree = models.FloatField(editable=False) # Calculé automatiquement (ne pas saisir manuellement)

    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='demandes')
    exercice = models.ForeignKey(Exercice, on_delete=models.SET_NULL, null=True, blank=True, related_name='demandes')
    type_conge = models.ForeignKey(TypeConge, on_delete=models.SET_NULL, null=True, related_name='demandes')
    justificatif = models.FileField(upload_to='justificatifs/', null=True, blank=True)
    
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
            if self.date_debut > self.date_fin:
                raise ValidationError("La date de début ne peut pas être postérieure à la date de fin.")
                
            # --- NOUVEAU CALCUL PRÉCIS (Cas Air Algérie) ---
            import datetime
            from .models import JourFerie
            
            temp_date = self.date_debut
            jours_travailles = 0
            
            # Liste des jours fériés pour optimiser
            feries = JourFerie.objects.all()
            
            while temp_date <= self.date_fin:
                # 1. Vérifier si c'est un week-end (4=Vendredi, 5=Samedi en Python si on suit le standard Algérien)
                # Attention : ISO weekday est 1=Lundi... 5=Vendredi, 6=Samedi, 7=Dimanche
                # On utilise .weekday() : 0=Lundi, 4=Vendredi, 5=Samedi
                is_weekend = temp_date.weekday() in [4, 5]
                
                # 2. Vérifier si c'est un jour férié
                is_ferie = False
                for f in feries:
                    if f.est_fixe:
                        # On compare seulement le jour et le mois (ex: 1er Mai)
                        if f.date.day == temp_date.day and f.date.month == temp_date.month:
                            is_ferie = True
                            break
                    else:
                        # On compare la date exacte
                        if f.date == temp_date:
                            is_ferie = True
                            break
                
                # On ne compte le jour que si ce n'est NI un week-end NI un férié
                if not is_weekend and not is_ferie:
                    jours_travailles += 1
                
                temp_date += datetime.timedelta(days=1)
            
            self.duree = jours_travailles
            # -----------------------------------------------
            
            # Vérification des chevauchements et demandes en attente
            if self.employe:
                # Vérifier s'il y a une demande en attente
                demandes_en_attente = DemandeConge.objects.filter(
                    employe=self.employe,
                    statut__in=['en_attente_resp', 'en_attente_rh']
                ).exclude(pk=self.pk)
                
                if demandes_en_attente.exists():
                    raise ValidationError("Vous ne pouvez pas soumettre une nouvelle demande tant que vous avez une demande en attente.")
                    
                # Vérifier les chevauchements avec d'autres demandes non refusées et non expirées
                chevauchements = DemandeConge.objects.filter(
                    employe=self.employe,
                    date_debut__lte=self.date_fin,
                    date_fin__gte=self.date_debut
                ).exclude(statut__in=['refusee', 'expiree']).exclude(pk=self.pk)
                
                if chevauchements.exists():
                    raise ValidationError("Cette demande de congé se chevauche avec une autre demande existante.")
            
        # 1.bis. Vérification du solde global dès la soumission (si ce n'est pas exceptionnel)
        if self.type_conge and not self.type_conge.est_exceptionnel and self.employe:
            from .models import DroitConge
            from django.db.models import Sum
            solde_total = DroitConge.objects.filter(employe=self.employe).aggregate(Sum('nbrJRes'))['nbrJRes__sum'] or 0
            if self.duree > solde_total:
                raise ValidationError(
                    f"Solde insuffisant. Globalement disponible : {solde_total}j, Demandé : {self.duree}j."
                )
            
        # 1.ter. Vérification de la borne d'exercice (Désactivée car auto-split)
        # On ne bloque plus si ça dépasse, le système puisera dans les exercices successifs.

        # 2. Validation de l'exercice (Supprimé car géré par le waterfall RH)
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

    @property
    def delai_jours(self):
        """Nombre de jours entre la date de demande et la date de début du congé."""
        if self.dateDemande and self.date_debut:
            return (self.date_debut - self.dateDemande).days
        return None

    @property
    def urgence_badge(self):
        """Calcule le niveau d'urgence selon le délai de préavis."""
        delai = self.delai_jours
        if delai is None:
            return 'normal'
        if delai < 7:
            return 'urgent'
        if delai <= 15:
            return 'attention'
        return 'normal'

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Demande {self.employe} ({self.duree}j)"



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

class CalendarNote(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Note de calendrier'
        verbose_name_plural = 'Notes de calendrier'
        ordering = ['date', 'created_at']

    def __str__(self):
        return f"{self.title} - {self.date}"