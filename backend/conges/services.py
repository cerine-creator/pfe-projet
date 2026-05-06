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
    LOGIQUE WATERFALL : Puise d'abord dans l'exercice le plus ancien disponible.
    USAGE : Appelé SEULEMENT quand la demande est approuvée (statut final).
    """
    # Si le congé est 'exceptionnel' ou 'non payé/sans solde', on ne déduit PAS du solde annuel
    if demande.type_conge:
        nom_type = demande.type_conge.nomType.lower()
        if 'exceptionnel' in nom_type or 'non payé' in nom_type or 'sans solde' in nom_type:
            return

    jours_a_deduire = demande.duree
    
    # On récupère tous les droits de l'employé, du plus ancien au plus récent
    droits = DroitConge.objects.filter(
        employe=demande.employe, 
        nbrJRes__gt=0
    ).order_by('exercice__date_debut')

    if not droits.exists():
        raise ValidationError("Cet employé n'a aucun solde disponible sur aucun exercice.")

    total_disponible = sum([d.nbrJRes for d in droits])
    if jours_a_deduire > total_disponible:
        raise ValidationError(f"Solde insuffisant. Total disponible : {total_disponible}j, Demandé : {jours_a_deduire}j.")

    # Waterfall : Déduction successive
    for droit in droits:
        if jours_a_deduire <= 0:
            break
            
        if droit.nbrJRes >= jours_a_deduire:
            # L'exercice actuel suffit
            droit.nbrJConsome += jours_a_deduire
            droit.nbrJRes -= jours_a_deduire
            droit.save()
            jours_a_deduire = 0
        else:
            # On vide cet exercice et on passe au suivant
            jours_a_deduire -= droit.nbrJRes
            droit.nbrJConsome += droit.nbrJRes
            droit.nbrJRes = 0
            droit.save()

def generer_titre_conge_automatique(demande):
    """
    FONCTION : Crée le document officiel "Titre de Congé" quand la demande est validée par les RH.
    USAGE : Appelé automatiquement après un statut 'approuvee'.
    """
    # Format professionnel : CONGE-ANNEE-ID (ex: CONGE-2026-0042)
    reference_titre = f"CONGE-{demande.date_debut.year}-{demande.id:04d}"
    
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
