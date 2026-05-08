from reportlab.lib.pagesizes import A4, A5, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO
from datetime import date, timedelta
import os

def generer_pdf_titre(demande):
    buffer = BytesIO()
    # Configuration de la page A5 en paysage avec des marges équilibrées
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=landscape(A5), 
        rightMargin=30, 
        leftMargin=30, 
        topMargin=20, 
        bottomMargin=20
    )
    styles = getSampleStyleSheet()
    
    # --- STYLES PERSONNALISÉS ---
    style_titre = ParagraphStyle(
        'TitreStyle',
        parent=styles['Heading1'],
        fontSize=18,
        fontName='Helvetica-Bold',
        alignment=1,  # Centre
        spaceAfter=20
    )
    
    style_normal = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=14
    )

    style_bold = ParagraphStyle(
        'BoldStyle',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        leading=14
    )

    elements = []
    
    # --- 1. EN-TÊTE : RÉFÉRENCE ---
    ref_text = f"Réf: REF-{demande.date_debut.year}-{demande.id:04d}"
    
    header_table = Table([[Paragraph(ref_text, style_normal)]], colWidths=[500])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # --- 2. TITRE PRINCIPAL ---
    elements.append(Paragraph("<u>TITRE DE CONGE</u>", style_titre))
    elements.append(Spacer(1, 10))
    
    # --- 3. MATRICULE (Aligné à droite) ---
    matricule = demande.employe.matricule if demande.employe.matricule else "N/A"
    mat_table = Table([["", Paragraph(f"<b>N° Matricule :</b> {matricule}", style_normal)]], colWidths=[330, 170])
    mat_table.setStyle(TableStyle([('ALIGN', (1, 0), (1, 0), 'LEFT')]))
    elements.append(mat_table)
    elements.append(Spacer(1, 15))

    # --- 4. CORPS DU DOCUMENT ---
    date_reprise = demande.date_fin + timedelta(days=1)
    droit = demande.employe.droits_conges.filter(exercice=demande.exercice).first()
    solde_restant = int(droit.nbrJRes) if droit else 0

    body_data = [
        [Paragraph("Bénéficiaire :", style_bold), Paragraph(f"{demande.employe.prenomEmpl} {demande.employe.nomEmpl}", style_normal), "", ""],
        [Paragraph("Qualité :", style_bold), Paragraph(demande.employe.fonction.libelle if demande.employe.fonction else "N/A", style_normal), 
         Paragraph("Affectation :", style_bold), Paragraph(demande.employe.structure.libelle if demande.employe.structure else "N/A", style_normal)],
        [Paragraph("Congé accordé :", style_bold), Paragraph(f"<b>{int(demande.duree)}</b> jours", style_normal), "", ""],
        [Paragraph("Valable du :", style_bold), Paragraph(demande.date_debut.strftime('%d/%m/%Y'), style_normal), 
         Paragraph("au :", style_bold), Paragraph(demande.date_fin.strftime('%d/%m/%Y'), style_normal)],
    ]

    # Largeurs ajustées pour que "Affectation" et "au" soient bien placés
    body_table = Table(body_data, colWidths=[110, 160, 80, 150])
    body_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(body_table)
    elements.append(Spacer(1, 10))

    # --- 5. BAS DE PAGE (Reste à prendre et Reprise) ---
    # Création du petit rectangle pour le solde
    box_solde = Table([[Paragraph(f"<b>{solde_restant}</b>", ParagraphStyle('B', fontSize=14, alignment=1))]], 
                      colWidths=[60], rowHeights=[30], 
                      style=[('BOX', (0,0), (-1,-1), 1.5, colors.black), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')])

    footer_data = [
        [Paragraph("<b>Reste a prendre</b>", style_normal), Paragraph("date à laquelle l'intéressé devra reprendre son", style_normal)],
        [box_solde, Paragraph("poste de travail.", style_normal)],
        ["", Paragraph(f"<b>{date_reprise.strftime('%d/%m/%Y')}</b>", style_bold)]
    ]
    
    footer_table = Table(footer_data, colWidths=[150, 350])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (1, 0), (1, -1), 50), # Décale le texte de reprise vers la droite
    ]))
    elements.append(footer_table)
    
    # --- 6. SIGNATURE (Date du jour) ---
    elements.append(Spacer(1, 15))
    date_signature = date.today().strftime('%d/%m/%Y')
    elements.append(Paragraph(f"Le : <b>{date_signature}</b>", ParagraphStyle('R', parent=styles['Normal'], alignment=2, fontSize=11, rightIndent=40)))
    
    # Génération finale
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generer_pdf_archive(employe, demandes):
    """Génère un récapitulatif de toutes les demandes approuvées."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    
    style_titre = ParagraphStyle(
        'TitreStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#d32f2f'),
        alignment=1,
        spaceAfter=20
    )
    
    elements = []
    
    # En-tête
    elements.append(Paragraph("AIR ALGÉRIE - RÉCAPITULATIF DES CONGÉS", style_titre))
    elements.append(Paragraph(f"Employé : {employe.prenomEmpl} {employe.nomEmpl} (Matricule: {employe.matricule})", styles['Normal']))
    elements.append(Paragraph(f"Structure : {employe.structure.libelle if employe.structure else 'N/A'}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Tableau des demandes
    data = [["Début", "Fin", "Durée", "Type", "Statut"]]
    for d in demandes:
        data.append([
            d.date_debut.strftime('%d/%m/%Y'),
            d.date_fin.strftime('%d/%m/%Y'),
            f"{d.duree}j",
            d.type_conge.nomType if d.type_conge else "N/A",
            d.get_statut_display()
        ])
    
    t = Table(data, colWidths=[90, 90, 60, 150, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"Document généré le {date.today().strftime('%d/%m/%Y')}", styles['Italic']))
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf