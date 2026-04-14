# Planning pause — Univers Diaspora

Application interne de **planification des pauses** : annuaire collaborateurs, créneaux, espaces administrateur et collaborateur.

## Prérequis

- Python 3.11+
- Dépendances : `pip install -r requirements.txt`

## Lancer en local

```bash
cd Pause
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Ouvrir : [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## Tests

```bash
python -m pytest tests/ -v
```

## Déploiement

Voir **[DEPLOY.md](DEPLOY.md)** et **[.env.example](.env.example)**.

## Licence

Usage interne / projet pédagogique selon votre contexte.
