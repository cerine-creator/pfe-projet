# Mon Stack Technique & Logique du Système (PFE)

Ce document t'explique en profondeur toutes les technologies que j'ai utilisées dans ce projet et t'indique comment l'ensemble du système fonctionne et communique.

---

## 1. La Stack Technologique

Le projet suit l'architecture moderne typique "Decoupled" ou "Headless", où le Backend (sauvegarde de la logique et base de données) et le Frontend (Visuel) tournent de manière totalement indépendante.

### 🐍 Le Backend (Django & Python)
- **Django :** C'est le cœur du système. C'est un framework robuste utilisé par Instagram et Spotify. Ici, il gère la définition des entités (Modèles), applique les règles métiers (qui peut valider quoi).
- **Django REST Framework (DRF) :** Puisque le Frontend est à part, Django doit obligatoirement "exposer" les données. DRF prend nos données Python et les convertit en format *JSON* (compréhensible par n'importe quel langage/navigateur).
- **Base de données (SQLite) :** C'est la base de données intégrée par défaut dans Django. Idéale pour la création du projet et le concept MVC. (Plus tard on pourrait la changer pour *PostgreSQL*).
- **django-cors-headers :** Outil de sécurité que nous avons ajouté. Il donne la permission au Frontend (qui tourne sur le Port 5173) de dialoguer poliment avec le Backend (Port 8000).

### ⚛️ Le Frontend (React & Vite)
- **React (TSX) :** La bibliothèque visuelle (créée par Facebook). Elle nous a permis de créer un "Composant" Dashboard (Tableau de bord) réutilisable, où les blocs se mettent à jour instantanément sans jamais avoir besoin de recharger la page.
- **Vite :** L'outil qui sert le Frontend. Avant on utilisait "Webpack/Create-React-App", Vite est juste 1000 fois plus rapide et moderne pour afficher tes mises à jour sur ton écran.
- **TypeScript (TS) :** Au lieu d'utiliser un Javascript basique, on utilise TypeScript. Il rajoute des "Types" stricts. (*Exemple: Le code va t'alerter si tu essaies d'envoyer du texte dans un champ de Solde de Congé où il attend uniquement un nombre*).
- **Outils & Bibliothèque de style :** 
  - **Axios :** Le postier. C'est la librairie qui permet à notre frontend de faire les requêtes API (GET, POST) au backend.
  - **Lucide-react :** Une toute nouvelle librairie d'icônes très légères.
  - **Vanilla CSS3 :** On a codé une interface premium et sur-mesure (couleurs dégradées, ombres, design dynamique) avec de pures variables CSS pour un beau rendu en "Dashboard".

---

## 2. La Logique : Comment tout fonctionne ensemble

### A. Phase de Lancement 
Tu as deux serveurs qui tournent en même temps :
1. Le Frontend React écoute tes clics (Exemple: Tu cliques sur "Responsable RH").
2. Le Backend Django attend silencieusement.

### B. Le Cycle d'une Requête (La récupération de la liste des employés)
1. **Lancement de l'App (React) :** Dès que tu ouvres le site, React "Se Monte" (`useEffect`). Il exécute notre fichier `api.ts`.
2. **L'Appel (Axios) :** Axios lance un *HTTP GET Request* vers `http://127.0.0.1:8000/api/employes/`.
3. **Le Réception par Django (URL) :** Dans le projet backend Django, le fichier `urls.py` voit l'appel arriver et le redirige vers le `EmployeViewSet` dans tes `views.py`.
4. **La Base de données (Models/Views) :** Le ViewSet de Django interroge la base de données (modèle `Employe.objects.all()`).
5. **La Sérialisation (DRF) :** Comme React ne sait pas lire le langage Python, le `EmployeSerializer` transforme tout cet objet Python en texte pur (JSON).
6. **Réponse (Django -> React) :** Django envoie ce JSON en retour à Axios en y joignant un statut "200 OK". L'application React sauvegarde instantanément ça dans son "État" (`useState`).
7. **L'Interface se met à jour :** React détecte automatiquement qu'il a reçu les nouvelles informations. Il dessine alors le `<EmployeeList />` (Notre table de collaborateurs) en écrivant les informations matricules/email sur l'écran !

---

## 3. Logiques Métier Spécifiques (Air Algérie)

Le projet intègre des règles strictes qui distinguent cette application d'un simple gestionnaire de congés :

### A. Priorité de Consommation (FIFO des Exercices)
Le système n'autorise pas la création d'une demande sur un exercice (ex: 2024/2025) si l'employé possède encore un solde positif sur un exercice plus ancien (ex: 2023/2024). Cette règle est codée directement dans la méthode `clean()` du modèle `DemandeConge`.

### B. Différenciation par Catégorie
Le profil de l'employé contient une `categorie` qui définit ses droits :
-   **SOL** : Acquis de 2.5 jours/mois (Maximum 30j/an).
-   **NAVIGANT / SUD** : Acquis de 3.75 jours/mois (Maximum 45j/an).

### C. Circuit de Validation
1.  **En attente Responsable** : Premier niveau de filtrage par le chef de structure.
2.  **En attente RH** : Validation finale par les Ressources Humaines.
3.  **Approuvée** : Une fois ce statut atteint, le système déduit automatiquement le solde et génère un "Titre de Congé" (document officiel).

---

## 4. Installation & Déploiement

Pour installer le projet sur une nouvelle machine, référez-vous au fichier [README.md](./README.md) qui contient le guide d'installation étape par étape utilisant `pip install -r requirements.txt`.
