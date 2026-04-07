# Installation & Démarrage du Projet PFE

Ce document t'explique les étapes exactes (à copier/coller) pour relancer l'ensemble du projet dans le cas où tu "clones" (télécharges) le projet depuis Github sur un tout autre ordinateur ou sur le PC lors de ta soutenance.

> **Pré-requis de la nouvelle machine**
> Veuillez vérifier que **Python/pip** (version 3.10+) et **Node.js/npm** (version 18+) sont bien installés sur la machine, et que Git est opérationnel.

## Étape 1 : Cloner le projet

Ouvrez un Terminal de commande et téléchargez le projet :
```bash
git clone https://github.com/cerine-creator/pfe-projet.git
cd pfe-projet
```

---

## Étape 2 : Configurer et Lancer le Backend (Django)

Ici nous allons configurer le cerveau Python, recréer l'espace sécurisé (venv) et créer la base de données.

1. **Création de l'Environnement Virtuel (venv)**
   ```powershell
   python -m venv venv
   ```

2. **Activation de l'environnement**
   - Sur Windows (Powershell) :
     ```powershell
     .\venv\Scripts\activate
     ```
   - Sur Mac / Linux :
     ```bash
     source venv/bin/activate
     ```

3. **Installation des dépendances Python :**
   Dans le dossier, il faudra s'assurer qu'un fichier requirements.txt existe, mais voici la commande manuelle rapide pour restaurer ce qu'on utilise :
   ```powershell
   pip install django djangorestframework django-cors-headers
   ```

4. **Préparation de la Base de Données & Création de nos "Employés Test"**
   ```powershell
   python manage.py makemigrations conges
   python manage.py migrate
   python create_dummy.py
   ```
   *(La dernière commande "create_dummy" génèrera tout seul l'Administrateur, la RH, le Manager et les Employés pour te permettre de tester rapidement !)*

5. **Lancement du Serveur**
   ```powershell
   python manage.py runserver
   ```
   🎉 Le backend est lancé sur `http://127.0.0.1:8000` ! (Ne fermez pas cette fenêtre).

---

## Étape 3 : Configurer et Lancer le Frontend (React)

Ouvrez **une deuxième** et **nouvelle** fenêtre de Terminal, puis allez dans le dossier Frontend :

1. **Naviguer vers le Frontend**
   ```powershell
   cd frontend
   ```

2. **Installer TOUTES les dépendances du projet**
   *(Cette commande télécharge non seulement les modules de l'interface visuelle, mais absolument **tous les paquets nécessaires** au fonctionnement de l'application (comme `axios`, `react-router-dom`, etc.) qui sont déclarés dans le projet. Vous n'avez pas besoin de les installer un par un !)*
   ```powershell
   npm install
   ```

3. **Lancer le serveur de développement**
   ```powershell
   npm run dev
   ```

🎉 L'application s'ouvrira (ou vous donnera un lien cliquable du type : `http://localhost:5173/`).

C'est Fini ! Vous pouvez maintenant accéder à votre tableau de bord interactif React connecté à Django !

---

## Étape 4 : Guide de Travail en Équipe (Git & Github)

Pour éviter de casser le code principal et de créer des "conflits" compliqués dans le `main`, chaque membre de l'équipe **doit impérativement** travailler sur sa propre *"branche"* isolée. Voici les étapes à suivre à chaque nouvelle tâche :

1. **Toujours récupérer la dernière version (Avant de coder)**
   Assurez-vous d'être sur la branche principale et téléchargez les nouveautés des autres :
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Créer sa propre branche pour travailler**
   Nommez la branche avec votre prénom ou la tâche (ex: `amine-nouvelle-page` ou `cerine-boutons`).
   ```bash
   git checkout -b <nom-de-mabranche>
   ```

3. **Coder et Sauvegarder son travail localement (Commit)**
   ```bash
   git add .
   git commit -m "J'ai ajouté les boutons de la page d'accueil"
   ```

4. **Envoyer sa branche sur GitHub (Push)**
   *La **première fois** que vous envoyez votre nouvelle branche sur le site, utilisez :*
   ```bash
   git push -u origin <nom-de-mabranche>
   ```
   *(Puis, au fur et à mesure que vous continuez à travailler sur cette même branche le lendemain, un simple `git push` suffira).*

5. **Fusionner avec le projet complet (Pull Request)**
   - Allez sur la page GitHub du projet.
   - GitHub vous affichera un bouton vert **"Compare & pull request"**. Cliquez dessus.
   - Demandez à vos coéquipiers de jeter un coup d'œil, et si tout fonctionne et qu'il n'y a pas de conflits, cliquez sur **"Merge pull request"**. 
   - Félicitations, votre code est désormais officiellement dans le `main` ! Vous pouvez maintenant reprendre à l'étape 1 pour votre prochaine tâche.
