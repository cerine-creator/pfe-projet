from rest_framework import serializers
from .models import (
    Structure, Fonction, TypeConge, Exercice,
    Employe, DroitConge, DemandeConge, Notification, CalendarNote
)

class StructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Structure
        fields = '__all__'

class FonctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fonction
        fields = '__all__'

class TypeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeConge
        fields = '__all__'

class ExerciceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercice
        fields = '__all__'

class EmployeSerializer(serializers.ModelSerializer):
    # Pour que React reçoive les noms en texte au lieu des IDs
    structure_libelle = serializers.CharField(source='structure.libelle', read_only=True)
    fonction_libelle = serializers.CharField(source='fonction.libelle', read_only=True)
    email = serializers.CharField(source='compte.email', read_only=True)
    role = serializers.CharField(source='compte.role', read_only=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    
    # Récupérer les droits du compte pour affichage résumé si besoin
    solde_affichage = serializers.SerializerMethodField()

    class Meta:
        model = Employe
        fields = [
            'id', 'matricule', 'prenomEmpl', 'nomEmpl', 'numTel', 
            'dateRecrutement', 'categorie', 'categorie_display', 'structure', 'structure_libelle', 
            'fonction', 'fonction_libelle', 'email', 'role', 'solde_affichage'
        ]

    def get_solde_affichage(self, obj):
        # Pour une cohérence totale, on affiche le SOLDE TOTAL (Cumul de tous les exercices)
        from django.db.models import Sum
        return obj.droits_conges.aggregate(Sum('nbrJRes'))['nbrJRes__sum'] or 0

class DroitCongeSerializer(serializers.ModelSerializer):
    exercice_libelle = serializers.CharField(source='exercice.libelle', read_only=True)

    class Meta:
        model = DroitConge
        fields = ['id', 'nbrJCumule', 'nbrJConsome', 'nbrJRes', 'exercice', 'exercice_libelle']

class DemandeCongeSerializer(serializers.ModelSerializer):
    justificatif = serializers.FileField(required=False, allow_null=True)
    justificatif_url = serializers.FileField(source='justificatif', read_only=True)
    employe_noms = serializers.SerializerMethodField(read_only=True)
    employe_role = serializers.CharField(source='employe.compte.role', read_only=True, default='')
    type_conge_nom = serializers.CharField(source='type_conge.nomType', read_only=True)
    motif_display = serializers.CharField(source='get_motif_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    exercice_libelle = serializers.CharField(source='exercice.libelle', read_only=True)
    delai_jours = serializers.SerializerMethodField(read_only=True)
    urgence_badge = serializers.SerializerMethodField(read_only=True)
    employe_solde = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DemandeConge
        fields = [
            'id', 'employe', 'employe_noms', 'employe_role', 'exercice', 'exercice_libelle', 'type_conge',
            'type_conge_nom', 'date_debut', 'date_fin', 'duree',
            'motif', 'motif_display', 'statut', 'statut_display',
            'dateDemande', 'justificatif', 'justificatif_url',
            'delai_jours', 'urgence_badge', 'employe_solde'
        ]
        read_only_fields = [
            'duree', 'statut', 'dateDemande', 'employe', 'justificatif_url'
        ]

    def get_employe_noms(self, obj):
        return f"{obj.employe.prenomEmpl} {obj.employe.nomEmpl}"

    def get_delai_jours(self, obj):
        return obj.delai_jours

    def get_urgence_badge(self, obj):
        return obj.urgence_badge

    def get_employe_solde(self, obj):
        # Pour l'aide à la décision, on affiche le SOLDE TOTAL (Cumul de tous les exercices)
        # car c'est ce qui importe pour savoir si l'employé peut partir.
        from django.db.models import Sum
        total = obj.employe.droits_conges.aggregate(Sum('nbrJRes'))['nbrJRes__sum'] or 0
        return total



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class CalendarNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = CalendarNote
        fields = ['id', 'title', 'description', 'date', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']