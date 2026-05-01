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
    
    # Filiales / Sous-structures
    tech, _ = Structure.objects.get_or_create(libelle="Air Algérie Technics", niveau="Filiale", parent=dg)
    cargo, _ = Structure.objects.get_or_create(libelle="Air Algérie Cargo", niveau="Filiale", parent=dg)
    pn, _ = Structure.objects.get_or_create(libelle="Personnel Navigant (PN)", niveau="Sous-direction", parent=doa)
    pnc, _ = Structure.objects.get_or_create(libelle="Personnel Navigant Commercial (PNC)", niveau="Service", parent=pn)

    # 4. FONCTIONS
    f_pnc, _ = Fonction.objects.get_or_create(libelle="Hôtesse / Steward")
    f_pilote, _ = Fonction.objects.get_or_create(libelle="Commandant de bord")
    f_rh, _ = Fonction.objects.get_or_create(libelle="Responsable Ressources Humaines")
    f_drh, _ = Fonction.objects.get_or_create(libelle="Directeur des Ressources Humaines")
    f_mec, _ = Fonction.objects.get_or_create(libelle="Ingénieur Maintenance Aéronautique")
    f_resp_tech, _ = Fonction.objects.get_or_create(libelle="Responsable Technique Aéronautique")
    f_resp_pn, _ = Fonction.objects.get_or_create(libelle="Responsable du Personnel Navigant")

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
        # Responsable RH (validation finale des congés)
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
        # Responsable du Personnel Navigant
        {
            "email": "redha.boutaleb@airalgerie.dz", "role": "responsable_hierarchique",
            "matricule": "AH-1002", "prenom": "Redha", "nom": "Boutaleb", "structure": pn, "fonction": f_resp_pn, "categorie": "navigant"
        }
    ]

    for data in employes_data:
        # Création du compte 
        if not CustomUser.objects.filter(email=data["email"]).exists():
            is_staff = data["role"] in ['directeur_rh', 'responsable_rh']
            user = CustomUser.objects.create_user(
                username=data["email"], # Le username = email
                email=data["email"],
                password="password123",
                role=data["role"],
                is_staff=is_staff,
                first_name=data["prenom"],
                last_name=data["nom"]
            )
            
            # Création du profil RH
            emp = Employe.objects.create(
                matricule=data["matricule"],
                prenomEmpl=data["prenom"],
                nomEmpl=data["nom"],
                dateRecrutement=date(2018, 5, 10),
                structure=data["structure"],
                fonction=data["fonction"],
                categorie=data.get("categorie", "sol") # Par défaut sol
            )
            
            # Lier l'utilisateur à l'employé
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
        tech.responsable = karim
        tech.save()
        print(f"Assigné {karim} comme responsable de la structure {tech.libelle}")
    
    if redha:
        pn.responsable = redha
        pn.save()
        # On assigne aussi pnc sous redha pour qu'il gère toute la branche PN
        pnc.responsable = redha
        pnc.save()
        print(f"Assigné {redha} comme responsable des structures PN et PNC")

    if tarik:
        drh.responsable = tarik
        drh.save()
        print(f"Assigné {tarik} comme responsable de la DRH")

    print("\nTermine ! Base de donnees realiste Air Algerie prete pour React.")

if __name__ == '__main__':
    run()
