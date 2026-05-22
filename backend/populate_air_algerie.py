import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from conges.models import Structure, Fonction, TypeConge, Exercice, Employe, DroitConge, DemandeConge
from conges.services import deduire_solde_conge
from accounts.models import CustomUser
import random
from datetime import timedelta

def run():
    print(" Nettoyage des anciennes demandes...")
    DemandeConge.objects.all().delete()
    print(" Lancement de la creation des donnees Air Algerie...")

    # 1. EXERCICE
    ex_2024, created = Exercice.objects.get_or_create(
        libelle="2024/2025", 
        date_debut=date(2024, 7, 1), 
        date_fin=date(2025, 6, 30)
    )
    
    # 2. TYPES DE CONGÉS
    annuel, _ = TypeConge.objects.get_or_create(nomType="Congé Annuel (Payé)", est_exceptionnel=False)
    sans_solde, _ = TypeConge.objects.get_or_create(nomType="Congé Sans Solde", est_exceptionnel=False)
    maladie, _ = TypeConge.objects.get_or_create(nomType="Maladie", est_exceptionnel=False)
    mariage, _ = TypeConge.objects.get_or_create(nomType="Mariage Personnel", est_exceptionnel=True)
    naissance, _ = TypeConge.objects.get_or_create(nomType="Naissance", est_exceptionnel=True)
    deces, _ = TypeConge.objects.get_or_create(nomType="Décès d'un proche", est_exceptionnel=True)

    # 3. STRUCTURES AIR ALGÉRIE
    dg, _ = Structure.objects.get_or_create(libelle="Direction Générale Holding", niveau="Direction Générale")
    doa, _ = Structure.objects.get_or_create(libelle="Direction des Opérations Aériennes", niveau="Direction", parent=dg)
    drh, _ = Structure.objects.get_or_create(libelle="Direction des Ressources Humaines", niveau="Direction", parent=dg)
    drh.est_structure_rh = True
    drh.save()
    
    tech, _ = Structure.objects.get_or_create(libelle="Air Algérie Technics", niveau="Filiale", parent=dg)
    cargo, _ = Structure.objects.get_or_create(libelle="Air Algérie Cargo", niveau="Filiale", parent=dg)
    pn, _ = Structure.objects.get_or_create(libelle="Personnel Navigant (PN)", niveau="Sous-direction", parent=doa)
    pnc, _ = Structure.objects.get_or_create(libelle="Personnel Navigant Commercial (PNC)", niveau="Service", parent=pn)

    # 4. FONCTIONS
    f_pnc, _ = Fonction.objects.get_or_create(libelle="Hôtesse / Steward")
    f_pilote, _ = Fonction.objects.get_or_create(libelle="Commandant de bord")
    f_rh, _ = Fonction.objects.get_or_create(libelle="Responsable RH")
    f_drh, _ = Fonction.objects.get_or_create(libelle="Directeur des Ressources Humaines")
    f_mec, _ = Fonction.objects.get_or_create(libelle="Ingénieur Maintenance Aéronautique")
    f_resp_tech, _ = Fonction.objects.get_or_create(libelle="Responsable Technique")
    f_resp_pn, _ = Fonction.objects.get_or_create(libelle="Responsable Personnel Navigant")
    f_resp_pnc, _ = Fonction.objects.get_or_create(libelle="Responsable PNC")
    f_resp_cargo, _ = Fonction.objects.get_or_create(libelle="Responsable Cargo")
    f_agent_cargo, _ = Fonction.objects.get_or_create(libelle="Agent de Fret")

    # 5. CRÉATION DES EMPLOYÉS
    employes_data = [
        {"email": "tarik.bensalah@airalgerie.dz", "role": "directeur_rh", "matricule": "AH-0010", "prenom": "Tarik", "nom": "Bensalah", "structure": drh, "fonction": f_drh, "categorie": "sol"},
        {"email": "karim.mansouri@airalgerie.dz", "role": "responsable_hierarchique", "matricule": "AH-1540", "prenom": "Karim", "nom": "Mansouri", "structure": tech, "fonction": f_resp_tech, "categorie": "sol"},
        {"email": "fatima.belmadi@airalgerie.dz", "role": "responsable_rh", "matricule": "AH-0255", "prenom": "Fatima", "nom": "Belmadi", "structure": drh, "fonction": f_rh, "categorie": "sol"},
        {"email": "amina.meziane@airalgerie.dz", "role": "employe", "matricule": "AH-5890", "prenom": "Amina", "nom": "Meziane", "structure": pnc, "fonction": f_pnc, "categorie": "navigant"},
        {"email": "samir.kaci@airalgerie.dz", "role": "employe", "matricule": "AH-8832", "prenom": "Samir", "nom": "Kaci", "structure": tech, "fonction": f_mec, "categorie": "sol"},
        {"email": "redha.boutaleb@airalgerie.dz", "role": "responsable_hierarchique", "matricule": "AH-1002", "prenom": "Redha", "nom": "Boutaleb", "structure": pn, "fonction": f_resp_pn, "categorie": "navigant"},
        {"email": "selma.pnc@airalgerie.dz", "role": "responsable_hierarchique", "matricule": "AH-2020", "prenom": "Selma", "nom": "Mansouri", "structure": pnc, "fonction": f_resp_pnc, "categorie": "navigant"},
        {"email": "mourad.khaldi@airalgerie.dz", "role": "responsable_hierarchique", "matricule": "AH-0888", "prenom": "Mourad", "nom": "Khaldi", "structure": cargo, "fonction": f_resp_cargo, "categorie": "sol"},
        {"email": "said.fret@airalgerie.dz", "role": "employe", "matricule": "AH-0444", "prenom": "Said", "nom": "Fret", "structure": cargo, "fonction": f_agent_cargo, "categorie": "sol"}
    ]

    all_emps = []
    for data in employes_data:
        user, u_created = CustomUser.objects.get_or_create(
            email=data["email"],
            defaults={
                "username": data["email"],
                "role": data["role"],
                "is_staff": data["role"] in ['directeur_rh', 'responsable_rh'],
                "first_name": data["prenom"],
                "last_name": data["nom"]
            }
        )
        if u_created: user.set_password("password123"); user.save()

        emp, e_created = Employe.objects.get_or_create(
            matricule=data["matricule"],
            defaults={
                "prenomEmpl": data["prenom"], "nomEmpl": data["nom"],
                "dateRecrutement": date(2020, 1, 1), "structure": data["structure"],
                "fonction": data["fonction"], "categorie": data["categorie"]
            }
        )
        if not user.employe: user.employe = emp; user.save()
        
        solde_initial = 45 if emp.categorie in ['navigant', 'sud'] else 30
        DroitConge.objects.update_or_create(
            employe=emp, exercice=ex_2024,
            defaults={'nbrJCumule': 0, 'nbrJRes': solde_initial, 'nbrJConsome': 0}
        )
        all_emps.append(emp)

    # Assignation Responsables
    tech.responsable = Employe.objects.get(matricule="AH-1540"); tech.save()
    pn.responsable = Employe.objects.get(matricule="AH-1002"); pn.save()
    drh.responsable = Employe.objects.get(matricule="AH-0010"); drh.save()
    cargo.responsable = Employe.objects.get(matricule="AH-0888"); cargo.save()
    pnc.responsable = Employe.objects.get(matricule="AH-2020"); pnc.save()

    # 7. CRÉATION D'UNE ARCHIVE RÉALISTE (DEMANDES PASSÉES APPROUVÉES)
    print("\n Generation de l'archive (demandes passees avec deduction de solde)...")
    
    types_possibles = [annuel, maladie, deces, naissance]
    
    # Faux PDF pour les tests
    from django.core.files.base import ContentFile
    dummy_pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000052 00000 n 0000000101 00000 n trailer<</Size 4/Root 1 0 R>> startxref 147 %%EOF"
    
    start_history = date(2024, 8, 1)
    
    for emp in all_emps:
        for i in range(2):
            d_start = start_history + timedelta(days=random.randint(0, 150))
            d_end = d_start + timedelta(days=random.randint(2, 8))
            
            type_c = random.choice(types_possibles)
            motif_str = None
            
            # Ajustement pour congés exceptionnels
            if type_c == naissance:
                d_end = d_start + timedelta(days=2) # 3 jours max
                motif_str = 'naissance'
            elif type_c == deces:
                d_end = d_start + timedelta(days=2) # 3 jours max
                motif_str = 'deces_proche'
            elif type_c == maladie:
                d_end = d_start + timedelta(days=random.randint(2, 5))
            
            # Vérifier chevauchement rapide
            if not DemandeConge.objects.filter(employe=emp, date_debut__lte=d_end, date_fin__gte=d_start).exists():
                demande = DemandeConge.objects.create(
                    employe=emp, type_conge=type_c,
                    date_debut=d_start, date_fin=d_end, motif=motif_str,
                    exercice=ex_2024, statut='approuvee'
                )
                
                # Ajout du justificatif
                if type_c == maladie or type_c.est_exceptionnel:
                    # upload a dummy PDF (this will upload to Cloudinary due to our settings)
                    demande.justificatif.save(f"justificatif_{emp.nomEmpl}_{i}.pdf", ContentFile(dummy_pdf_content), save=True)

                # DÉDUCTION DU SOLDE (seulement si non exceptionnel)
                if not type_c.est_exceptionnel:
                    try:
                        deduire_solde_conge(demande)
                        print(f" [Archive] {emp.nomEmpl} ({type_c.nomType}) : {demande.duree}j deduits (Nouveau solde: {emp.droits_conges.first().nbrJRes}j)")
                    except Exception as e:
                        print(f" [Erreur Solde] {emp.nomEmpl} : {e}")
                else:
                    print(f" [Archive] {emp.nomEmpl} ({type_c.nomType}) : Approuvée sans déduction de solde.")

    # 8. DEMANDES ACTUELLES / EN ATTENTE
    print("\n Ajout de demandes en attente pour les tests UI...")
    amina = Employe.objects.get(matricule="AH-5890")
    DemandeConge.objects.create(
        employe=amina, type_conge=annuel,
        date_debut=date(2025, 6, 1), date_fin=date(2025, 6, 10),
        exercice=ex_2024, statut='en_attente_resp'
    )
    
    samir = Employe.objects.get(matricule="AH-8832")
    demande_samir = DemandeConge.objects.create(
        employe=samir, type_conge=maladie,
        date_debut=date(2025, 6, 15), date_fin=date(2025, 6, 25),
        exercice=ex_2024, statut='en_attente_rh'
    )
    # Ajouter un justificatif pour la demande de Samir
    demande_samir.justificatif.save("justificatif_maladie_samir.pdf", ContentFile(dummy_pdf_content), save=True)

    print("\nTermine ! Base de donnees avec ARCHIVE, JUSTIFICATIFS et SOLDES a jour.")

if __name__ == '__main__':
    run()
