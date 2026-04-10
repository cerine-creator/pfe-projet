from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Employe, DemandeConge, Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_superuser']

class EmployeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    equipe_count = serializers.IntegerField(source='equipe_sous_responsabilite.count', read_only=True)
    
    class Meta:
        model = Employe
        fields = ['id', 'user', 'nom', 'prenom', 'email', 'matricule', 'role', 
                  'jours_conges_restants', 'date_embauche', 'service', 'responsable', 'equipe_count']

class DemandeCongeSerializer(serializers.ModelSerializer):
    employe_nom = serializers.CharField(source='employe.nom', read_only=True)
    duree = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = DemandeConge
        fields = '__all__'
        read_only_fields = ['statut', 'date_soumission', 'date_validation_responsable', 
                           'date_validation_admin', 'responsable_validation', 'admin_validation']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'