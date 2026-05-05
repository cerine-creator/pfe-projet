import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from conges.models import Structure, Fonction, TypeConge, Exercice, Employe, DroitConge
from accounts.models import CustomUser

def run():
    print(" Lancement de la creation des donnees Air Algerie...")

    # 1. EXERCICE
    ex_2024, created = Exercice.objects.get_or_create(
        libelle="2024/2025", 
        date_debut=date(2024, 7, 1), 
        date_fin=date(2025, 6, 30)
    )
    
    # 2. TYPES DE CONGÉS
    TypeConge.objects.get_or_create(nomType="Congé Annuel (Payé)", est_exceptionnel=False)
    TypeConge.objects.get_or_create(nomType="Congé Sans Solde", est_exceptionnel=False)
    TypeConge.objects.get_or_create(nomType="Maladie", est_exceptionnel=False)
    TypeConge.objects.get_or_create(nomType="Mariage Personnel", est_exceptionnel=True)
    TypeConge.objects.get_or_create(nomType="Naissance", est_exceptionnel=True)
    TypeConge.objects.get_or_create(nomType="Décès d'un proche", est_exceptionnel=True)

    # 3. STRUCTURES AIR ALGÉRIE (Haut niveau vers sous-directions)
    dg, _ = Structure.objects.get_or_create(libelle="Direction Générale Holding", niveau="Direction Générale")
    
    doa, _ = Structure.objects.get_or_create(libelle="Direction des Opérations Aériennes", niveau="Direction", parent=dg)
    drh, _ = Structure.objects.get_or_create(libelle="Direction des Ressources Humaines", niveau="Direction", parent=dg)
    drh.est_structure_rh = True
    drh.save()
    
    # Filiales / Sous-structures
    tech, _ = Structure.objects.get_or_create(libelle="Air Algérie Technics", niveau="Filiale", parent=dg)
    cargo, _ = Structure.objects.get_or_create(libelle="Air Algérie Cargo", niveau="Filiale", parent=dg)
    pn, _ = Structure.objects.get_or_create(libelle="Personnel Navigant (PN)", niveau="Sous-direction", parent=doa)
    pnc, _ = Structure.objects.get_or_create(libelle="Personnel Navigant Commercial (PNC)", niveau="Service", parent=pn)

    # 4. FONCTIONS
    f_pnc, _ = Fonction.objects.get_or_create(libelle="Hôtesse / Steward")
    f_pilote, _ = Fonction.objects.get_or_create(libelle="Commandant de bord")
    f_rh, _ = Fonction.objects.get_or_create(libelle="Responsable RH")            # contient 'respo' → valide pour rôle responsable_rh
    f_drh, _ = Fonction.objects.get_or_create(libelle="Directeur des Ressources Humaines")  # contient 'direc' → valide pour directeur_rh
    f_mec, _ = Fonction.objects.get_or_create(libelle="Ingénieur Maintenance Aéronautique")
    f_resp_tech, _ = Fonction.objects.get_or_create(libelle="Responsable Technique")
    f_resp_pn, _ = Fonction.objects.get_or_create(libelle="Responsable Personnel Navigant")
    f_resp_pnc, _ = Fonction.objects.get_or_create(libelle="Responsable PNC")
    f_resp_cargo, _ = Fonction.objects.get_or_create(libelle="Responsable Cargo")
    f_agent_cargo, _ = Fonction.objects.get_or_create(libelle="Agent de Fret")

    # 5. CRÉATION DES EMPLOYÉS + UTILISATEURS
    employes_data = [
        # Le DRH central (accès total)
        {
            "email": "tarik.bensalah@airalgerie.dz", "role": "directeur_rh",
            "matricule": "AH-0010", "prenom": "Tarik", "nom": "Bensalah", "structure": drh, "fonction": f_drh, "categorie": "sol"
        },
        # Responsable de la filiale Technics
        {
            "email": "karim.mansouri@airalgerie.dz", "role": "responsable_hierarchique",
            "matricule": "AH-1540", "prenom": "Karim", "nom": "Mansouri", "structure": tech, "fonction": f_resp_tech, "categorie": "sol"
        },
        # Un chargé RH (qui va traiter les validations finales)
        {
            "email": "fatima.belmadi@airalgerie.dz", "role": "responsable_rh",
            "matricule": "AH-0255", "prenom": "Fatima", "nom": "Belmadi", "structure": drh, "fonction": f_rh, "categorie": "sol"
        },
        # Des employés classiques (Personnel Navigant)
        {
            "email": "amina.meziane@airalgerie.dz", "role": "employe",
            "matricule": "AH-5890", "prenom": "Amina", "nom": "Meziane", "structure": pnc, "fonction": f_pnc, "categorie": "navigant"
        },
        {
            "email": "yacine.hadj@airalgerie.dz", "role": "employe",
            "matricule": "AH-4122", "prenom": "Yacine", "nom": "Hadj", "structure": pn, "fonction": f_pilote, "categorie": "navigant"
        },
        # Un employé sous la responsabilité de Karim Mansouri (Technics)
        {
            "email": "samir.kaci@airalgerie.dz", "role": "employe",
            "matricule": "AH-8832", "prenom": "Samir", "nom": "Kaci", "structure": tech, "fonction": f_mec, "categorie": "sol"
        },
        # PN (Personnel Navigant)
        {
            "email": "redha.boutaleb@airalgerie.dz", "role": "responsable_hierarchique",
            "matricule": "AH-1002", "prenom": "Redha", "nom": "Boutaleb", "structure": pn, "fonction": f_resp_pn, "categorie": "navigant"
        },
        {
            "email": "yacine.hadj@airalgerie.dz", "role": "employe",
            "matricule": "AH-4122", "prenom": "Yacine", "nom": "Hadj", "structure": pn, "fonction": f_pilote, "categorie": "navigant"
        },
        # PNC (Personnel Navigant Commercial)
        {
            "email": "selma.pnc@airalgerie.dz", "role": "responsable_hierarchique",
            "matricule": "AH-2020", "prenom": "Selma", "nom": "Mansouri", "structure": pnc, "fonction": f_resp_pnc, "categorie": "navigant"
        },
        {
            "email": "amina.meziane@airalgerie.dz", "role": "employe",
            "matricule": "AH-5890", "prenom": "Amina", "nom": "Meziane", "structure": pnc, "fonction": f_pnc, "categorie": "navigant"
        },
        # Cargo
        {
            "email": "mourad.khaldi@airalgerie.dz", "role": "responsable_hierarchique",
            "matricule": "AH-0888", "prenom": "Mourad", "nom": "Khaldi", "structure": cargo, "fonction": f_resp_cargo, "categorie": "sol"
        },
        {
            "email": "said.fret@airalgerie.dz", "role": "employe",
            "matricule": "AH-0444", "prenom": "Said", "nom": "Fret", "structure": cargo, "fonction": f_agent_cargo, "categorie": "sol"
        }
    ]

    for data in employes_data:
        # Création ou récupération du compte 
        user = CustomUser.objects.filter(email=data["email"]).first()
        if not user:
            is_staff = data["role"] in ['directeur_rh', 'responsable_rh']
            user = CustomUser.objects.create_user(
                username=data["email"],
                email=data["email"],
                password="password123",
                role=data["role"],
                is_staff=is_staff,
                first_name=data["prenom"],
                last_name=data["nom"]
            )
        
        # Création ou récupération du profil Employé
        emp, created = Employe.objects.get_or_create(
            matricule=data["matricule"],
            defaults={
                "prenomEmpl": data["prenom"],
                "nomEmpl": data["nom"],
                "dateRecrutement": date(2018, 5, 10),
                "structure": data["structure"],
                "fonction": data["fonction"],
                "categorie": data.get("categorie", "sol")
            }
        )
        
        # Force update if exists to ensure coherence (especially for fonctions)
        if not created:
            emp.structure = data["structure"]
            emp.fonction = data["fonction"]
            emp.save()
        
        # Lier l'utilisateur à l'employé s'il ne l'est pas déjà
        if not user.employe:
            user.employe = emp
            user.save()
            
            # Attribuer droits exercice par défaut selon la catégorie Air Algérie
            solde_initial = 45 if emp.categorie in ['navigant', 'sud'] else 30
            
            DroitConge.objects.update_or_create(
                employe=emp, 
                exercice=ex_2024, 
                defaults={
                    'nbrJCumule': 5, 
                    'nbrJRes': solde_initial
                }
            )
            print(f"Mise à jour de {emp.prenomEmpl} {emp.nomEmpl} ({data['role']}). Solde: {solde_initial}j")

    # 6. ASSIGNATION DES RESPONSABLES AUX STRUCTURES (Nouveau Flow Air Algérie)
    # On récupère les employés créés
    karim = Employe.objects.filter(compte__email="karim.mansouri@airalgerie.dz").first()
    redha = Employe.objects.filter(compte__email="redha.boutaleb@airalgerie.dz").first()
    tarik = Employe.objects.filter(compte__email="tarik.bensalah@airalgerie.dz").first()

    if karim:
        tech.refresh_from_db()
        if not tech.responsable:
            tech.responsable = karim
            tech.save()
        print(f"Assigné {karim} comme responsable de la structure {tech.libelle}")
    
    if redha:
        pn.refresh_from_db()
        if not pn.responsable:
            pn.responsable = redha
            pn.save()
        # pnc est une sous-structure de pn — Redha la gère indirectement via la hiérarchie
        print(f"Assigné {redha} comme responsable de la structure PN (PNC inclus par hiérarchie)")

    if tarik:
        drh.refresh_from_db()
        if not drh.responsable:
            drh.responsable = tarik
            drh.save()
        print(f"Assigné {tarik} comme responsable de la DRH")

    mourad = Employe.objects.filter(compte__email="mourad.khaldi@airalgerie.dz").first()
    if mourad:
        cargo.refresh_from_db()
        if not cargo.responsable:
            cargo.responsable = mourad
            cargo.save()
        print(f"Assigné {mourad} comme responsable de Cargo")

    selma = Employe.objects.filter(compte__email="selma.pnc@airalgerie.dz").first()
    if selma:
        pnc.refresh_from_db()
        if not pnc.responsable:
            pnc.responsable = selma
            pnc.save()
        print(f"Assigné {selma} comme responsable de PNC")

    # 7. CRÉATION DE DEMANDES DE CONGÉS POUR TESTS
    print("\n Création de demandes de congés pour test du workflow...")
    from conges.models import DemandeConge
    
    # 1. Amina (PNC) -> En attente de Selma (Manager PNC)
    amina = Employe.objects.get(compte__email="amina.meziane@airalgerie.dz")
    annuel = TypeConge.objects.get(nomType="Congé Annuel (Payé)")
    if not DemandeConge.objects.filter(employe=amina, statut='en_attente_resp').exists():
        DemandeConge.objects.create(
            employe=amina, type_conge=annuel,
            date_debut=date(2026, 6, 1), date_fin=date(2026, 6, 10),
            exercice=ex_2024, statut='en_attente_resp'
        )
        print(f"Workflow 1: Amina (PNC) -> En attente de son manager Selma")

    # 2. Samir (Technics) -> En attente RH (Déjà validé par Karim)
    samir = Employe.objects.get(compte__email="samir.kaci@airalgerie.dz")
    if not DemandeConge.objects.filter(employe=samir, statut='en_attente_rh').exists():
        DemandeConge.objects.create(
            employe=samir, type_conge=annuel,
            date_debut=date(2026, 7, 1), date_fin=date(2026, 7, 10),
            exercice=ex_2024, statut='en_attente_rh'
        )
        print(f"Workflow 2: Samir (Technics) -> En attente de validation RH (Fatima/Tarik)")

    # 3. Said (Cargo) -> Refusé
    said = Employe.objects.get(compte__email="said.fret@airalgerie.dz")
    if not DemandeConge.objects.filter(employe=said, statut='refusee').exists():
        DemandeConge.objects.create(
            employe=said, type_conge=annuel,
            date_debut=date(2026, 8, 20), date_fin=date(2026, 8, 25),
            exercice=ex_2024, statut='refusee'
        )
        print(f"Workflow 3: Said (Cargo) -> Déjà refusé")

    print("\nTermine ! Base de donnees realiste Air Algerie prete pour React.")

if __name__ == '__main__':
    run()
