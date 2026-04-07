# Manuel d'Utilisation - Gestion et Suivi des Congés du Personnel

Bienvenue dans l'application de Gestion des Congés ! Ce document explique en détail les actions possibles pour chaque rôle.

L'application est divisée en 4 grands rôles. Pour naviguer de manière fluide, nous avons mis en place une barre latérale ("Sidebar") qui vous permet de basculer entre les différents espaces.

---

## 1. Rôle: Employé (Employee)

L'employé est l'utilisateur principal du système. Son objectif est de soumettre des demandes et de consulter l'état de son solde.

### Ce que l'Employé voit sur son Tableau de Bord :
- **Son identité** et son statut en haut de la page.
- **Son solde de congés actuel** (ex: 30 jours restants).
- **Ses statistiques de demandes** (ex: nombre de demandes en attente).
- **La liste de ses collègues** de département.

### Comment utiliser :
L'employé peut consulter son historique personnel de congés et choisir les dates (début/fin), le motif (Mariage, Annuel, Maladie) pour envoyer automatiquement le formulaire à son responsable.

---

## 2. Rôle: Responsable Hiérarchique (Manager)

Le manager ou Chef de Projet a une vue dédiée aux demandes de **son équipe uniquement**. Il ne voit pas les demandes des autres départements.

### Ce que le Manager voit sur son Tableau de Bord :
- **Alerte :** Le nombre de demandes de congés de son équipe qui nécessitent une action.
- **L'Équipe :** La liste des employés qui lui sont directement rattachés.

### Comment utiliser :
La liste centrale affiche toutes les "Demandes en attente". Le manager peut cliquer sur un bouton vert (Approuver) ou sur un bouton rouge (Refuser). S'il refuse, il doit obligatoirement entrer un motif de refus. S'il approuve, la demande passe automatiquement au niveau Supérieur (Responsable RH).

---

## 3. Rôle: Responsable RH (HR Manager)

Les Ressources Humaines gèrent l'ensemble du personnel. Ils ont le dernier mot (Approbation Finale) avant que le solde de l'employé ne soit officiellement déduit dans le système.

### Ce que le RH voit sur son Tableau de Bord :
- **Alerte Globale :** Les demandes de toute l'entreprise qui ont déjà été validées par les managers et qui attendent la dernière validation.
- **Le Registre National :** La liste de *tous* les employés enregistrés dans la plateforme avec leur solde restant, matricule, email et département.

### Comment utiliser :
Le RH procède à l'approbation finale. Dès qu'il valide au niveau RH, le système déduit automatiquement les jours dans la base de données de l'employé en question. Le RH peut également exporter les données et configurer manuellement un solde.

---

## 4. Rôle: Super Administrateur (Super Admin)

Il a le contrôle total et global du système, et gère la base de données et l'aspect technique.

### Ce que l'Admin voit sur son Tableau de Bord :
- **L'État du Système :** Des indicateurs confirmant que les serveurs, l'API et la Base de Données sont opérationnels.
- **Accès Brut :** La vue complète sur la base d'utilisateurs.

### Comment utiliser :
L'administrateur peut ajouter ou désactiver de nouveaux utilisateurs du système, attribuer les droits (transformer un employé en RH ou Manager), réinitialiser des mots de passe, et modifier l'infrastructure de base via l'interface d'administration système.
