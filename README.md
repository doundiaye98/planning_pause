# Planning pause — Univers Diaspora

Application interne de **planification des pauses** : annuaire collaborateurs, créneaux, espaces administrateur et collaborateur.

## Prérequis

- Python **3.12** recommandé (évite les échecs de build `pydantic-core` sur des versions trop récentes sans roues binaires).
- Dépendances prod : `pip install -r requirements.txt`
- Développement / tests : `pip install -r requirements-dev.txt`

## Lancer en local

```bash
cd Pause
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Ouvrir : [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

## Déploiement

Voir **[DEPLOY.md](DEPLOY.md)** et **[.env.example](.env.example)**.

## Licence

Usage interne / projet pédagogique selon votre contexte.
