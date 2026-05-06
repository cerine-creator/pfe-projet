from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO

def generer_pdf_titre(demande):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Styles personnalisés
    style_titre = ParagraphStyle(
        'TitreStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#d32f2f'), # Rouge Air Algérie
        alignment=1, # Centre
        spaceAfter=30
    )
    
    style_label = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        spaceAfter=6
    )
    
    elements = []
    
    # En-tête
    elements.append(Paragraph("AIR ALGÉRIE", style_titre))
    elements.append(Paragraph("Direction des Ressources Humaines", styles['Heading3']))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("TITRE DE CONGÉ", style_titre))
    
    # Informations de la demande
    data = [
        ["Référence :", getattr(demande, 'titreconge', None).ref if hasattr(demande, 'titreconge') else "N/A"],
        ["Date d'émission :", demande.dateDemande.strftime('%d/%m/%Y')],
        ["", ""],
        ["EMPLOYÉ :", f"{demande.employe.prenomEmpl} {demande.employe.nomEmpl}"],
        ["Matricule :", demande.employe.matricule or "N/A"],
        ["Structure :", demande.employe.structure.libelle if demande.employe.structure else "N/A"],
        ["Fonction :", demande.employe.fonction.libelle if demande.employe.fonction else "N/A"],
        ["", ""],
        ["PÉRIODE DE CONGÉ :", ""],
        ["Date de début :", demande.date_debut.strftime('%d/%m/%Y')],
        ["Date de fin :", demande.date_fin.strftime('%d/%m/%Y')],
        ["Durée :", f"{demande.duree} jour(s)"],
        ["Type de congé :", demande.type_conge.nomType if demande.type_conge else "N/A"],
        ["Exercice :", demande.exercice.libelle if demande.exercice else "N/A"],
    ]
    
    t = Table(data, colWidths=[150, 300])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 50))
    
    # Signature (Simulation)
    signature_data = [
        ["", "Le Responsable RH"],
        ["", ""],
        ["", "(Signature et Cachet)"]
    ]
    sig_table = Table(signature_data, colWidths=[300, 150])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
