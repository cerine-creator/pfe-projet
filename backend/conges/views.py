from django.db import transaction
from django.db.models import Q, F
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import (
    IsEmploye,
    IsResponsableHierarchique,
    IsHRStaff,
    IsHRStaffOrAdmin,
)
from .models import (
    Structure, Fonction, TypeConge, Exercice,
    Employe, DroitConge, DemandeConge, Notification, CalendarNote
)
from .serializers import (
    StructureSerializer, FonctionSerializer, TypeCongeSerializer, ExerciceSerializer,
    EmployeSerializer, DroitCongeSerializer, DemandeCongeSerializer, NotificationSerializer, CalendarNoteSerializer
)
from .services import deduire_solde_conge
from .pdf_utils import generer_pdf_titre, generer_pdf_archive

class StructureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Structure.objects.all()
    serializer_class = StructureSerializer
    permission_classes = [IsEmploye]

class FonctionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fonction.objects.all()
    serializer_class = FonctionSerializer
    permission_classes = [IsEmploye]

class TypeCongeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TypeConge.objects.all()
    serializer_class = TypeCongeSerializer
    permission_classes = [IsEmploye]

class ExerciceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Exercice.objects.all()
    serializer_class = ExerciceSerializer
    permission_classes = [IsEmploye]

class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.select_related('structure', 'fonction').all()
    serializer_class = EmployeSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'mon_equipe']:
            return [IsEmploye()]
        return [IsHRStaffOrAdmin()]

    @action(detail=False, methods=['get'], permission_classes=[IsEmploye])
    def me(self, request):
        """GET /api/employes/me/ — Profil employé de l'utilisateur connecté."""
        employe = getattr(request.user, 'employe', None)
        if employe is None:
            return Response(
                {'detail': "Votre compte n'est pas lié à un profil employé."},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(employe)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsResponsableHierarchique])
    def mon_equipe(self, request):
        employe = getattr(request.user, 'employe', None)
        if not employe:
            return Response({'detail': "Profil non trouvé."}, status=400)
        
        structure_dirigee = getattr(employe, 'structure_dirigee', None)
        if not structure_dirigee:
            return Response({'detail': "Vous n'êtes assigné comme responsable d'aucune structure."}, status=400)
        
        # Filtre: Les employés de la structure que gère ce responsable
        equipe = Employe.objects.filter(structure=structure_dirigee).exclude(id=employe.id)
        serializer = self.get_serializer(equipe, many=True)
        return Response(serializer.data)

