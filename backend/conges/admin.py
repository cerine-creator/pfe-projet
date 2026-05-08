from django.contrib import admin
from .models import Structure, Fonction, Employe, TypeConge, Exercice, DroitConge, DemandeConge, Notification, JourFerie

@admin.register(JourFerie)
class JourFerieAdmin(admin.ModelAdmin):
    list_display = ('date', 'libelle')

@admin.register(Structure)
class StructureAdmin(admin.ModelAdmin):
    list_display = ('libelle', 'niveau', 'parent', 'responsable', 'est_structure_rh')
    list_editable = ('est_structure_rh',)

@admin.register(Fonction)
class FonctionAdmin(admin.ModelAdmin):
    list_display = ('libelle',)

@admin.register(Employe)
class EmployeAdmin(admin.ModelAdmin):
    list_display = ('nomEmpl', 'prenomEmpl', 'structure', 'fonction', 'dateRecrutement')
    list_filter = ('structure', 'fonction')

@admin.register(TypeConge)
class TypeCongeAdmin(admin.ModelAdmin):
    list_display = ('nomType',)

@admin.register(Exercice)
class ExerciceAdmin(admin.ModelAdmin):
    list_display = ('libelle',)

@admin.register(DroitConge)
class DroitCongeAdmin(admin.ModelAdmin):
    list_display = ('employe', 'exercice', 'nbrJConsome', 'nbrJRes', 'nbrJCumule')


@admin.register(DemandeConge)
class DemandeCongeAdmin(admin.ModelAdmin):
    list_display = ('employe', 'date_debut', 'date_fin', 'duree', 'statut', 'type_conge', 'motif')
    list_filter = ('statut', 'type_conge')



@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'dateNotif', 'lu')
