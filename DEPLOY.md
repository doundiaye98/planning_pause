# Déploiement — Pause Entreprise

Checklist pour une mise en production **fiable** (sessions, sécurité, continuité de service).

## Render.com

### Champs du tableau de bord (service Web → Python)

| Champ | Valeur |
|--------|--------|
| **Répertoire racine** | **Laisser vide** (sauf monorepo : mettre le dossier qui contient `app/`, ex. `Pause` si le dépôt est `www` et le code dans `www/Pause`). Si tout le code est à la racine du dépôt GitHub, ne rien mettre. |
| **Commande de build** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

**Ne pas** utiliser le modèle « Gunicorn `your_application.wsgi` » : c’est pour les applications **WSGI** (Flask, Django classique). Ce projet est **FastAPI** = **ASGI** ; le démarrage se fait avec **Uvicorn** comme ci-dessus.

### Python et dépendances

- Le fichier **`runtime.txt`** à la racine du dépôt fixe **Python 3.12.7**. Sans lui, Render peut prendre **Python 3.14** et l’installation de **pydantic** échoue (compilation **maturin**).
- **`requirements.txt`** = prod uniquement (pas de `pytest` sur le serveur).

### Variables d’environnement (Render → Environment)

- **`ENV`** = `production`
- **`SESSION_SECRET`** = longue chaîne aléatoire (obligatoire en prod, voir **`.env.example`**)
- Optionnel : `SESSION_MAX_AGE_SECONDS`, `CORS_ORIGIN_REGEX`, `SQLALCHEMY_DATABASE_URL` si vous changez la base.

Render fournit **HTTPS** et la variable **`PORT`** automatiquement : d’où `--port $PORT` dans la commande de démarrage.

## Processus d’exécution

- L’API doit **tourner en continu** : service **systemd**, **Docker**, ou PaaS (**Railway**, **Fly.io**, **Render**, VPS avec superviseur) — pas seulement un lancement manuel en local.
- Commande type : `uvicorn app.main:app --host 0.0.0.0 --port 8000` (souvent derrière un reverse proxy ; sur PaaS utiliser le port fourni, ex. `$PORT`).

## HTTPS

- En production, `SESSION_COOKIE_SECURE=true` (défaut quand `ENV=production`) suppose du **HTTPS**.
- Mettre en place **TLS** via **Nginx**, **Caddy**, ou le certificat géré par votre hébergeur.

## Variables d’environnement

- Voir **`.env.example`**.
- Minimum en prod : **`ENV=production`**, **`SESSION_SECRET`** (long, aléatoire, unique).
- Optionnel : **`SESSION_MAX_AGE_SECONDS`**, **`SQLALCHEMY_DATABASE_URL`**, **`CORS_ORIGIN_REGEX`**.

## Front et API (origine)

- **Recommandé** : même site (ex. Nginx sert tout derrière `https://mondomaine.fr`, ou tout via FastAPI) → pas de souci CORS particulier pour les pages hébergées sur la même origine.
- Si le front est sur une **autre origine** que l’API : définir **`CORS_ORIGIN_REGEX`** pour autoriser ce domaine (regex ; cookies avec `credentials`).

## Base de données

- **SQLite** : adapté à un **faible** nombre d’utilisateurs et **un seul** serveur qui écrit la base ; éviter un fichier sur un disque réseau partagé fragile.
- Pour plus de charge ou haute disponibilité : migrer vers **PostgreSQL** (changement d’URL + migrations éventuelles).

## En pratique

- **VPS + Nginx + HTTPS + Uvicorn** : scénario **réaliste** et courant.
- **Sans** processus qui tourne **ou** **sans HTTPS** : sessions et sécurité ne sont **pas** fiables en prod.

## Résumé

Le projet est **déployable et fonctionnel** si vous fournissez : processus d’exécution, **HTTPS**, **secrets** (`SESSION_SECRET`), et si besoin **CORS** / même origine pour le front.
