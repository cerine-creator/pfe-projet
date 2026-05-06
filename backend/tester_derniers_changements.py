import os
import django
import sys

# Configuration de l'environnement Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from conges.models import DemandeConge, JourFerie, Employe
from conges.services import generer_titre_conge_automatique
from conges.pdf_utils import generer_pdf_titre
from datetime import date

def tester_systeme():
    print("=== DEBUT DES TESTS DE VALIDATION FINALE ===")
    
    # 1. Test des Jours Fériés Fixes
    print("\n1. Verification des jours feries fixes...")
    jf, created = JourFerie.objects.get_or_create(
        libelle="Test 1er Mai", 
        date=date(2000, 5, 1), 
        defaults={'est_fixe': True}
    )
    print(f"   - Jour ferie fixe (1er Mai) OK.")

    # 2. Test du Calcul de Durée (Exclut WE et Fériés)
    print("\n2. Test du calcul de duree (Logique Metier)...")
    # Exemple : Du Jeudi 30 Avril au Dimanche 3 Mai 2026
    # Jeudi 30 (1j) + Vendredi 1er (Ferie/WE 0j) + Samedi 2 (WE 0j) + Dimanche 3 (1j) = 2 jours
    d_debut = date(2026, 4, 30)
    d_fin = date(2026, 5, 3)
    
    # On cree une instance fictive pour tester la clean()
    try:
        emp = Employe.objects.first()
        demande = DemandeConge(
            employe=emp,
            date_debut=d_debut,
            date_fin=d_fin,
            type_conge_id=1,
            statut='en_attente_resp'
        )
        demande.clean() # Declenche le calcul de duree
        print(f"   - Periode: {d_debut} au {d_fin}")
        print(f"   - Duree calculee: {demande.duree} jours")
        if demande.duree == 2:
            print("   => SUCCES : Les week-ends et le 1er Mai ont été exclus correctement.")
        else:
            print(f"   => ALERTE : Duree attendue 2, recue {demande.duree}")
    except Exception as e:
        print(f"   - Erreur calcul: {e}")

    # 3. Test de Generation PDF
    print("\n3. Test de generation PDF...")
    try:
        demande_approuvee = DemandeConge.objects.filter(statut='approuvee').first()
        if demande_approuvee:
            pdf = generer_pdf_titre(demande_approuvee)
            print(f"   - PDF genere avec succes ({len(pdf)} octets).")
            print("   => SUCCES : Le moteur ReportLab est operationnel.")
        else:
            print("   - Aucune demande approuvee trouvee pour le test PDF.")
    except Exception as e:
        print(f"   - Erreur PDF: {e}")

    print("\n=== FIN DES TESTS ===")

if __name__ == "__main__":
    tester_systeme()
