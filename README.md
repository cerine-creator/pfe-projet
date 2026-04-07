# Installation & Démarrage du Projet PFE

Ce document t'explique les étapes exactes (à copier/coller) pour relancer l'ensemble du projet dans le cas où tu "clones" (télécharges) le projet depuis Github sur un tout autre ordinateur ou sur le PC lors de ta soutenance.

> **Pré-requis de la nouvelle machine**
> Veuillez vérifier que **Python/pip** (version 3.10+) et **Node.js/npm** (version 18+) sont bien installés sur la machine, et que Git est opérationnel.

## Étape 1 : Cloner le projet

Ouvrez un Terminal de commande et téléchargez le projet :
```bash
git clone https://github.com/ton-pseudo/pfe-manual.git
cd pfe-manual
```
*(Optionnel : Change `https://github.com/ton-pseudo/pfe-manual.git` par ton vrai lien GitHub)*

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

2. **Installer les modules dépendants de l'interface visuelle**
   ```powershell
   npm install
   ```

3. **Lancer le serveur de développement**
   ```powershell
   npm run dev
   ```

🎉 L'application s'ouvrira (ou vous donnera un lien cliquable du type : `http://localhost:5173/`).

C'est Fini ! Vous pouvez maintenant accéder à votre tableau de bord interactif React connecté à Django !
