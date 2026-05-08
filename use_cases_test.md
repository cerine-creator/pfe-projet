# Scénarios de Tests (Use Cases) - Système de Gestion des Congés Air Algérie

Ce document regroupe les 15 scénarios de tests essentiels pour valider la robustesse de l'application .

## 🟢 Catégorie A : Règles de Solde et Exercice (Solde & Exercice)

**1. Demande avec solde suffisant (Cas Nominal)**
* **Action :** Un employé ayant 30 jours de solde demande 10 jours de congé.
* **Résultat attendu :** La demande est acceptée et passe à l'état `En attente`. **Important :** Le solde reste à 30 jours et ne sera déduit qu'après la validation finale du service RH.

**2. Demande dépassant le solde disponible**
* **Action :** Un employé avec seulement 5 jours de solde tente de demander 10 jours.
* **Résultat attendu :** Rejet immédiat par le backend. L'interface affiche une erreur : *"Solde insuffisant"*.

**3. Distinction des quotas par catégorie (Sol vs Navigant/Sud)**
* **Action :** Création de deux employés (un de catégorie "Sol", l'autre "Navigant/Sud").
* **Résultat attendu :** Le système attribue automatiquement un solde de 30 jours au premier, et 45 jours au second pour l'exercice en cours.

**4. Gestion de l'exercice financier**
* **Action :** Un employé possède 0 jour pour 2024, mais il lui reste 15 jours de l'exercice 2023.
* **Résultat attendu :** Le système déduit les jours du reliquat de 2023 sans bloquer la demande sous prétexte que 2024 est vide.

**5. Déduction effective après validation finale**
* **Action :** L'employé demande 5 jours. Le manager approuve.
* **Résultat attendu :** Le solde reste intact. Ce n'est que lorsque l'administrateur RH clique sur "Approuver" que le solde diminue de 5 jours dans le tableau de bord de l'employé.

---

## 🟡 Catégorie B : Chevauchements et Contrôles (Chevauchements)

**6. Chevauchement avec un congé déjà validé**
* **Action :** L'employé a un congé approuvé du 01 au 10 décembre. Il tente de demander un congé du 08 au 15 décembre.
* **Résultat attendu :** Blocage instantané à la soumission. Message : *"Vous avez déjà un congé approuvé sur cette période"*.

**7. Chevauchement avec une demande en attente**
* **Action :** L'employé soumet deux demandes sur la même période avant que son manager ne réponde.
* **Résultat attendu :** Le système bloque la deuxième demande pour éviter les "réservations fantômes" de solde.

**8. Demande urgente ou antidatée**
* **Action :** L'employé soumet une demande pour "demain" ou pour une date passée (ex: régularisation de maladie).
* **Résultat attendu :** La demande passe, mais elle apparaît avec un badge "Urgent" ou "Expiré" dans le tableau de bord des managers pour un traitement prioritaire.

---

## 🔵 Catégorie C : Le Circuit de Validation (Workflow)

**9. Circuit complet réussi (End-to-End)**
* **Action :** Employé demande -> Manager approuve -> RH approuve.
* **Résultat attendu :** Le statut évolue de `En attente` -> `Validé par le responsable` -> `Validé (Finale)`.

**10. Refus par le Responsable Hiérarchique direct**
* **Action :** Le manager clique sur "Refuser" et saisit un motif.
* **Résultat attendu :** Le flux s'arrête. La demande est archivée comme `Refusée`. Elle n'atteint jamais le service RH et l'employé peut lire le motif du refus.

**11. Refus par le Service RH après accord du Manager**
* **Action :** Le manager a approuvé, mais le service RH refuse pour non-conformité.
* **Résultat attendu :** Demande refusée définitivement. Le solde n'est pas déduit.

**12. Transparence de l'état d'avancement ("En attente de qui ?")**
* **Action :** L'employé consulte le suivi de sa demande.
* **Résultat attendu :** L'interface indique clairement où le dossier est bloqué (ex: *"En attente du Responsable"* ou *"En attente du service RH"*).

---

## 🟣 Catégorie D : Droits d'Accès et Visibilité (RBAC)

**13. Cloisonnement inter-départemental**
* **Action :** Connexion avec le compte d'un Responsable de la structure "Cargo".
* **Résultat attendu :** Il ne voit que les demandes de ses subordonnés du service Cargo. Accès impossible aux demandes du service "Finance".

**14. Exclusivité d'impression du Titre de Congé**
* **Action :** Un employé consulte une demande validée.
* **Résultat attendu :** Il ne possède pas de bouton d'impression PDF. Seul un utilisateur avec le rôle "Service RH" possède l'option de générer le document officiel pour signature et archivage.

**15. Vision globale et analytique du DRH**
* **Action :** Connexion avec le compte du Directeur des Ressources Humaines (DRH).
* **Résultat attendu :** Le DRH a accès à une vue macro (statistiques de toutes les structures, taux d'absentéisme global), sans avoir à gérer les validations individuelles du niveau 1.
