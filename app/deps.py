from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> models.UserAccount:
    uid = request.session.get("user_id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    user = db.get(models.UserAccount, int(uid))
    if user is None or not user.is_active:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Session invalide")
    return user


def require_admin(user: models.UserAccount = Depends(get_current_user)) -> models.UserAccount:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user


def require_employee(user: models.UserAccount = Depends(get_current_user)) -> models.UserAccount:
    if user.role != "employee":
        raise HTTPException(status_code=403, detail="Espace réservé aux collaborateurs")
    if user.employee_id is None:
        raise HTTPException(
            status_code=403,
            detail="Compte non rattaché à une fiche collaborateur",
        )
    return user
