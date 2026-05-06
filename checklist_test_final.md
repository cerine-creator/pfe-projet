# ✅ Checklist de Validation Finale - Système de Congés Air Algérie

Ce document récapitule les points clés à tester manuellement pour garantir que le système est prêt pour la soutenance.

## 1. Soumission et Calcul
- [ ] **Exclusion des Week-ends** : Créer une demande du Jeudi au Dimanche (doit compter 2 jours : Jeudi et Dimanche).
- [ ] **Jours Fériés Fixes** : Ajouter le "1er Mai" (fixe) dans l'Admin. Créer une demande incluant le 1er Mai. Vérifier qu'il est déduit de la durée.
- [ ] **Calcul Global** : Vérifier que le solde total est vérifié à la soumission.

## 2. Validation et Cascade (Waterfall)
- [ ] **Validation Responsable** : Le manager approuve -> Statut passe à `en_attente_rh`.
- [ ] **Historique Manager** : Le manager voit la demande dans son historique même si elle est `en_attente_rh`.
- [ ] **Validation RH** : Le RH approuve -> Statut passe à `approuvee`.
- [ ] **Déduction en Cascade** : Vérifier dans l'Admin que les jours ont été puisés d'abord dans l'exercice le plus ancien (ex: 2023) avant 2024.

## 3. Documents et Export
- [ ] **Titre de Congé (PDF)** : Cliquer sur l'icône de téléchargement (Employé ou RH).
- [ ] **Authentification** : Vérifier que le PDF se télécharge bien (plus d'erreur 401).
- [ ] **Contenu PDF** : Vérifier que le nom de l'employé, les dates et la signature Air Algérie apparaissent correctement.

## 4. Maintenance
- [ ] **README** : Vérifier que les instructions d'installation sont claires pour un nouveau développeur.
- [ ] **Migrations** : S'assurer que `python manage.py migrate` a été lancé par toute l'équipe.
