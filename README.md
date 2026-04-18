# ✈️ Projet PFE : Gestion des Congés Air Algérie

Bienvenue dans le dépôt officiel du projet de Gestion des Congés pour **Air Algérie**. Ce projet est une application web full-stack moderne (React + Django) conçue pour automatiser et sécuriser le processus de demande de congés au sein de la compagnie.

---

## 🚀 Guide d'Installation de A à Z (Nouvelle Machine)

Ce guide vous permet de configurer le projet sur n'importe quel ordinateur à partir de zéro.

### 📋 Pré-requis
Avant de commencer, installez ces trois outils :
1.  **Python** (Version 3.10 ou supérieure) : [Télécharger](https://www.python.org/downloads/)
2.  **Node.js & npm** (Version 18 ou supérieure) : [Télécharger](https://nodejs.org/)
3.  **Git** : [Télécharger](https://git-scm.com/)

---

### 1️⃣ Récupérer le Projet
Ouvrez un terminal (PowerShell sur Windows ou Terminal sur Mac/Linux) :
```bash
git clone https://github.com/cerine-creator/pfe-projet.git
cd pfe-projet
```

---

### 2️⃣ Configurer le Backend (Le Cerveau Django)
Dans le même terminal, déplacez-vous dans le dossier backend :
```bash
# 1. Créer l'environnement virtuel (pour isoler les bibliothèques)
python -m venv venv

# 2. Activer l'environnement
# Sur Windows (PowerShell) :
.\venv\Scripts\activate
# Sur Mac/Linux :
source venv/bin/activate

# 3. Installer toutes les dépendances nécessaires d'un coup
pip install -r backend/requirements.txt

# 4. Préparer la base de données
cd backend
python manage.py makemigrations conges accounts
python manage.py migrate

# 5. Créer les données réalistes Air Algérie (Profils, Structures, Exercices)
python populate_air_algerie.py

# 6. Lancer le serveur backend
python manage.py runserver
```
*Le backend tourne maintenant sur `http://127.0.0.1:8000`.*

---

### 3️⃣ Configurer le Frontend (L'Interface React)
Ouvrez une **deuxième fenêtre de terminal**, allez à la racine du projet, puis :
```bash
# 1. Aller dans le dossier frontend
cd frontend

# 2. Installer les modules Javascript
npm install

# 3. Lancer l'interface
npm run dev
```
*L'application est maintenant accessible sur `http://localhost:5173`.*

---

## 🛠️ Architecture Technique

| partie | Technologie | Rôle |
| :--- | :--- | :--- |
| **Backend** | Django 4.2 | Logique métier, sécurité, base de données |
| **API** | Django REST Framework | Communication entre le front et le back |
| **Frontend** | React + Vite | Interface utilisateur dynamique et réactive |
| **Langage** | TypeScript | Code sécurisé et typage strict |
| **Style** | Vanilla CSS | Design premium personnalisé aux couleurs d'Air Algérie |

---

## 📖 Règles Métier Implémentées (Air Algérie)

Le projet respecte scrupuleusement les spécificités de la compagnie :
-   **Quotas Différenciés :** 30 jours pour le personnel au Sol, 45 jours pour le personnel Navigant et Sud.
-   **Gestion des Exercices :** Obligation d'épuiser le solde d'un exercice précédent avant d'entamer le nouveau.
-   **Validation Hiérarchique :** Circuit en deux étapes (Responsable Hiérarchique -> RH).
-   **Authentification stricte :** Accès limité aux emails professionnels `@airalgerie.dz`.

---

## 🧪 Comptes de Test par défaut
Utilisez ces comptes pour tester les différents rôles (Mot de passe : `password123`) :
-   **Administrateur / Superuser :** `cerine@airalgerie.dz`
-   **RH / Staff :** `tarik.bensalah@airalgerie.dz`
-   **Responsable :** `karim.mansouri@airalgerie.dz`
-   **Employé :** `amina.meziane@airalgerie.dz`
