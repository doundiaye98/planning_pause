"""Configuration runtime (sessions, environnement)."""

from __future__ import annotations

import os

DEV_SESSION_SECRET = "pause-dev-secret-changez-moi-en-production"


def is_production() -> bool:
    return os.environ.get("ENV", "").strip().lower() in ("production", "prod")


def get_session_secret() -> str:
    secret = os.environ.get("SESSION_SECRET", "").strip()
    if is_production():
        if not secret or secret == DEV_SESSION_SECRET:
            raise RuntimeError(
                "En production, définissez SESSION_SECRET dans l'environnement "
                "(valeur longue et aléatoire, différente du secret de développement)."
            )
        return secret
    return secret or DEV_SESSION_SECRET


def session_https_only() -> bool:
    if is_production():
        return os.environ.get("SESSION_COOKIE_SECURE", "true").strip().lower() in (
            "1",
            "true",
            "yes",
        )
    return os.environ.get("SESSION_COOKIE_SECURE", "false").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def session_max_age_seconds() -> int | None:
    """Durée max du cookie de session en secondes (None = session navigateur)."""
    raw = os.environ.get("SESSION_MAX_AGE_SECONDS", "").strip()
    if raw:
        return int(raw)
    if is_production():
        return 7 * 24 * 60 * 60  # 7 jours
    return None


def cors_origin_regex() -> str:
    """
    Regex des origines autorisées pour CORS (credentials inclus).
    Si le front et l’API sont sur le même hôte (recommandé), peu utilisé pour les pages servies par FastAPI.
    Ex. prod : https?://(www\\.)?mondomaine\\.fr
    """
    custom = os.environ.get("CORS_ORIGIN_REGEX", "").strip()
    if custom:
        return custom
    return r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?"
