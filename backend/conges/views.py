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
    Employe, DroitConge, DemandeConge, TitreConge, Notification
)
from .serializers import (
    StructureSerializer, FonctionSerializer, TypeCongeSerializer, ExerciceSerializer,
    EmployeSerializer, DroitCongeSerializer, DemandeCongeSerializer, TitreCongeSerializer, NotificationSerializer
)
from .services import deduire_solde_conge, generer_titre_conge_automatique

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
        
        structures_dirigees = employe.structures_dirigees.all()
        if not structures_dirigees.exists():
            return Response({'detail': "Vous n'êtes assigné comme responsable d'aucune structure."}, status=400)
        
        # Filtre: Les employés de toutes les structures que gère ce responsable
        equipe = Employe.objects.filter(structure__in=structures_dirigees).exclude(id=employe.id)
        serializer = self.get_serializer(equipe, many=True)
        return Response(serializer.data)

class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        user = self.request.user
        
        # Pour les actions de validation, le manager/RH a besoin d'accéder à la demande d'un autre employé
        if self.action in ['valider_responsable', 'refuser_responsable', 'approuver_rh', 'refuser', 'retrieve']:
            if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh', 'responsable_hierarchique']:
                return DemandeConge.objects.all()

        # L'endpoint de base /api/demandes/ retourne TOUJOURS les demandes
        # du compte connecté (ses propres congés), par défaut.
        employe = getattr(user, 'employe', None)
        if employe:
            return DemandeConge.objects.filter(employe=employe)
        return DemandeConge.objects.none()

    @action(detail=False, methods=['get'])
    def a_valider(self, request):
        """GET /api/demandes/a_valider/ — Les demandes que ce compte doit valider."""
        user = self.request.user

        # DRH / RH voient tout
        if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh']:
            demandes = DemandeConge.objects.all()
            serializer = self.get_serializer(demandes, many=True)
            return Response(serializer.data)

        # Le responsable hiérarchique voit les demandes des structures qu'il dirige (sauf les siennes)
        if user.role == 'responsable_hierarchique':
            employe = getattr(user, 'employe', None)
            if employe:
                structures_dirigees = employe.structures_dirigees.all()
                if structures_dirigees.exists():
                    demandes = DemandeConge.objects.filter(employe__structure__in=structures_dirigees, statut='en_attente_resp').exclude(employe=employe)
                    serializer = self.get_serializer(demandes, many=True)
                    return Response(serializer.data)

        return Response([])

    def perform_create(self, serializer):
        employe = getattr(self.request.user, 'employe', None)
        if not employe:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Votre compte n'est lié à un profil employé.")
        
        # Sauvegarde de la demande
        demande = serializer.save(employe=employe)
        
        # Envoi d'une notification au responsable hiérarchique
        if employe.structure and employe.structure.responsable and employe.structure.responsable.compte:
            Notification.objects.create(
                utilisateur=employe.structure.responsable.compte,
                description=f"Nouvelle demande de congé en attente : {employe.prenomEmpl} {employe.nomEmpl} a soumis une demande."
            )
    @action(detail=True, methods=['post'], permission_classes=[IsResponsableHierarchique])
    def valider_responsable(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'en_attente_resp':
            return Response({'detail': "Statut invalide pour cette action."}, status=400)
            
        responsable_employe = getattr(request.user, 'employe', None)
        if not responsable_employe or not demande.employe.structure or demande.employe.structure.responsable != responsable_employe:
            return Response({'detail': "Vous n'êtes pas le responsable désigné de la structure de cet employé."}, status=403)

        demande.statut = 'en_attente_rh'
        demande.save()
        
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
        if not responsable_employe or not demande.employe.structure or demande.employe.structure.responsable != responsable_employe:
            return Response({'detail': "Vous n'êtes pas le responsable désigné de la structure de cet employé."}, status=403)

        raison = request.data.get('raison', 'Raison non spécifiée par le responsable')
        demande.statut = 'refusee'
        demande.save()
        
        Notification.objects.create(
            utilisateur=demande.employe.compte,
            description=f"Votre demande de congé a été refusée par votre responsable hiérarchique. Motif : {raison}"
        )
        return Response({'status': 'Demande refusée par le responsable.'})

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def approuver_rh(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'en_attente_rh':
            return Response({'detail': "Cette demande ne peut pas être approuvée (Doit être en_attente_rh)."}, status=400)

        try:
            # 1. On donne l'ordre au Service de déduire le solde
            deduire_solde_conge(demande)
            
            # 2. Sauvegarde du nouveau statut
            demande.statut = 'approuvee'
            demande.save()
            
            # 3. On demande au Service de générer le document de validation (Titre)
            titre = generer_titre_conge_automatique(demande)

            Notification.objects.create(
                utilisateur=demande.employe.compte,
                description=f"Félicitations, votre demande a été approuvée (Réf: {titre.ref})"
            )
            return Response({'status': 'Totalement approuvée, Titre de congé généré', 'ref': titre.ref})
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def refuser(self, request, pk=None):
        demande = self.get_object()
        raison = request.data.get('raison', 'Raison non spécifiée')
        demande.statut = 'refusee'
        demande.save()

        Notification.objects.create(
            utilisateur=demande.employe.compte,
            description=f"Votre demande de congé a malheureusement été refusée. Motif : {raison}"
        )
        return Response({'status': 'Demande refusée.'})

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
