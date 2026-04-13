import os
import django
from datetime import date

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import CustomUser
from conges.models import Employe

def create_test_users():
    users_data = [
        {'username': 'employe_1', 'password': 'Password123!', 'role': 'employe', 'nom': 'Benali', 'prenom': 'Karim'},
        {'username': 'manager_1', 'password': 'Password123!', 'role': 'responsable_hierarchique', 'nom': 'Saidi', 'prenom': 'Nadia'},
        {'username': 'rh_1', 'password': 'Password123!', 'role': 'responsable_rh', 'nom': 'Zitouni', 'prenom': 'Amine'},
        {'username': 'drh_1', 'password': 'Password123!', 'role': 'directeur_rh', 'nom': 'Mansouri', 'prenom': 'Leila'},
    ]

    for i, data in enumerate(users_data):
        if not CustomUser.objects.filter(username=data['username']).exists():
            # Create Employe profile
            employe = Employe.objects.create(
                nom=data['nom'],
                prenom=data['prenom'],
                email=f"{data['username']}@airalgerie.dz",
                matricule=f"AA-{str(i+1).zfill(3)}",
                date_embauche=date(2020, 1, 1),
                service='Exploitation' if data['role'] in ['employe', 'responsable_hierarchique'] else 'Ressources Humaines'
            )
            # Create User
            user = CustomUser.objects.create_user(
                username=data['username'],
                email=employe.email,
                password=data['password'],
                role=data['role'],
                employe=employe
            )
            print(f"Crée: {data['username']} / {data['password']} (Rôle: {data['role']})")
        else:
            print(f"L'utilisateur {data['username']} existe déjà.")

if __name__ == '__main__':
    create_test_users()
