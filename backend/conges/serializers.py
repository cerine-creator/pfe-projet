from rest_framework import serializers
from .models import Employe, DemandeConge, Notification


class EmployeSerializer(serializers.ModelSerializer):
    equipe_count = serializers.IntegerField(
        source='equipe_sous_responsabilite.count', read_only=True
    )
    # Affiche le nom du responsable direct en lecture
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Employe
        fields = [
            'id',
            'nom',
            'prenom',
            'email',
            'matricule',
            'jours_conges_restants',
            'date_embauche',
            'service',
            'responsable',
            'responsable_nom',
            'equipe_count',
        ]

    def get_responsable_nom(self, obj):
        if obj.responsable:
            return f"{obj.responsable.prenom} {obj.responsable.nom}"
        return None


class DemandeCongeSerializer(serializers.ModelSerializer):
    employe_nom = serializers.SerializerMethodField()
    duree = serializers.IntegerField(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = DemandeConge
        fields = '__all__'
        read_only_fields = [
            'statut',
            'date_soumission',
            'date_validation_responsable',
            'date_validation_rh',
            'responsable_validation',
            'rh_validation',
            'employe',  # Assigné automatiquement dans perform_create
        ]

    def get_employe_nom(self, obj):
        return f"{obj.employe.prenom} {obj.employe.nom}"


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['destinataire', 'date_creation']