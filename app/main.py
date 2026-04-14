import logging
from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware

from app import crud, models, schemas, settings
from app.database import Base, SessionLocal, engine, get_db
from app.deps import get_current_user, require_admin, require_employee
from app.security import verify_password

log = logging.getLogger("pause")

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
SESSION_SECRET = settings.get_session_secret()

app = FastAPI(title="Pause Entreprise", version="1.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    https_only=settings.session_https_only(),
    max_age=settings.session_max_age_seconds(),
)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Journalise les 500 ; masque le détail hors développement (pas de fuite d’infos)."""
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    log.exception("%s %s", request.method, request.url.path)
    if settings.is_production():
        return JSONResponse(
            status_code=500,
            content={"detail": "Erreur interne du serveur"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


def seed_demo_if_empty():
    db = SessionLocal()
    try:
        if db.scalar(select(models.Employee).limit(1)) is None:
            samples = [
                models.Employee(
                    full_name="Sophie Martin",
                    email="sophie.martin@entreprise.fr",
                    department="RH",
                    role="Responsable recrutement",
                    color="#a78bfa",
                ),
                models.Employee(
                    full_name="Thomas Leroy",
                    email="thomas.leroy@entreprise.fr",
                    department="IT",
                    role="Développeur",
                    color="#38bdf8",
                ),
                models.Employee(
                    full_name="Nadia Benali",
                    email="nadia.benali@entreprise.fr",
                    department="Commercial",
                    role="Account manager",
                    color="#f472b6",
                ),
            ]
            db.add_all(samples)
            db.commit()
    finally:
        db.close()


def seed_users_if_empty():
    from app.security import hash_password

    db = SessionLocal()
    try:
        if db.scalar(select(models.UserAccount).limit(1)) is not None:
            return
        db.add(
            models.UserAccount(
                email="admin@univers-diaspora.fr",
                password_hash=hash_password("Admin2024!"),
                role="admin",
                employee_id=None,
            )
        )
        pairs = [
            ("sophie.martin@entreprise.fr", "Demo2024!"),
            ("thomas.leroy@entreprise.fr", "Demo2024!"),
            ("nadia.benali@entreprise.fr", "Demo2024!"),
        ]
        for emp_email, pwd in pairs:
            emp = db.scalar(
                select(models.Employee).where(models.Employee.email == emp_email)
            )
            if emp:
                db.add(
                    models.UserAccount(
                        email=emp_email,
                        password_hash=hash_password(pwd),
                        role="employee",
                        employee_id=emp.id,
                    )
                )
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_demo_if_empty()
    seed_users_if_empty()


def _user_me_schema(db: Session, user: models.UserAccount) -> schemas.UserMe:
    emp_read = None
    if user.employee_id:
        e = crud.get_employee(db, user.employee_id)
        if e:
            emp_read = schemas.EmployeeRead.model_validate(e)
    return schemas.UserMe(
        id=user.id,
        email=user.email,
        role=user.role,
        employee_id=user.employee_id,
        employee=emp_read,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=schemas.UserMe)
def auth_login(
    body: schemas.LoginBody,
    request: Request,
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    request.session["user_id"] = user.id
    return _user_me_schema(db, user)


@app.post("/api/auth/logout")
def auth_logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/me", response_model=schemas.UserMe)
def auth_me(
    user: models.UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _user_me_schema(db, user)


@app.get("/api/stats", response_model=schemas.StatsRead)
def api_stats(
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    return crud.stats(db)


@app.get("/api/employees", response_model=list[schemas.EmployeeRead])
def api_employees_list(
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    return crud.list_employees(db)


@app.post("/api/employees", response_model=schemas.EmployeeRead)
def api_employees_create(
    body: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    return crud.create_employee(db, body)


@app.patch("/api/employees/{employee_id}", response_model=schemas.EmployeeRead)
def api_employees_patch(
    employee_id: int,
    body: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    emp = crud.get_employee(db, employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    return crud.update_employee(db, emp, body)


@app.delete("/api/employees/{employee_id}")
def api_employees_delete(
    employee_id: int,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    emp = crud.get_employee(db, employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    crud.delete_employee(db, emp)
    return {"ok": True}


@app.post("/api/admin/accounts", response_model=schemas.UserMe)
def api_admin_create_account(
    body: schemas.UserAccountCreate,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    try:
        user = crud.create_user_account(db, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return _user_me_schema(db, user)


@app.get("/api/admin/accounts", response_model=list[schemas.UserMe])
def api_admin_list_accounts(
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    rows = crud.list_user_accounts(db)
    return [_user_me_schema(db, u) for u in rows]


@app.delete("/api/admin/accounts/{account_id}")
def api_admin_deactivate_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: models.UserAccount = Depends(require_admin),
):
    """Révoque le login (is_active=False) sans supprimer l’historique métier."""
    try:
        crud.deactivate_user_account(db, account_id, user.id)
    except ValueError as e:
        msg = str(e)
        code = 404 if msg == "Compte introuvable" else 400
        raise HTTPException(status_code=code, detail=msg) from e
    return {"ok": True, "deactivated": True}


@app.get(
    "/api/assignments",
    response_model=list[schemas.BreakAssignmentWithEmployee],
)
def api_assignments(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    return crud.list_assignments(db, date_from=date_from, date_to=date_to)


@app.post(
    "/api/assignments",
    response_model=schemas.BreakAssignmentRead,
)
def api_assignments_create(
    body: schemas.BreakAssignmentCreate,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    if crud.get_employee(db, body.employee_id) is None:
        raise HTTPException(status_code=400, detail="Employé invalide")
    if body.start_time >= body.end_time:
        raise HTTPException(
            status_code=400,
            detail="L'heure de fin doit être après l'heure de début",
        )
    return crud.create_assignment(db, body)


@app.delete("/api/assignments/{assignment_id}")
def api_assignments_delete(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: models.UserAccount = Depends(require_admin),
):
    if not crud.delete_assignment(db, assignment_id):
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    return {"ok": True}


@app.get("/api/me/summary", response_model=schemas.MeSummary)
def api_me_summary(
    db: Session = Depends(get_db),
    user: models.UserAccount = Depends(require_employee),
):
    try:
        return crud.employee_summary(db, user.employee_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.get(
    "/api/me/assignments",
    response_model=list[schemas.BreakAssignmentRead],
)
def api_me_assignments_list(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: models.UserAccount = Depends(require_employee),
):
    rows = crud.list_assignments_for_employee(
        db, user.employee_id, date_from=date_from, date_to=date_to
    )
    return rows


@app.post(
    "/api/me/assignments",
    response_model=schemas.BreakAssignmentRead,
)
def api_me_assignments_create(
    body: schemas.BreakAssignmentSelfCreate,
    db: Session = Depends(get_db),
    user: models.UserAccount = Depends(require_employee),
):
    if body.start_time >= body.end_time:
        raise HTTPException(
            status_code=400,
            detail="L'heure de fin doit être après l'heure de début",
        )
    payload = schemas.BreakAssignmentCreate(
        employee_id=user.employee_id,
        day_date=body.day_date,
        start_time=body.start_time,
        end_time=body.end_time,
        label=body.label,
    )
    return crud.create_assignment(db, payload)


@app.delete("/api/me/assignments/{assignment_id}")
def api_me_assignments_delete(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: models.UserAccount = Depends(require_employee),
):
    if not crud.delete_assignment_if_employee(db, assignment_id, user.employee_id):
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    return {"ok": True}


app.mount("/assets", StaticFiles(directory=str(STATIC)), name="assets")


def _file_response(name: str) -> FileResponse:
    path = STATIC / name
    if not path.is_file():
        raise HTTPException(status_code=404)
    return FileResponse(path)


@app.get("/")
def serve_accueil():
    return _file_response("index.html")


@app.get("/planification")
def serve_planification():
    return _file_response("planification.html")


@app.get("/connexion")
def serve_connexion():
    return _file_response("connexion.html")


@app.get("/espace-collaborateur")
def serve_espace_collaborateur():
    return _file_response("espace-collaborateur.html")
