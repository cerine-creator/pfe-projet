from django.core.exceptions import ValidationError
from datetime import date
from dateutil.relativedelta import relativedelta
from .models import DroitConge, TitreConge

def calculer_jours_acquis_par_mois(employe, exercice):
    """
    FONCTION : Calcule les jours de congés acquis selon le profil Air Algérie.
    - Personnel au Sol : 30 jours max (2.5 jours/mois)
    - Personnel Navigant et logé au Sud : 45 jours max (3.75 jours/mois)
    """
    date_debut_calcul = employe.dateRecrutement
    
    # Prorata selon l'exercice
    if exercice.date_debut and date_debut_calcul < exercice.date_debut:
        date_debut_calcul = exercice.date_debut

    date_fin_calcul = date.today()
    if exercice.date_fin and date_fin_calcul > exercice.date_fin:
        date_fin_calcul = exercice.date_fin
        
    if date_debut_calcul > date_fin_calcul:
        return 0

    difference = relativedelta(date_fin_calcul, date_debut_calcul)
    mois_travailles = difference.years * 12 + difference.months
    
    # Règles Spécifiques Air Algérie
    if employe.categorie in ['navigant', 'sud']:
        plafond = 45.0
        ratio_mensuel = 3.75
    else: # Personnel au sol (par défaut)
        plafond = 30.0
        ratio_mensuel = 2.5

    jours_gagnes = min(mois_travailles * ratio_mensuel, plafond)
    return jours_gagnes

def verifier_limite_conge_exceptionnel(demande):
    """
    FONCTION : Vérifie si la durée demandée respecte la loi avant de pouvoir enregistrer la demande.
    USAGE : Appelé à l'intérieur de DemandeConge.clean() ou views.py.
    """
    if not (demande.type_conge and demande.type_conge.est_exceptionnel):
        return # Ce n'est pas un congé exceptionnel, pas de limite de ce type

    # Règle des plafonds légaux par motif
    plafonds = {
        'mariage_perso': 5,
        'deces_enfant': 5,
        'naissance': 3,
        'deces_proche': 3,
        'mariage_enfant': 3,
    }
    
    limite = plafonds.get(demande.motif, 0) # Si "autre" ou inconnu, on ne bloque pas pour l'instant
    
    if limite > 0 and demande.duree > limite:
        raise ValidationError(f"Le motif '{demande.get_motif_display()}' est strictement limité à {limite} jours par la réglementation.")

def deduire_solde_conge(demande):
    """
    FONCTION : Déduit les jours de congé demandés du solde de l'employé.
    USAGE : Appelé SEULEMENT quand la demande est approuvée (statut final).
    """
    try:
        droit = DroitConge.objects.get(employe=demande.employe, exercice=demande.exercice)
    except DroitConge.DoesNotExist:
        raise ValidationError("Cet employé n'a aucun droit de congé calculé pour cet exercice.")

    if demande.duree > droit.nbrJRes:
        raise ValidationError(f"Solde insuffisant. Le solde est de {droit.nbrJRes} jours mais {demande.duree} ont été demandés.")

    # Mise à jour des compteurs du Droit
    droit.nbrJConsome += demande.duree
    droit.nbrJRes -= demande.duree
    droit.save()

def generer_titre_conge_automatique(demande):
    """
    FONCTION : Crée le document officiel "Titre de Congé" quand la demande est validée par les RH.
    USAGE : Appelé automatiquement après un statut 'approuvee'.
    """
    reference_titre = f"TC-{demande.employe.matricule}-{demande.id}"
    
    # On génère le Titre de Congé (L'équivalent d'un certificat validé)
    titre, created = TitreConge.objects.get_or_create(
        demande=demande,
        defaults={
            'ref': reference_titre,
            'dateDebut': demande.date_debut,
            'dateFin': demande.date_fin,
            'dureeT': demande.duree,
            'exercice': demande.exercice,
            'employe': demande.employe
        }
    )
    return titre
