import io
import os
from datetime import date

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.core.exceptions import PermissionDenied
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

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
except ImportError:
    canvas = None
    mm = 1
    A4 = (210 * mm, 297 * mm)

def telecharger_titre_conge(request, titre_id):
    """
    Vue principale qui gère les permissions et appelle la génération du PDF.
    """
    titre = get_object_or_404(TitreConge, id=titre_id)
    
    # --- VÉRIFICATION DES ACCÈS ---
    # 1. L'utilisateur est-il le propriétaire du titre ? (via le lien Employe -> Compte)
    is_owner = hasattr(titre.employe, 'compte') and titre.employe.compte == request.user
    
    # 2. L'utilisateur est-il un Responsable RH ou Admin ?
    # On limite strictement au rôle 'responsable_rh' (on exclut directeur_rh et resp_hierarchique)
    user_role = getattr(request.user, 'role', None)
    is_rh = request.user.is_superuser or user_role == 'responsable_rh'

    if is_owner or is_rh:
        return _build_titre_pdf_response(titre)
    else:
        raise PermissionDenied("Accès refusé : Vous n'avez pas les droits nécessaires.")

def _build_titre_pdf_response(titre):
    employe = titre.employe
    structure = employe.structure
    responsable = structure.responsable if structure else None
    responsable_name = f"{responsable.prenomEmpl} {responsable.nomEmpl}" if responsable else ""
    fonction = employe.fonction.libelle if employe.fonction else ""
    
    # --- RÉCUPÉRATION DE LA NATURE DU CONGÉ ---
    type_du_conge = ""
    if titre.demande and titre.demande.type_conge:
        type_du_conge = titre.demande.type_conge.nomType
    else:
        type_du_conge = "Congé" 

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    top = height - margin

    # --- LOGO AIR ALGÉRIE ---
    # Utilisation de BASE_DIR pour pointer vers backend/image/logo.png
    logo_path = os.path.join(settings.BASE_DIR, 'image', 'logo.png')
    
    # --- LIGNES DE TEST (A supprimer après vérification) ---
    print(f"--- TEST LOGO ---")
    print(f"BASE_DIR détecté : {settings.BASE_DIR}")
    print(f"Chemin complet recherché : {logo_path}")
    print(f"Le fichier existe-t-il ? : {os.path.exists(logo_path)}")
    
    if os.path.exists(logo_path):
        logo_w = 40 * mm
        # Positionnement en haut à droite (Aligné sur la marge droite)
        pdf.drawImage(logo_path, width - margin - logo_w, top - 10 * mm, width=logo_w, preserveAspectRatio=True, mask='auto')

    # --- 1. TITRE ---
    curr_y = top - 15 * mm
    pdf.setFont("Helvetica-Bold", 14)
    title_text = "TITRE DE CONGÉ"
    pdf.drawCentredString(width / 2, curr_y, title_text)
    text_width = pdf.stringWidth(title_text, "Helvetica-Bold", 14)
    
    pdf.line(width/2 - text_width/2, curr_y - 2*mm, width/2 + text_width/2, curr_y - 2*mm)

    # --- 2. RÉFÉRENCE & MATRICULE ---
    pdf.setFont("Helvetica", 10)
    curr_y -= 15 * mm
    pdf.drawString(margin, curr_y, f"Réf. : {titre.ref}")
    
    pdf.drawString(width - margin - 55 * mm, curr_y, "N° Matricule :")
    pdf.rect(width - margin - 25 * mm, curr_y - 2 * mm, 25 * mm, 7 * mm)
    pdf.drawCentredString(width - margin - 12.5 * mm, curr_y - 1 * mm, employe.matricule or "")

    # --- 3. BLOC INFORMATIONS ---
    curr_y -= 12 * mm
    pdf.drawString(margin, curr_y, "Nom & Prénom :")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin + 35 * mm, curr_y, f"{employe.prenomEmpl} {employe.nomEmpl}")

    pdf.setFont("Helvetica", 10)
    curr_y -= 8 * mm
    pdf.drawString(margin, curr_y, "Qualité :")
    pdf.drawString(margin + 20 * mm, curr_y, fonction)

    curr_y -= 8 * mm
    pdf.drawString(margin, curr_y, "Structure :")
    pdf.drawString(margin + 20 * mm, curr_y, structure.libelle if structure else "")
    
    pdf.drawString(width/2 + 5*mm, curr_y, "Responsable :")
    pdf.drawString(width/2 + 35*mm, curr_y, responsable_name)

    # --- TYPE DE CONGÉ ---
    curr_y -= 8 * mm
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin, curr_y, "Type du congé :")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin + 35 * mm, curr_y, type_du_conge)

    # --- 4. SECTION DÉCOMPTE ---
    center_block_x = width / 2 - 40 * mm 
    curr_y -= 18 * mm 
    pdf.drawString(center_block_x, curr_y, "demande")
    box_x = center_block_x + 22 * mm
    for i in range(3):
        pdf.rect(box_x + i * 8 * mm, curr_y - 2 * mm, 7 * mm, 7 * mm)
    pdf.drawString(box_x + 26 * mm, curr_y, "jours de congé")
    
    dur = str(int(titre.dureeT))
    pdf.drawCentredString(box_x + 20 * mm, curr_y - 1 * mm, dur)

    curr_y -= 12 * mm
    pdf.drawString(center_block_x - 10 * mm, curr_y, "au titre de l'année")
    year_x = center_block_x + 32 * mm
    for i in range(4):
        pdf.rect(year_x + i * 8 * mm, curr_y - 2 * mm, 7 * mm, 7 * mm)
    pdf.drawString(year_x + 35 * mm, curr_y, "Allant")
    
    year_str = str(titre.dateDebut.year)
    for i, digit in enumerate(year_str):
        pdf.drawCentredString(year_x + i * 8 * mm + 3.5 * mm, curr_y - 1 * mm, digit)

    curr_y -= 12 * mm
    pdf.drawString(width/2 - 75*mm, curr_y, "du")
    d1_x = width/2 - 67*mm
    for i in range(3): pdf.rect(d1_x + i * 11 * mm, curr_y - 2 * mm, 10 * mm, 7 * mm)
    
    pdf.drawString(d1_x + 35 * mm, curr_y, "au")
    d2_x = d1_x + 42 * mm
    for i in range(3): pdf.rect(d2_x + i * 11 * mm, curr_y - 2 * mm, 10 * mm, 7 * mm)
    
    pdf.drawString(d2_x + 35 * mm, curr_y, "pour en jouir à")
    
    d1 = [titre.dateDebut.strftime('%d'), titre.dateDebut.strftime('%m'), titre.dateDebut.strftime('%y')]
    d2 = [titre.dateFin.strftime('%d'), titre.dateFin.strftime('%m'), titre.dateFin.strftime('%y')]
    for i, v in enumerate(d1): pdf.drawCentredString(d1_x + i*11*mm + 5*mm, curr_y - 1*mm, v)
    for i, v in enumerate(d2): pdf.drawCentredString(d2_x + i*11*mm + 5*mm, curr_y - 1*mm, v)

    # --- 5. SIGNATURES ---
    curr_y -= 25 * mm
    pdf.drawString(width - margin - 50 * mm, curr_y, "le ________________")
    
    curr_y -= 15 * mm
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(margin + 5 * mm, curr_y, "Le Responsable hiérarchique")
    pdf.drawRightString(width - margin - 5 * mm, curr_y, "L'intéressé")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return HttpResponse(buffer.getvalue(), content_type='application/pdf')



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
        
        # Actions de gestion et listage global pour le staff RH et Admin
        if self.action in ['valider_responsable', 'refuser_responsable', 'approuver_rh', 'refuser', 'retrieve', 'list']:
            if user.is_superuser or user.role in ['responsable_rh', 'directeur_rh', 'responsable_hierarchique']:
                return DemandeConge.objects.all()

        # Action spécifique de téléchargement : Restreint au Staff RH et au Propriétaire
        if self.action == 'download_titre':
            if user.is_superuser or user.role == 'responsable_rh':
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

        # Le responsable hiérarchique voit les demandes
        if user.role == 'responsable_hierarchique':
            employe = getattr(user, 'employe', None)
            if employe and hasattr(employe, 'structure_dirigee') and employe.structure_dirigee:
                from django.db.models import F
                structure_dirigee = employe.structure_dirigee
                
                # 1. Employés de sa propre structure (il n'est pas le demandeur)
                demandes_base = DemandeConge.objects.filter(
                    employe__structure=structure_dirigee, 
                    statut='en_attente_resp'
                ).exclude(employe=employe)
                
                # 2. Chefs des structures dont lui est le parent (N+1)
                demandes_filiales = DemandeConge.objects.filter(
                    employe__structure__parent=structure_dirigee,
                    employe__structure__responsable=F('employe'),
                    statut='en_attente_resp'
                )
                
                demandes = (demandes_base | demandes_filiales).distinct()
                serializer = self.get_serializer(demandes, many=True)
                return Response(serializer.data)

        return Response([])

    @action(detail=True, methods=['get'])
    def download_titre(self, request, pk=None):
        demande = self.get_object()
        try:
            titre = demande.titreconge
        except TitreConge.DoesNotExist:
            return Response({'detail': 'Le titre de congé n’existe pas encore pour cette demande.'}, status=status.HTTP_404_NOT_FOUND)

        return _build_titre_pdf_response(titre)

    def perform_create(self, serializer):
        employe = getattr(self.request.user, 'employe', None)
        if not employe:
            raise PermissionDenied("Votre compte n'est lié à un profil employé.")
        
        # Extraction du fichier avec vérification des deux clés possibles
        justificatif_file = self.request.FILES.get('justificatif') or self.request.FILES.get('justificatif_file')
        
        # Validation : est-ce que c'est un congé maladie ou exceptionnel ?
        type_conge = serializer.validated_data.get('type_conge')
        if type_conge and (type_conge.est_exceptionnel or 'maladie' in type_conge.nomType.lower()):
            if not justificatif_file:
                from rest_framework.exceptions import ValidationError as DRFValidationError
                raise DRFValidationError({'justificatif': f"Un justificatif est obligatoire pour ce type de congé."})
            
        try:
            from django.core.exceptions import ValidationError as DjangoValidationError
            from rest_framework.exceptions import ValidationError as DRFValidationError
            demande = serializer.save(employe=employe, justificatif=justificatif_file)
        except DjangoValidationError as e:
            if hasattr(e, 'messages'):
                raise DRFValidationError({'error': e.messages[0]})
            raise DRFValidationError({'error': str(e)})
        
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
            if employe.structure and getattr(employe.structure, 'responsable', None) and employe.structure.responsable.compte:
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
        
        est_demandeur_chef = (demande.employe.structure and getattr(demande.employe.structure, 'responsable', None) == demande.employe)
        if est_demandeur_chef:
            parent = demande.employe.structure.parent
            if not parent or getattr(parent, 'responsable', None) != responsable_employe:
                return Response({'detail': "Action interdite. Chef de structure sans N+1 direct ou vous n'êtes pas son dirigeant parent."}, status=403)
        else:
            if not demande.employe.structure or getattr(demande.employe.structure, 'responsable', None) != responsable_employe:
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
        
        est_demandeur_chef = (demande.employe.structure and getattr(demande.employe.structure, 'responsable', None) == demande.employe)
        if est_demandeur_chef:
            parent = demande.employe.structure.parent
            if not parent or getattr(parent, 'responsable', None) != responsable_employe:
                return Response({'detail': "Action interdite."}, status=403)
        else:
            if not demande.employe.structure or getattr(demande.employe.structure, 'responsable', None) != responsable_employe:
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
        user = request.user

        if demande.employe.compte == user:
            return Response({'detail': "Action Interdite : Auto-rejet impossible."}, status=403)
            
        if hasattr(demande.employe, 'compte') and demande.employe.compte and demande.employe.compte.role == 'responsable_rh':
            if user.role != 'directeur_rh' and not user.is_superuser:
                return Response({'detail': "Seul le Directeur RH peut refuser la demande d'un Responsable RH."}, status=403)

        raison = request.data.get('raison', 'Raison non spécifiée')
        demande.statut = 'refusee'
        demande.save()

        Notification.objects.create(
            utilisateur=demande.employe.compte,
            description=f"Votre demande de congé a malheureusement été refusée. Motif : {raison}"
        )
        return Response({'status': 'Demande refusée.'})

class TitreCongeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TitreConge.objects.select_related('employe', 'exercice', 'demande').all()
    serializer_class = TitreCongeSerializer
    permission_classes = [IsEmploye]

    def get_queryset(self):
        user = self.request.user
        # Le staff RH (et l'admin) peut voir tous les titres pour permettre le téléchargement
        if user.is_superuser or user.role == 'responsable_rh':
            return self.queryset
            
        employe = getattr(user, 'employe', None)
        if employe:
            return self.queryset.filter(employe=employe)
        return TitreConge.objects.none()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        titre = self.get_object()
        return _build_titre_pdf_response(titre)


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
