import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from conges.models import Employe, DroitConge, Exercice, DemandeConge

def fix_db():
    print("Fixing database exercises and rights...")
    
    # 1. Créer l'exercice 2025/2026
    ex26, created = Exercice.objects.get_or_create(
        libelle='2025/2026',
        defaults={
            'date_debut': date(2025, 7, 1),
            'date_fin': date(2026, 6, 30),
            'est_cloture': False
        }
    )
    if created:
        print("Exercice 2025/2026 created.")
    else:
        # Update dates if they were None
        ex26.date_debut = date(2025, 7, 1)
        ex26.date_fin = date(2026, 6, 30)
        ex26.save()
        print("Exercice 2025/2026 updated.")

    # 2. Initialiser les droits pour 2025/2026 pour tous les employés
    employees = Employe.objects.all()
    rights_count = 0
    for emp in employees:
        droit, created = DroitConge.objects.get_or_create(
            employe=emp,
            exercice=ex26,
            defaults={
                'nbrJCumule': 30,
                'nbrJConsome': 0,
                'nbrJRes': 30
            }
        )
        if created:
            rights_count += 1
            
    print(f"Initialized rights for {rights_count} employees for 2025/2026.")

    # 3. Rattacher les demandes orphelines à l'exercice correct
    demandes_orphelines = DemandeConge.objects.filter(exercice=None)
    attach_count = 0
    for d in demandes_orphelines:
        # Trouver l'exercice pour d.date_debut
        ex = Exercice.objects.filter(date_debut__lte=d.date_debut, date_fin__gte=d.date_debut).first()
        if ex:
            DemandeConge.objects.filter(pk=d.pk).update(exercice=ex)
            attach_count += 1
            
    print(f"Attached {attach_count} orphan requests to their correct exercises.")

if __name__ == '__main__':
    fix_db()
