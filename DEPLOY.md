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

### Variables sur Render

Dans **Environment** → **Environment Variables**, ajoutez les clés du **tableau « Variables d’environnement (référence) »** plus bas (au minimum `ENV` et `SESSION_SECRET` en prod).

Render fournit **`PORT`** et **HTTPS** ; ne définissez pas `PORT` à la main.

**Générer `SESSION_SECRET` (exemple)** : sous Linux/macOS `openssl rand -hex 32` ; ou tout générateur de chaîne longue et aléatoire (≥ 32 caractères).

## Processus d’exécution

- L’API doit **tourner en continu** : service **systemd**, **Docker**, ou PaaS (**Railway**, **Fly.io**, **Render**, VPS avec superviseur) — pas seulement un lancement manuel en local.
- Commande type : `uvicorn app.main:app --host 0.0.0.0 --port 8000` (souvent derrière un reverse proxy ; sur PaaS utiliser le port fourni, ex. `$PORT`).

## HTTPS

- En production, `SESSION_COOKIE_SECURE=true` (défaut quand `ENV=production`) suppose du **HTTPS**.
- Mettre en place **TLS** via **Nginx**, **Caddy**, ou le certificat géré par votre hébergeur.

## Variables d’environnement (référence)

Copie locale : fichier **`.env.example`** (ne pas committer un vrai `.env` avec secrets).

| Variable | Obligatoire en prod ? | Défaut / exemple | Rôle |
|----------|------------------------|------------------|------|
| **`ENV`** | **Oui** (Render / prod) | *(vide)* en dev | Mettre `production` ou `prod` pour activer les règles prod (secret session obligatoire, cookie `Secure` par défaut, durée de session 7 jours si non surchargée). |
| **`SESSION_SECRET`** | **Oui** si `ENV=production` | Dev : valeur de secours intégrée au code (à ne pas utiliser en prod) | Clé de signature des cookies de session Starlette. **Doit être unique et longue** ; sinon l’app refuse de démarrer en prod. |
| **`SESSION_COOKIE_SECURE`** | Non | `true` en prod, `false` en dev | `true` = cookie envoyé seulement en **HTTPS**. Sur Render c’est en général **correct laisser `true`** (ou ne pas définir → défaut prod = true). |
| **`SESSION_MAX_AGE_SECONDS`** | Non | Prod : **604800** (7 j) si absent ; dev : session navigateur | Durée de vie max du cookie de session en secondes. |
| **`SQLALCHEMY_DATABASE_URL`** | Non | `sqlite:///./pause_entreprise.db` | URL SQLAlchemy. En prod sur Render, SQLite sur disque **éphémère** peut se perdre au redémarrage ; pour des données persistantes, utiliser une **PostgreSQL** Render et l’URL fournie (`postgresql+psycopg://...`). |
| **`CORS_ORIGIN_REGEX`** | Non | Localhost uniquement | Regex des origines autorisées pour **CORS** (requêtes avec `credentials`). À renseigner si le **front** est sur un **autre domaine** que l’API. Ex. : `https?://(www\.)?mondomaine\.onrender\.com` |

**Variables que vous ne devez pas définir** : `PORT` (injecté par Render).

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
