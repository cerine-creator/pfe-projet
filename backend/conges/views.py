from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Employe, DemandeConge, Notification
from .serializers import EmployeSerializer, DemandeCongeSerializer, NotificationSerializer, UserSerializer

class IsEmploye(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

class IsResponsable(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            employe = request.user.employe
            return employe.est_responsable
        except:
            return False

class IsAdminRH(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            employe = request.user.employe
            return employe.est_admin_rh or request.user.is_superuser
        except:
            return request.user.is_superuser

class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.all()
    serializer_class = EmployeSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsEmploye]
        else:
            permission_classes = [IsAdminRH]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'], permission_classes=[IsResponsable])
    def mon_equipe(self, request):
        employe = request.user.employe
        equipe = employe.equipe_sous_responsabilite
        serializer = self.get_serializer(equipe, many=True)
        return Response(serializer.data)

class DemandeCongeViewSet(viewsets.ModelViewSet):
    queryset = DemandeConge.objects.all()
    serializer_class = DemandeCongeSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DemandeConge.objects.none()
        
        try:
            employe = user.employe
            if employe.est_admin_rh or user.is_superuser:
                return DemandeConge.objects.all()
            elif employe.est_responsable:
                # Responsable voit les demandes de son équipe
                equipe_ids = employe.equipe_sous_responsabilite.values_list('id', flat=True)
                return DemandeConge.objects.filter(employe__in=equipe_ids)
            else:
                # Employé voit ses propres demandes
                return DemandeConge.objects.filter(employe=employe)
        except:
            return DemandeConge.objects.none()
    
    @action(detail=True, methods=['post'], permission_classes=[IsResponsable])
    def valider_responsable(self, request, pk=None):
        demande = self.get_object()
        employe = request.user.employe
        demande.valider_par_responsable(employe)
        
        # Create notification for HR admin
        Notification.objects.create(
            destinataire=Employe.objects.filter(role='responsable_rh').first(),
            message=f"Demande de {demande.employe.nom} en attente d'approbation RH",
            lien=f"/demandes/{demande.id}"
        )
        return Response({'status': 'validée par responsable'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminRH])
    def approuver_admin(self, request, pk=None):
        demande = self.get_object()
        employe = request.user.employe
        demande.approuver_par_admin(employe)
        
        # Create notification for employee
        Notification.objects.create(
            destinataire=demande.employe,
            message=f"Votre demande de congé a été approuvée",
            lien=f"/demandes/{demande.id}"
        )
        return Response({'status': 'approuvée'})
    
    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        demande = self.get_object()
        raison = request.data.get('raison', '')
        demande.refuser(raison, request.user.employe)
        
        Notification.objects.create(
            destinataire=demande.employe,
            message=f"Votre demande a été refusée: {raison}",
            lien=f"/demandes/{demande.id}"
        )
        return Response({'status': 'refusée'})
