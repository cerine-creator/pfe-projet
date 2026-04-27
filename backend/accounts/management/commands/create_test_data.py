from django.core.management.base import BaseCommand
from accounts.models import CustomUser
from conges.models import Structure, Fonction, Employe, Exercice

class Command(BaseCommand):
    help = 'Génère ou réinitialise les données de test (structures, employés, comptes)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("=== DÉBUT DE LA CRÉATION DES DONNÉES DE TEST ==="))

        f_drh, _ = Fonction.objects.get_or_create(libelle="Directeur RH")
        f_rrh, _ = Fonction.objects.get_or_create(libelle="Responsable RH")
        f_chef_tech, _ = Fonction.objects.get_or_create(libelle="Responsable Technique")
        f_chef_serv, _ = Fonction.objects.get_or_create(libelle="Responsable Service")
        f_ing, _ = Fonction.objects.get_or_create(libelle="Ingénieur Système")
        f_tech, _ = Fonction.objects.get_or_create(libelle="Technicien")

        dg, _ = Structure.objects.get_or_create(libelle="Direction Générale", defaults={'niveau': 'Direction', 'est_structure_rh': False})

        dir_rh, _ = Structure.objects.get_or_create(libelle="Direction des Ressources Humaines", defaults={'niveau': 'Direction', 'parent': dg, 'est_structure_rh': True})
        dir_rh.est_structure_rh = True
        dir_rh.parent = dg
        dir_rh.save()

        serv_paie, _ = Structure.objects.get_or_create(libelle="Service Paie (RH)", defaults={'niveau': 'Service', 'parent': dir_rh, 'est_structure_rh': True})
        serv_paie.est_structure_rh = True
        serv_paie.parent = dir_rh
        serv_paie.save()

        dep_tech, _ = Structure.objects.get_or_create(libelle="Département Technique", defaults={'niveau': 'Département', 'parent': dg, 'est_structure_rh': False})
        dep_tech.parent = dg
        dep_tech.save()

        serv_maint, _ = Structure.objects.get_or_create(libelle="Service Maintenance", defaults={'niveau': 'Service', 'parent': dep_tech, 'est_structure_rh': False})
        serv_maint.parent = dep_tech
        serv_maint.save()

        ex, _ = Exercice.objects.get_or_create(libelle="2025/2026", defaults={'date_debut': '2025-07-01', 'date_fin': '2026-06-30'})

        users_data = [
            {'email': 'drh@airalgerie.dz', 'prenom': 'Karim', 'nom': 'DRH', 'role': 'directeur_rh', 'fonction': f_drh, 'structure': dir_rh, 'is_resp_of': dir_rh},
            {'email': 'resp.rh1@airalgerie.dz', 'prenom': 'Nadia', 'nom': 'RH', 'role': 'responsable_rh', 'fonction': f_rrh, 'structure': dir_rh, 'is_resp_of': None},
            {'email': 'resp.rh2@airalgerie.dz', 'prenom': 'Yassine', 'nom': 'Paie', 'role': 'responsable_rh', 'fonction': f_rrh, 'structure': serv_paie, 'is_resp_of': serv_paie},
            {'email': 'chef.tech@airalgerie.dz', 'prenom': 'Omar', 'nom': 'Tech', 'role': 'responsable_hierarchique', 'fonction': f_chef_tech, 'structure': dep_tech, 'is_resp_of': dep_tech},
            {'email': 'chef.maint@airalgerie.dz', 'prenom': 'Lyes', 'nom': 'Maint', 'role': 'responsable_hierarchique', 'fonction': f_chef_serv, 'structure': serv_maint, 'is_resp_of': serv_maint},
            {'email': 'ing.sys@airalgerie.dz', 'prenom': 'Amine', 'nom': 'Ing', 'role': 'employe', 'fonction': f_ing, 'structure': dep_tech, 'is_resp_of': None},
            {'email': 'tech@airalgerie.dz', 'prenom': 'Samir', 'nom': 'Reparateur', 'role': 'employe', 'fonction': f_tech, 'structure': serv_maint, 'is_resp_of': None},
        ]

        for d in users_data:
            emp, created = Employe.objects.update_or_create(
                matricule=d['email'].split('@')[0],
                defaults={
                    'nomEmpl': d['nom'],
                    'prenomEmpl': d['prenom'],
                    'dateRecrutement': '2020-01-01',
                    'structure': d['structure'],
                    'fonction': d['fonction']
                }
            )

            if d['is_resp_of']:
                d['is_resp_of'].responsable = emp
                d['is_resp_of'].save()

            CustomUser.objects.filter(email=d['email']).delete()
            user = CustomUser.objects.create(
                username=d['email'],
                email=d['email'],
                first_name=d['prenom'],
                last_name=d['nom'],
                role=d['role'],
                employe=emp
            )
            user.set_password('12345678910k')
            user.save()

        # Compte admin général si absent
        if not CustomUser.objects.filter(email='admin@airalgerie.dz').exists():
            CustomUser.objects.create_superuser('admin@airalgerie.dz', 'admin@airalgerie.dz', '12345678910k')

        self.stdout.write(self.style.SUCCESS("=== SUCCÈS : Données de test générées ! ==="))
        self.stdout.write(self.style.SUCCESS("- 1 Super Admin. (admin@airalgerie.dz)"))
        self.stdout.write(self.style.SUCCESS("- 7 Comptes Utilisateurs configurés !"))
        self.stdout.write(self.style.SUCCESS("- Mot de passe universel: 12345678910k"))
