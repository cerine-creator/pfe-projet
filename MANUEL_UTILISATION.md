# Manuel d'Utilisation - Gestion des Congés (PFE)

Bienvenue dans l'application de Gestion des Congés ! Ce document explique en détail les actions possibles pour chaque rôle dans cette version MVC (Minimum Viable Code).

L'application est divisée en 4 grands rôles. Pour tester cette version, nous avons mis en place une barre latérale (Sidebar) qui, d'un simple clic, vous permet de simuler l'accès de chacun des rôles sans avoir besoin d'un mot de passe pour l'instant.

---

## 1. Rôle: Employé (Employee)

L'employé est l'utilisateur principal du système. Son objectif est de soumettre des demandes et de consulter l'état de son solde.

### Ce que l'Employé voit sur son Tableau de Bord (Version MVC) :
- **Son identité** et son statut en haut de la page.
- **Son solde de congés actuel** (ex: 30 jours restants).
- **Ses statistiques de demandes** (ex: nombre de demandes en attente).
- **La liste de ses collègues** (Dans cette version test, cela prouve la connexion avec la base de données et l'API).

### Comment utiliser (Plus tard dans la version Finale) :
Dans la version finale, au lieu de voir la liste complète, l'employé verra uniquement son historique personnel de congés et aura un bouton "Nouvelle Demande" pour choisir les dates (début/fin), le motif (Mariage, Annuel, Maladie) et envoyer le formulaire à son responsable.

---

## 2. Rôle: Responsable Hiérarchique (Manager)

Le manager ou Chef de Projet a accès aux demandes de **son équipe uniquement**. Il ne voit pas les demandes des autres départements.

### Ce que le Manager voit sur son Tableau de Bord (Version MVC) :
- **Alerte :** Le nombre de demandes de congés de son équipe qui nécessitent une action.
- **L'Équipe :** La liste des employés qui lui sont directement rattachés (filtrage).

### Comment utiliser (Plus tard dans la version Finale) :
Dans les futures versions, la liste sera transformée en "Demandes en attente". Le manager pourra cliquer sur un bouton vert (Approuver) ou sur un bouton rouge (Refuser). S'il refuse, il devra obligatoirement entrer un motif de refus. S'il approuve, la demande passe automatiquement au niveau Supérieur (Responsable RH).

---

## 3. Rôle: Responsable RH (HR Manager)

Les Ressources Humaines gèrent l'ensemble du personnel. Ils ont le dernier mot (Approbation Finale) avant que le solde de l'employé ne soit déduit dans le système.

### Ce que le RH voit sur son Tableau de Bord (Version MVC) :
- **Alerte Globale :** Les demandes de toute l'entreprise qui ont déjà été validées par les managers et qui attendent la dernière validation.
- **Le Registre National :** La liste de *tous* les employés enregistrés dans la plateforme avec leur solde restant, matricule, email et département.

### Comment utiliser (Plus tard dans la version Finale) :
Le RH procédera à l'approbation finale. Dès qu'il clique sur "Approuver au niveau RH", le système déduira automatiquement les jours (ex: 30 jours -> 25 jours) dans la base de données. Le RH pourra également exporter les données vers Excel ou configurer manuellement le solde.

---

## 4. Rôle: Super Administrateur (Super Admin)

C'est vous (le développeur) ou le technicien IT. Il a le contrôle total du système et gère tout ce qui se passe en arrière-plan.

### Ce que l'Admin voit sur son Tableau de Bord (Version MVC) :
- **L'État du Système :** Des signaux "vert" confirmant que les serveurs (Django/React) et la Base de Données sont OK.
- **Accès Brut :** Il voit absolument tout le monde dans la table des employés avec le détail brut.

### Comment utiliser (Plus tard dans la version Finale) :
Il pourra ajouter ou supprimer de nouveaux utilisateurs du système, attribuer les droits (transformer un employé en RH ou Manager), réinitialiser des mots de passe, et modifier les rôles de base via l'interface `/admin` classique de Django.
