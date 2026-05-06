# ✈️ Système de Gestion des Congés — Air Algérie (PFE)

Bienvenue sur la plateforme de gestion des congés. Ce système permet d'automatiser les demandes, la validation hiérarchique, le calcul des soldes en cascade et la génération de titres de congé officiels.

---

### 🚀 Lancement Rapide (Quickstart)

#### 1️⃣ Préparer le Backend (Django)
Ouvrez un terminal dans le dossier racine :
```powershell
# 1. Créer et activer l'environnement virtuel
python -m venv venv
.\venv\Scripts\activate

# 2. Installer les dépendances
cd backend
pip install -r requirements.txt

# 3. Configurer la base de données (Migrations + Données Air Algérie)
python manage.py migrate
python populate_air_algerie.py

# 4. Lancer le serveur
python manage.py runserver
```

#### 2️⃣ Préparer le Frontend (React)
Ouvrez un **deuxième terminal** dans le dossier racine :
```powershell
cd frontend
npm install
npm run dev
```

---

### 📊 Fonctionnalités Clés
- **Validation Hiérarchique :** Circuit N+1 -> RH -> Directeur RH.
- **Calcul Intelligent :** Déduction automatique sur les exercices les plus anciens (Waterfall).
- **Jours Fériés :** Décomptés automatiquement de la durée du congé.
- **Documents Officiels :** Export PDF professionnel du Titre de Congé.
- **Tableau de Bord RH :** Statistiques en temps réel sur les absences.

### 🔑 Accès Admin
- **URL :** `http://127.0.0.1:8000/admin/`
- **Utilisateurs :** Utilisez les comptes générés par le script `populate_air_algerie.py`.

---
*Développé dans le cadre d'un Projet de Fin d'Études (PFE).*
