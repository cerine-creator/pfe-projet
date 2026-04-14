from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import (
    IsEmploye,
    IsResponsableHierarchique,
    IsHRStaff,
    IsHRStaffOrAdmin,
)
from .models import Employe, DemandeConge, Notification
from .serializers import EmployeSerializer, DemandeCongeSerializer, NotificationSerializer


class EmployeViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les profils Employé.
    - Lecture : tout employé authentifié
    - Écriture (create/update/delete) : équipe RH ou superadmin
    """
    queryset = Employe.objects.select_related('responsable').all()
    serializer_class = EmployeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'mon_equipe']:
            return [IsEmploye()]
        return [IsHRStaffOrAdmin()]

    @action(detail=False, methods=['get'], permission_classes=[IsResponsableHierarchique])
    def mon_equipe(self, request):
        """GET /api/employes/mon_equipe/ — liste des membres de l'équipe du responsable."""
        employe = request.user.employe
        if not employe:
            return Response({'detail': "Votre compte n'est lié à aucun profil employé."}, status=400)
        equipe = employe.equipe_sous_responsabilite
        serializer = self.get_serializer(equipe, many=True)
        return Response(serializer.data)


class DemandeCongeViewSet(viewsets.ModelViewSet):
    """
    Gestion des demandes de congé avec filtrage par rôle.
    - Employé : voit et soumet ses propres demandes
    - Responsable hiérarchique : voit les demandes de son équipe, peut valider
    - RH (responsable ou directeur) : voit tout, peut approuver/refuser
    """
    serializer_class = DemandeCongeSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh']:
            return DemandeConge.objects.select_related('employe').all()

        if user.role == 'responsable_hierarchique':
            employe = user.employe
            if employe:
                equipe_ids = employe.equipe_sous_responsabilite.values_list('id', flat=True)
                return DemandeConge.objects.filter(employe__in=equipe_ids)
            return DemandeConge.objects.none()

        # Employé simple — uniquement ses propres demandes
        employe = user.employe
        if employe:
            return DemandeConge.objects.filter(employe=employe)
        return DemandeConge.objects.none()

    def perform_create(self, serializer):
        """Associe automatiquement la demande à l'employé courant."""
        employe = self.request.user.employe
        if not employe:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Votre compte n'est lié à aucun profil employé.")
        serializer.save(employe=employe)

    @action(detail=True, methods=['post'], permission_classes=[IsResponsableHierarchique])
    def valider_responsable(self, request, pk=None):
        """POST /api/demandes/{id}/valider_responsable/ — validation hiérarchique."""
        demande = self.get_object()
        employe = request.user.employe
        demande.valider_par_responsable(employe)

        # Notifier l'équipe RH
        rh_employes = Employe.objects.filter(compte__role__in=['responsable_rh', 'directeur_rh'])
        for rh in rh_employes:
            Notification.objects.create(
                destinataire=rh,
                message=f"Demande de {demande.employe} validée par le responsable — en attente RH.",
                lien=f"/demandes/{demande.id}",
            )
        return Response({'status': 'Validée par le responsable hiérarchique.'})

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def approuver_rh(self, request, pk=None):
        """POST /api/demandes/{id}/approuver_rh/ — approbation finale RH."""
        demande = self.get_object()
        employe = request.user.employe
        demande.approuver_par_rh(employe)

        Notification.objects.create(
            destinataire=demande.employe,
            message="Votre demande de congé a été approuvée par le service RH.",
            lien=f"/demandes/{demande.id}",
        )
        return Response({'status': 'Approuvée par le service RH.'})

    @action(detail=True, methods=['post'], permission_classes=[IsHRStaff])
    def refuser(self, request, pk=None):
        """POST /api/demandes/{id}/refuser/ — refus avec motif obligatoire."""
        demande = self.get_object()
        raison = request.data.get('raison', '').strip()
        if not raison:
            return Response({'raison': 'Le motif de refus est obligatoire.'}, status=400)

        demande.refuser(raison, request.user.employe)

        Notification.objects.create(
            destinataire=demande.employe,
            message=f"Votre demande de congé a été refusée : {raison}",
            lien=f"/demandes/{demande.id}",
        )
        return Response({'status': 'Refusée.'})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture des notifications de l'utilisateur courant.
    Action personnalisée pour marquer comme lue.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        employe = self.request.user.employe
        if not employe:
            return Notification.objects.none()
        return Notification.objects.filter(destinataire=employe).order_by('-date_creation')

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        """POST /api/notifications/{id}/marquer_lue/"""
        notif = self.get_object()
        notif.lu = True
        notif.save()
        return Response({'status': 'Notification marquée comme lue.'})
