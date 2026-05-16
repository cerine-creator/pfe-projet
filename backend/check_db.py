import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from conges.models import Employe, DroitConge, Exercice, DemandeConge

def check():
    emp = Employe.objects.filter(nomEmpl__icontains='Boutaleb').first()
    if not emp:
        print("Employee Boutaleb not found. All employees:")
        for e in Employe.objects.all():
            print(f"  - {e.prenomEmpl} {e.nomEmpl}")
        return

    print(f"Employee: {emp.prenomEmpl} {emp.nomEmpl}")
    print(f"Structure: {emp.structure}")
    
    rights = DroitConge.objects.filter(employe=emp)
    print("Rights:")
    for r in rights:
        print(f"  - Exercice: {r.exercice.libelle}, Res: {r.nbrJRes}")
        
    demandes = DemandeConge.objects.filter(employe=emp)
    print("Demandes:")
    for d in demandes:
        print(f"  - ID: {d.id}, Date: {d.date_debut}, Exercice: {d.exercice}, Solde at that time: ?")

    print("\nExercices list:")
    for ex in Exercice.objects.all():
        print(f"  - {ex.libelle}: {ex.date_debut} to {ex.date_fin} (Closed: {ex.est_cloture})")

if __name__ == '__main__':
    check()
