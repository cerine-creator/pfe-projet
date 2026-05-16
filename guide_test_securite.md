# 🔒 Guide de Test Sécurité - HR Leave Management System

Ce guide vous permet de démontrer au jury les mécanismes de sécurité implémentés dans votre projet PFE.

---

### 1. Test de l'Authentification (JWT - JSON Web Tokens)
**Objectif** : Prouver que les données sont protégées et inaccessibles sans jeton valide.

*   **Étape A** : Ouvrez un onglet de navigation privée.
*   **Étape B** : Tentez d'accéder directement à l'URL : `http://localhost:5173/dashboard-drh`.
*   **Résultat attendu** : Le système doit vous rediriger immédiatement vers la page `/login`.
*   **Explication au jury** : *"Toutes nos routes frontend et nos endpoints API sont protégés par des Guards. Sans un jeton JWT valide dans le Header de la requête, l'accès est refusé."*

---

### 2. Test du Contrôle d'Accès par Rôle (RBAC)
**Objectif** : Prouver qu'un employé ne peut pas effectuer d'actions administratives.

*   **Étape A** : Connectez-vous avec un compte **Employé** (ex: `said.fret@airalgerie.dz` / `password123`).
*   **Étape B** : Tentez de taper manuellement l'URL `http://localhost:5173/demandes/validation` dans la barre d'adresse.
*   **Résultat attendu** : Une page "Accès Interdit" ou une redirection vers le Dashboard employé.
*   **Étape C (Expert)** : Ouvrez la console (F12) et montrez que si vous essayez d'appeler l'API `/api/demandes/a_valider/`, le serveur renvoie une **Erreur 403 Forbidden**.
*   **Explication au jury** : *"Nous utilisons un système de permissions basé sur les rôles (RBAC). La sécurité n'est pas seulement visuelle (cacher un bouton), elle est appliquée côté serveur sur chaque point d'entrée API."*

---

### 3. Test de l'Intégrité Métier (Anti Auto-Approbation)
**Objectif** : Prouver que les règles métier critiques sont codées "en dur" côté serveur.

*   **Étape A** : Connectez-vous avec un compte **Responsable RH** ou **DRH** (ex: `tarik.bensalah@airalgerie.dz`).
*   **Étape B** : Créez une demande de congé pour **vous-même** (Tarik).
*   **Étape C** : Allez dans l'onglet **Validation**.
*   **Étape D** : Tentez d'approuver votre propre demande.
*   **Résultat attendu** : Un message d'erreur rouge s'affiche : *"Action Interdite : Vous ne pouvez pas auto-approuver votre propre demande."*
*   **Explication au jury** : *"Nous avons implémenté des verrous de sécurité métier. Même un administrateur ne peut pas contourner les règles d'intégrité du système de congés."*

---

### 4. Test de Confidentialité (Hachage des Mots de Passe)
**Objectif** : Prouver qu'en cas de vol de la base de données, les mots de passe restent illisibles.

*   **Étape A** : Ouvrez l'interface d'administration Django (`http://localhost:8000/admin`).
*   **Étape B** : Allez dans la table **Users** et cliquez sur un utilisateur.
*   **Étape C** : Montrez le champ "Password".
*   **Résultat attendu** : On voit une chaîne de caractères longue et incompréhensible (ex: `pbkdf2_sha256$600000$...`).
*   **Explication au jury** : *"Nous n'enregistrons jamais les mots de passe en clair. Nous utilisons l'algorithme PBKDF2 avec un sel (salt) unique, qui est le standard recommandé par l'OWASP."*

---

### 5. Test de Protection contre les Injections (ORM)
**Objectif** : Expliquer la protection contre les injections SQL.

*   **Action** : Montrez une ligne de code dans `views.py` utilisant `DemandeConge.objects.filter(...)`.
*   **Explication au jury** : *"En utilisant l'ORM de Django au lieu de requêtes SQL brutes, nous bénéficions d'une protection automatique contre les injections SQL grâce à la paramétrisation systématique des requêtes."*
