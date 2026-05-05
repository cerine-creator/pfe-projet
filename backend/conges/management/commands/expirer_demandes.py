"""
Management command: expirer_demandes
Usage: python manage.py expirer_demandes
Purpose: Expire automatiquement les demandes de congé dont la date_debut
         est passée et dont le statut est encore 'en_attente_resp' ou 'en_attente_rh'.
         Envoie les notifications appropriées à l'employé et au responsable.
Planification recommandée (cron): 0 1 * * * (chaque nuit à 1h du matin)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from conges.models import DemandeConge, Notification


class Command(BaseCommand):
    help = (
        "Expire les demandes de congé dont la date_debut est passée "
        "sans avoir été traitées par le responsable ou les RH."
    )

    def handle(self, *args, **options):
        today = timezone.now().date()
        self.stdout.write(f"[{today}] Vérification des demandes expirées...")

        demandes_a_expirer = DemandeConge.objects.filter(
            date_debut__lt=today,
            statut__in=['en_attente_resp', 'en_attente_rh']
        )

        count = 0
        for demande in demandes_a_expirer:
            statut_avant = demande.statut
            demande.statut = 'expiree'
            demande.save()
            count += 1

            self.stdout.write(
                self.style.WARNING(
                    f"  → Expirée: Demande #{demande.id} de {demande.employe} "
                    f"({demande.date_debut} → {demande.date_fin}) | Était: {statut_avant}"
                )
            )

            # Notifier l'employé
            if hasattr(demande.employe, 'compte') and demande.employe.compte:
                Notification.objects.create(
                    utilisateur=demande.employe.compte,
                    description=(
                        f"⚠️ Votre demande de congé du {demande.date_debut} au {demande.date_fin} "
                        f"a expiré automatiquement car elle n'a pas été traitée avant la date de début. "
                        f"Veuillez soumettre une nouvelle demande."
                    )
                )

            # Notifier le responsable si la demande était encore chez lui
            if statut_avant == 'en_attente_resp':
                responsable = getattr(demande.employe.structure, 'responsable', None)
                if responsable and hasattr(responsable, 'compte') and responsable.compte:
                    Notification.objects.create(
                        utilisateur=responsable.compte,
                        description=(
                            f"⚠️ La demande de congé de {demande.employe.prenomEmpl} {demande.employe.nomEmpl} "
                            f"({demande.date_debut} → {demande.date_fin}) a expiré sans traitement de votre part. "
                            f"Merci de traiter les demandes avant leur date de début."
                        )
                    )

            # Notifier les RH si la demande était à l'étape RH
            elif statut_avant == 'en_attente_rh':
                from conges.models import Employe
                rh_employes = Employe.objects.filter(
                    compte__role__in=['responsable_rh', 'directeur_rh']
                )
                for rh in rh_employes:
                    if hasattr(rh, 'compte') and rh.compte:
                        Notification.objects.create(
                            utilisateur=rh.compte,
                            description=(
                                f"⚠️ La demande de congé de {demande.employe.prenomEmpl} {demande.employe.nomEmpl} "
                                f"({demande.date_debut} → {demande.date_fin}) a expiré en attente de validation RH."
                            )
                        )

        if count == 0:
            self.stdout.write(self.style.SUCCESS("  ✓ Aucune demande expirée. Tout est à jour."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"  ✓ {count} demande(s) expirée(s) avec succès.")
            )
