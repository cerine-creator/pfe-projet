import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from backend.conges.models import Employe
from django.contrib.auth.models import User
from datetime import date

def create_dummy_data():
    print("Clearing old data...")
    Employe.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    
    # Ensure superadmin exists
    if not User.objects.filter(username='superadmin').exists():
        User.objects.create_superuser('superadmin', 'super@admin.com', 'admin123')
    
    print("Creating employees...")
    
    # 1. Responsable RH
    rh_user = User.objects.create_user('rh', 'rh@test.com', 'password123')
    rh = Employe.objects.create(
        user=rh_user, 
        nom='Martin', 
        prenom='Sophie', 
        email='rh@test.com', 
        matricule='RH001',
        role='responsable_rh',
        date_embauche=date(2020, 1, 15)
    )

    # 2. Responsable Hiérarchique (IT Manager)
    resp_user = User.objects.create_user('manager', 'manager@test.com', 'password123')
    resp = Employe.objects.create(
        user=resp_user, 
        nom='Dubois', 
        prenom='Pierre', 
        email='manager@test.com', 
        matricule='MGR001',
        role='responsable_hierarchique',
        service='IT',
        date_embauche=date(2018, 5, 10)
    )

    # 3. Employés in IT Team
    emp1_user = User.objects.create_user('employe1', 'emp1@test.com', 'password123')
    Employe.objects.create(
        user=emp1_user, 
        nom='Bernard', 
        prenom='Luc', 
        email='emp1@test.com', 
        matricule='EMP001',
        role='employe',
        service='IT',
        responsable=resp,
        date_embauche=date(2022, 3, 1)
    )

    emp2_user = User.objects.create_user('employe2', 'emp2@test.com', 'password123')
    Employe.objects.create(
        user=emp2_user, 
        nom='Petit', 
        prenom='Marie', 
        email='emp2@test.com', 
        matricule='EMP002',
        role='employe',
        service='IT',
        responsable=resp,
        date_embauche=date(2023, 8, 15)
    )

    # 4. Employé in HR Team
    emp3_user = User.objects.create_user('employe3', 'emp3@test.com', 'password123')
    Employe.objects.create(
        user=emp3_user, 
        nom='Roux', 
        prenom='Alice', 
        email='emp3@test.com', 
        matricule='EMP003',
        role='employe',
        service='HR',
        responsable=rh,
        date_embauche=date(2021, 11, 20)
    )

    print("Successfully created 1 HR Manager, 1 IT Manager, and 3 Employees!")

if __name__ == '__main__':
    create_dummy_data()
