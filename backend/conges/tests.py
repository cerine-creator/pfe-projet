from datetime import date

from django.test import TestCase

from conges.models import (
    Exercice,
    Structure,
    Fonction,
    Employe,
    DroitConge,
    DemandeConge,
    TypeConge,
)
from conges.services import deduire_solde_conge


class CongeExceptionnelTest(TestCase):
    def setUp(self):
        self.exercice = Exercice.objects.create(
            libelle="2024/2025",
            date_debut=date(2024, 7, 1),
            date_fin=date(2025, 6, 30),
        )
        self.structure = Structure.objects.create(libelle="Service Test", niveau="Service")
        self.fonction = Fonction.objects.create(libelle="Employé Test")
        self.employe = Employe.objects.create(
            matricule="TEST001",
            nomEmpl="Test",
            prenomEmpl="User",
            dateRecrutement=date(2024, 1, 1),
            categorie="sol",
            structure=self.structure,
            fonction=self.fonction,
        )
        self.type_exceptionnel = TypeConge.objects.create(
            nomType="Mariage Personnel",
            est_exceptionnel=True,
        )
        self.type_annuel = TypeConge.objects.create(
            nomType="Congé Annuel (Payé)",
            est_exceptionnel=False,
        )
        self.droit = DroitConge.objects.create(
            employe=self.employe,
            exercice=self.exercice,
            nbrJCumule=30,
            nbrJConsome=0,
            nbrJRes=30,
        )

    def test_conge_exceptionnel_ne_deduit_pas_le_solde(self):
        demande = DemandeConge.objects.create(
            date_debut=date(2024, 8, 1),
            date_fin=date(2024, 8, 3),
            duree=3,
            employe=self.employe,
            exercice=self.exercice,
            type_conge=self.type_exceptionnel,
            statut="approuvee",
        )

        deduire_solde_conge(demande)
        self.droit.refresh_from_db()

        self.assertEqual(self.droit.nbrJRes, 30)
        self.assertEqual(self.droit.nbrJConsome, 0)

    def test_conge_annuel_deduit_le_solde(self):
        demande = DemandeConge.objects.create(
            date_debut=date(2024, 8, 10),
            date_fin=date(2024, 8, 12),
            duree=3,
            employe=self.employe,
            exercice=self.exercice,
            type_conge=self.type_annuel,
            statut="approuvee",
        )

        deduire_solde_conge(demande)
        self.droit.refresh_from_db()

        self.assertEqual(self.droit.nbrJRes, 27)
        self.assertEqual(self.droit.nbrJConsome, 3)
