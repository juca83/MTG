# 💑 Budget Duo — Suivi de dépenses en couple

Application mobile-first (PWA) pour suivre vos dépenses en couple. Fonctionne sur iPhone comme une vraie app.

## Fonctionnalités

- **Dépenses Tricount-like** : qui a payé, pour qui, combien, quelle catégorie
- **Répartition flexible** : égale ou personnalisée entre membres
- **18 catégories** pré-configurées (Loyer, Courses, Restaurant, Bar, Transport, Santé, Shopping...)
- **Comptes bancaires** : compte commun, comptes personnels de chacun
- **Dashboard** mensuel : balance, top dépenses, qui doit quoi
- **Analyse** : graphiques par mois, par catégorie, par personne
- **Budgets** mensuels avec indicateurs de progression
- **PWA** : installable sur iPhone via Safari

## Démarrage rapide

```bash
./start.sh
```

L'app s'ouvre sur `http://localhost:3000`.

### Démarrage manuel

**Backend (Python) :**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (Node.js) :**
```bash
cd frontend
npm install
npm run dev
```

## Installation sur iPhone

1. Trouvez l'IP de votre PC : `hostname -I`
2. Les deux iPhones ouvrent `http://VOTRE_IP:3000` dans **Safari**
3. Safari → Partager → **"Sur l'écran d'accueil"**
4. L'app s'installe comme une vraie appli !

> **Important** : les deux iPhones et le PC doivent être sur le **même réseau WiFi**.

## Première utilisation

1. **Réglages** → Créez les 2 profils (vous + votre compagne) avec emoji et couleur
2. **Comptes** → Ajoutez vos comptes bancaires (Compte commun, compte perso de chacun)
3. **Dépenses** → Commencez à saisir vos dépenses
4. **Dashboard** → Visualisez votre situation mensuelle

## Stack technique

| Couche    | Technologie                    |
|-----------|-------------------------------|
| Frontend  | React 18, Tailwind CSS, Vite, PWA |
| Backend   | Python FastAPI, uvicorn        |
| Base de données | SQLite (locale, zéro config) |
| Graphiques | Recharts                      |

## Structure des fichiers

```
backend/
  main.py          # Application FastAPI
  database.py      # Schéma SQLite + initialisation
  models.py        # Modèles Pydantic
  routers/
    users.py        accounts.py
    categories.py   expenses.py
    analytics.py    budgets.py

frontend/src/
  pages/
    Dashboard.jsx   # Vue d'ensemble mensuelle
    Expenses.jsx    # Liste et saisie de dépenses
    Analytics.jsx   # Graphiques et analyses
    Budgets.jsx     # Gestion des budgets
    Accounts.jsx    # Comptes bancaires
    Settings.jsx    # Profils et catégories
  components/
    ExpenseForm.jsx # Formulaire de saisie
  api.js            # Client API
```

## Données

La base de données est dans `backend/expenses.db` (SQLite).
Sauvegardez ce fichier pour conserver vos données.

## Déploiement en ligne (optionnel)

Pour accéder à l'app depuis n'importe où (sans être sur le même WiFi) :
- **Backend** : Railway ou Render (gratuit)
- **Frontend** : Vercel (gratuit)
- **Base de données** : migrez vers Supabase (gratuit)