class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        user = self.request.user
        
        base_qs = DemandeConge.objects.select_related('employe', 'type_conge', 'exercice')

        # Pour les actions de validation et d'export, le manager/RH a besoin d'accéder à la demande d'un autre employé
        if self.action in ['valider_responsable', 'refuser_responsable', 'approuver_rh', 'refuser', 'retrieve', 'exporter_pdf']:
            if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh', 'responsable_hierarchique']:
                return base_qs.all()

        # L'endpoint de base /api/demandes/ retourne TOUJOURS les demandes
        # du compte connecté (ses propres congés), par défaut.
        employe = getattr(user, 'employe', None)
        if employe:
            return base_qs.filter(employe=employe)
        return DemandeConge.objects.none()

    @action(detail=False, methods=['get'])
    def a_valider(self, request):
        """GET /api/demandes/a_valider/ — Les demandes que ce compte doit valider."""
        user = self.request.user
        urgence_filter = request.query_params.get('urgence', None)

        # DRH / RH voient tout
        if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh']:
            demandes = DemandeConge.objects.select_related('employe', 'type_conge', 'exercice').filter(statut='en_attente_rh')
            serializer = self.get_serializer(demandes, many=True)
            data = list(serializer.data)
            if urgence_filter:
                data = [d for d in data if d.get('urgence_badge') == urgence_filter]
            return Response(data)

        # Le responsable hiérarchique voit les demandes
        if user.role == 'responsable_hierarchique':
            employe = getattr(user, 'employe', None)
            if employe and hasattr(employe, 'structure_dirigee') and employe.structure_dirigee:
                structure_dirigee = employe.structure_dirigee
                
                demandes_base = DemandeConge.objects.select_related('employe', 'type_conge', 'exercice').filter(
                    employe__structure=structure_dirigee,
                    statut='en_attente_resp'
                ).exclude(employe=employe)
                
                demandes_filiales = DemandeConge.objects.select_related('employe', 'type_conge', 'exercice').filter(
                    employe__structure__parent=structure_dirigee,
                    employe__structure__responsable=F('employe'),
                    statut='en_attente_resp'
                )
                
                demandes = (demandes_base | demandes_filiales).distinct()
                serializer = self.get_serializer(demandes, many=True)
                data = list(serializer.data)
                if urgence_filter:
                    data = [d for d in data if d.get('urgence_badge') == urgence_filter]
                return Response(data)

        return Response([])

    @action(detail=False, methods=['post'], permission_classes=[IsHRStaffOrAdmin])
    def expirer_demandes(self, request):
        """POST /api/demandes/expirer_demandes/ — Expire automatiquement les demandes
        dont la date_debut est passee et qui sont toujours en attente.
        Envoie une notification a l'employe concerne et au manager.
        """
        from django.utils import timezone

        today = timezone.now().date()
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

            # Notifier l'employe
            if hasattr(demande.employe, 'compte') and demande.employe.compte:
                Notification.objects.create(
                    utilisateur=demande.employe.compte,
                    description=(
                        f"Votre demande de conge du {demande.date_debut} au {demande.date_fin} "
                        f"a expire automatiquement car elle n'a pas ete traitee avant la date de debut."
                    )
                )

            # Notifier le responsable si la demande etait encore chez lui
            if statut_avant == 'en_attente_resp':
                responsable = getattr(demande.employe.structure, 'responsable', None)
                if responsable and hasattr(responsable, 'compte') and responsable.compte:
                    Notification.objects.create(
                        utilisateur=responsable.compte,
                        description=(
                            f"La demande de conge de {demande.employe.prenomEmpl} {demande.employe.nomEmpl} "
                            f"({demande.date_debut} -> {demande.date_fin}) a expire sans traitement de votre part."
                        )
                    )

        return Response({
            'status': f"{count} demande(s) expiree(s) avec succes.",
            'count': count
        })

    @action(detail=False, methods=['get'])
    def historique(self, request):
        """GET /api/demandes/historique/ — Historique pour RH/manager."""
        user = self.request.user
        statut_filter = request.query_params.get('statut')
        demandes = DemandeConge.objects.none()

        if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh']:
            demandes = DemandeConge.objects.filter(statut__in=['approuvee', 'refusee'])
        elif user.role == 'responsable_hierarchique':
            employe = getattr(user, 'employe', None)
            if employe and hasattr(employe, 'structure_dirigee') and employe.structure_dirigee:
                structure_dirigee = employe.structure_dirigee
                # Le manager voit : ses refusés, ses approuvés, ET ceux qu'il a validés mais qui attendent les RH
                demandes = DemandeConge.objects.filter(
                    Q(employe__structure=structure_dirigee) |
                    Q(employe__structure__parent=structure_dirigee, employe__structure__responsable=F('employe'))
                ).filter(statut__in=['approuvee', 'refusee', 'en_attente_rh']).distinct()

        if statut_filter in ['approuvee', 'refusee']:
            demandes = demandes.filter(statut=statut_filter)

        serializer = self.get_serializer(demandes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsHRStaff])
    def stats_drh(self, request):
        """GET /api/demandes/stats_drh/ — Statistiques pour le DRH."""
        from django.utils import timezone
        from datetime import datetime

        # Employés en congé actuellement
        today = timezone.now().date()
        employes_en_conge = DemandeConge.objects.filter(
            statut='approuvee',
            date_debut__lte=today,
            date_fin__gte=today
        ).select_related('employe').distinct()

        employes_absents = []
        for demande in employes_en_conge:
            employes_absents.append({
                'id': demande.employe.id,
                'nom': f"{demande.employe.prenomEmpl} {demande.employe.nomEmpl}",
                'structure': demande.employe.structure.libelle if demande.employe.structure else 'N/A',
                'date_debut': demande.date_debut,
                'date_fin': demande.date_fin,
                'type_conge': demande.type_conge.nomType if demande.type_conge else 'N/A'
            })

        # Nombre total d'employés
        total_employes = Employe.objects.count()

        # Employés présents (total - absents)
        employes_presents = total_employes - len(employes_absents)

        # Demandes ce mois par structure (seulement les Directions)
        current_month = timezone.now().month
        current_year = timezone.now().year

        demandes_par_structure = []
        structures = Structure.objects.filter(niveau__icontains='Direction')
        for structure in structures:
            count = DemandeConge.objects.filter(
                employe__structure=structure,
                dateDemande__month=current_month,
                dateDemande__year=current_year
            ).count()
            demandes_par_structure.append({
                'structure': structure.libelle,
                'demandes': count
            })

        # Employé avec le plus de congés (Exercice actuel)
        employe_plus_conges = None
        current_exercice = Exercice.objects.filter(est_cloture=False).first()
        if current_exercice:
            top_droit = DroitConge.objects.filter(exercice=current_exercice).order_by('-nbrJConsome').first()
            if top_droit and top_droit.nbrJConsome > 0:
                employe_plus_conges = {
                    'id': top_droit.employe.id,
                    'nom': f"{top_droit.employe.prenomEmpl} {top_droit.employe.nomEmpl}",
                    'structure': top_droit.employe.structure.libelle if top_droit.employe.structure else 'N/A',
                    'jours_consommes': top_droit.nbrJConsome
                }

        return Response({
            'employes_en_conge': len(employes_absents),
            'employes_absents': employes_absents,
            'employes_presents': employes_presents,
            'total_employes': total_employes,
            'demandes_ce_mois_par_structure': demandes_par_structure,
            'employe_plus_conges': employe_plus_conges
        })

    def perform_create(self, serializer):
        employe = getattr(self.request.user, 'employe', None)
        if not employe:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Votre compte n'est lié à un profil employé.")
        
        # Gestion du justificatif
        print("--- DEBUG REQUEST DATA ---")
        print("request.data:", self.request.data)
        print("request.FILES:", self.request.FILES)
        
        justificatif_file = self.request.FILES.get('justificatif')
        
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        # Validation : est-ce que c'est un congé maladie ou exceptionnel ?
        type_conge = serializer.validated_data.get('type_conge')
        if type_conge and (type_conge.est_exceptionnel or 'maladie' in type_conge.nomType.lower()):
            if not justificatif_file:
                raise DRFValidationError({'error': f"Un justificatif est obligatoire pour un congé de type : {type_conge.nomType}."})
            
        # Sauvegarde de la demande avec gestion des erreurs de validation du modèle
        try:
            demande = serializer.save(employe=employe, justificatif=justificatif_file)
        except DjangoValidationError as e:
            if hasattr(e, 'messages'):
                raise DRFValidationError({'error': e.messages[0]})
            raise DRFValidationError({'error': str(e)})
        
        # Cas spécial : Responsable RH - demande va directement au DRH
        if hasattr(employe, 'compte') and employe.compte and employe.compte.role == 'responsable_rh':
            demande.statut = 'en_attente_rh'
            demande.save()
            # Notifier le DRH
            drh_employes = Employe.objects.filter(compte__role='directeur_rh')
            for drh in drh_employes:
                if hasattr(drh, 'compte') and drh.compte:
                    Notification.objects.create(
                        utilisateur=drh.compte,
                        description=f"Demande de congé du Responsable RH {employe.prenomEmpl} {employe.nomEmpl} en attente de validation."
                    )
            return
        
        # Vérifions si cet employé est le chef de sa propre structure
        est_chef_structure = (employe.structure and getattr(employe.structure, 'responsable', None) == employe)
        
        if est_chef_structure:
            structure_parent = employe.structure.parent
            if structure_parent and getattr(structure_parent, 'responsable', None) and structure_parent.responsable.compte:
                Notification.objects.create(
                    utilisateur=structure_parent.responsable.compte,
                    description=f"Nouvelle demande de votre N-1 : {employe.prenomEmpl} {employe.nomEmpl} a soumis une demande."
                )
            else:
                # Il est au sommet, sa demande passe directement à RH
                demande.statut = 'en_attente_rh'
                demande.save()
                rh_employes = Employe.objects.filter(compte__role__in=['responsable_rh', 'directeur_rh'])
                for rh in rh_employes:
                    if hasattr(rh, 'compte') and rh.compte:
                        Notification.objects.create(
                            utilisateur=rh.compte,
                            description=f"Demande N+1 directe de {employe.prenomEmpl} {employe.nomEmpl} (Chef de structure). Validée vers RH."
                        )
        else:
            manager = getattr(employe.structure, 'responsable', None) if employe.structure else None
            if manager and hasattr(manager, 'compte') and manager.compte:
                Notification.objects.create(
                    utilisateur=manager.compte,
                    description=f"Nouvelle demande de congé en attente : {employe.prenomEmpl} {employe.nomEmpl} a soumis une demande."
                )
            else:
                # CAS 1.1.12 : Pas de responsable trouvé -> Escalade RH directe pour éviter le blocage
                demande.statut = 'en_attente_rh'
                demande.save()
                rh_employes = Employe.objects.filter(compte__role__in=['responsable_rh', 'directeur_rh'])
                for rh in rh_employes:
                    if hasattr(rh, 'compte') and rh.compte:
                        Notification.objects.create(
                            utilisateur=rh.compte,
                            description=f"Demande de {employe.prenomEmpl} {employe.nomEmpl} (Sans responsable direct). Escaladée vers RH."
                        )
    @action(detail=True, methods=['post'], permission_classes=[IsResponsableHierarchique])
    def valider_responsable(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'en_attente_resp':
            return Response({'detail': "Statut invalide pour cette action."}, status=400)
            
        responsable_employe = getattr(request.user, 'employe', None)
        
        est_demandeur_chef = (demande.employe.structure and getattr(demande.employe.structure, 'responsable', None) == demande.employe)
        if est_demandeur_chef:
            parent = demande.employe.structure.parent
            if not parent or getattr(parent, 'responsable', None) != responsable_employe:
                return Response({'detail': "Action interdite. Chef de structure sans N+1 direct ou vous n'êtes pas son dirigeant parent."}, status=403)
        else:
            if not demande.employe.structure or getattr(demande.employe.structure, 'responsable', None) != responsable_employe:
                return Response({'detail': "Vous n'êtes pas le responsable désigné de la structure de cet employé."}, status=403)

        DemandeConge.objects.filter(pk=demande.pk).update(statut='en_attente_rh')
        demande.refresh_from_db()
        
        # Récupérer les employés RH pour les notifier (ceux dont l'user lié a un rôle RH)
        rh_employes = Employe.objects.filter(compte__role__in=['responsable_rh', 'directeur_rh'])
        for rh in rh_employes:
            if hasattr(rh, 'compte') and rh.compte:
                Notification.objects.create(
                    utilisateur=rh.compte,
                    description=f"La demande de {demande.employe} a été validée par la hiérarchie. En attente de traitement."
                )
        return Response({'status': 'Validée par le responsable'})

    @action(detail=True, methods=['post'], permission_classes=[IsResponsableHierarchique])
    def refuser_responsable(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'en_attente_resp':
            return Response({'detail': "Statut invalide pour cette action."}, status=400)
            
        responsable_employe = getattr(request.user, 'employe', None)
        
        est_demandeur_chef = (demande.employe.structure and getattr(demande.employe.structure, 'responsable', None) == demande.employe)
        if est_demandeur_chef:
            parent = demande.employe.structure.parent
            if not parent or getattr(parent, 'responsable', None) != responsable_employe:
                return Response({'detail': "Action interdite."}, status=403)
        else:
            if not demande.employe.structure or getattr(demande.employe.structure, 'responsable', None) != responsable_employe:
                return Response({'detail': "Vous n'êtes pas le responsable désigné de la structure de cet employé."}, status=403)

        raison = request.data.get('raison', 'Raison non spécifiée par le responsable')
        DemandeConge.objects.filter(pk=demande.pk).update(statut='refusee')
        demande.refresh_from_db()
        
        Notification.objects.create(
            utilisateur=demande.employe.compte,
            description=f"Votre demande de congé a été refusée par votre responsable hiérarchique. Motif : {raison}"
        )
        return Response({'status': 'Demande refusée par le responsable.'})

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def approuver_rh(self, request, pk=None):
        demande = self.get_object()
        user = request.user
        
        if demande.statut != 'en_attente_rh':
            return Response({'detail': "Cette demande ne peut pas être approuvée (Doit être en_attente_rh)."}, status=400)
            
        # Protection anti auto-approbation RH
        if demande.employe.compte == user:
            return Response({'detail': "Action Interdite : Vous ne pouvez pas auto-approuver votre propre demande de congé."}, status=403)
            
        # Escalade Directeur RH
        if hasattr(demande.employe, 'compte') and demande.employe.compte and demande.employe.compte.role == 'responsable_rh':
            if user.role != 'directeur_rh' and not user.is_superuser:
                return Response({'detail': "Seul le Directeur RH peut certifier la demande d'un Responsable RH."}, status=403)

        try:
            with transaction.atomic():
                # 1. On donne l'ordre au Service de déduire le solde
                deduire_solde_conge(demande)
                
                # 2. Sauvegarde du nouveau statut (sans déclencher clean())
                DemandeConge.objects.filter(pk=demande.pk).update(statut='approuvee')
                demande.refresh_from_db()

            Notification.objects.create(
                utilisateur=demande.employe.compte,
                description=f"Félicitations, votre demande a été approuvée."
            )
            return Response({'status': 'Totalement approuvée.'})
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def refuser(self, request, pk=None):
        demande = self.get_object()
        user = request.user

        if demande.employe.compte == user:
            return Response({'detail': "Action Interdite : Auto-rejet impossible."}, status=403)
            
        if hasattr(demande.employe, 'compte') and demande.employe.compte and demande.employe.compte.role == 'responsable_rh':
            if user.role != 'directeur_rh' and not user.is_superuser:
                return Response({'detail': "Seul le Directeur RH peut refuser la demande d'un Responsable RH."}, status=403)

        raison = request.data.get('raison', 'Raison non spécifiée')
        DemandeConge.objects.filter(pk=demande.pk).update(statut='refusee')
        demande.refresh_from_db()

        Notification.objects.create(
            utilisateur=demande.employe.compte,
            description=f"Votre demande de congé a malheureusement été refusée. Motif : {raison}"
        )
        return Response({'status': 'Demande refusée.'})

    @action(detail=True, methods=['get'], url_path='exporter_pdf', url_name='exporter_pdf')
    def exporter_pdf(self, request, pk=None):
        """Action : Génère et télécharge le titre de congé en PDF."""
        demande = self.get_object()
        
        if demande.statut != 'approuvee':
            return Response({'detail': "Le PDF n'est disponible que pour les demandes approuvées."}, status=400)
            
        pdf_content = generer_pdf_titre(demande)
        
        response = HttpResponse(content_type='application/pdf')
        filename = f"Titre-Conge-{demande.id}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.write(pdf_content)
        
        return response

    @action(detail=False, methods=['get'], url_path='exporter_archive', url_name='exporter_archive')
    def exporter_archive(self, request):
        """Action : Génère un PDF récapitulatif de toutes les demandes approuvées."""
        user = request.user
        employe_id = request.query_params.get('employe_id')
        
        # Si un ID est fourni, on vérifie si l'utilisateur a le droit (RH ou Manager)
        if employe_id:
            if not (user.is_superuser or user.role in ['responsable_rh', 'directeur_rh', 'responsable_hierarchique']):
                return Response({'detail': "Vous n'avez pas l'autorisation de voir l'archive d'un autre employé."}, status=403)
            employe = Employe.objects.filter(id=employe_id).first()
        else:
            employe = getattr(user, 'employe', None)

        if not employe:
            return Response({'detail': "Profil employé non trouvé."}, status=400)
            
        demandes = DemandeConge.objects.filter(employe=employe, statut='approuvee').order_by('-date_debut')
        
        pdf_content = generer_pdf_archive(employe, demandes)
        
        response = HttpResponse(content_type='application/pdf')
        filename = f"Archive-Conges-{employe.nomEmpl}-{employe.prenomEmpl}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.write(pdf_content)
        
        return response

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        return Notification.objects.filter(utilisateur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        notif.lu = True
        notif.save()
        return Response({'status': 'Notification marquée comme lue'})

class CalendarNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarNoteSerializer
    permission_classes = [IsHRStaff]

    def get_queryset(self):
        return CalendarNote.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
