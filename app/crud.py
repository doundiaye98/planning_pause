from datetime import date, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.security import hash_password


def list_employees(db: Session) -> list[models.Employee]:
    return list(db.scalars(select(models.Employee).order_by(models.Employee.full_name)))


def get_employee(db: Session, employee_id: int) -> models.Employee | None:
    return db.get(models.Employee, employee_id)


def create_employee(db: Session, data: schemas.EmployeeCreate) -> models.Employee:
    emp = models.Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def update_employee(
    db: Session, employee: models.Employee, data: schemas.EmployeeUpdate
) -> models.Employee:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(employee, k, v)
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee: models.Employee) -> None:
    db.delete(employee)
    db.commit()


def list_assignments(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[models.BreakAssignment]:
    q = select(models.BreakAssignment).options(joinedload(models.BreakAssignment.employee))
    if date_from is not None:
        q = q.where(models.BreakAssignment.day_date >= date_from)
    if date_to is not None:
        q = q.where(models.BreakAssignment.day_date <= date_to)
    q = q.order_by(models.BreakAssignment.day_date, models.BreakAssignment.start_time)
    return list(db.scalars(q).unique())


def create_assignment(
    db: Session, data: schemas.BreakAssignmentCreate
) -> models.BreakAssignment:
    row = models.BreakAssignment(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_assignment(db: Session, assignment_id: int) -> models.BreakAssignment | None:
    return db.get(models.BreakAssignment, assignment_id)


def delete_assignment(db: Session, assignment_id: int) -> bool:
    row = db.get(models.BreakAssignment, assignment_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def delete_assignment_if_employee(
    db: Session, assignment_id: int, employee_id: int
) -> bool:
    row = db.get(models.BreakAssignment, assignment_id)
    if row is None or row.employee_id != employee_id:
        return False
    db.delete(row)
    db.commit()
    return True


def list_assignments_for_employee(
    db: Session,
    employee_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[models.BreakAssignment]:
    q = select(models.BreakAssignment).where(models.BreakAssignment.employee_id == employee_id)
    if date_from is not None:
        q = q.where(models.BreakAssignment.day_date >= date_from)
    if date_to is not None:
        q = q.where(models.BreakAssignment.day_date <= date_to)
    q = q.order_by(models.BreakAssignment.day_date, models.BreakAssignment.start_time)
    return list(db.scalars(q))


def get_user_by_email(db: Session, email: str) -> models.UserAccount | None:
    """Compte actif uniquement (connexion)."""
    key = email.strip().lower()
    return db.scalar(
        select(models.UserAccount).where(
            models.UserAccount.email == key,
            models.UserAccount.is_active == True,  # noqa: E712
        )
    )


def get_any_user_by_email(db: Session, email: str) -> models.UserAccount | None:
    key = email.strip().lower()
    return db.scalar(select(models.UserAccount).where(models.UserAccount.email == key))


def create_user_account(db: Session, data: schemas.UserAccountCreate) -> models.UserAccount:
    email = data.email.strip().lower()
    existing_mail = get_any_user_by_email(db, email)
    if existing_mail:
        if existing_mail.is_active:
            raise ValueError("Cet e-mail est déjà utilisé")
        raise ValueError(
            "Cet e-mail correspond à un compte désactivé. Réactivez-le ou choisissez un autre e-mail."
        )
    if data.role == "employee" and data.employee_id is None:
        raise ValueError("Un collaborateur doit être rattaché à une fiche")
    if data.role == "admin" and data.employee_id is not None:
        raise ValueError("Un administrateur ne doit pas être rattaché à une fiche")
    if data.employee_id is not None:
        emp = get_employee(db, data.employee_id)
        if emp is None:
            raise ValueError("Fiche collaborateur introuvable")
        existing = db.scalar(
            select(models.UserAccount).where(
                models.UserAccount.employee_id == data.employee_id,
                models.UserAccount.is_active == True,  # noqa: E712
            )
        )
        if existing:
            raise ValueError("Ce collaborateur a déjà un compte")
    row = models.UserAccount(
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
        employee_id=data.employee_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_user_accounts(db: Session) -> list[models.UserAccount]:
    return list(
        db.scalars(
            select(models.UserAccount)
            .options(joinedload(models.UserAccount.employee))
            .where(models.UserAccount.is_active == True)  # noqa: E712
            .order_by(
                case((models.UserAccount.role == "admin", 0), else_=1),
                models.UserAccount.email,
            )
        ).unique()
    )


def get_user_account(db: Session, account_id: int) -> models.UserAccount | None:
    return db.get(models.UserAccount, account_id)


def deactivate_user_account(db: Session, account_id: int, actor_account_id: int) -> None:
    """Désactive un compte (révocation du login) sans supprimer la ligne en base."""
    row = db.get(models.UserAccount, account_id)
    if row is None:
        raise ValueError("Compte introuvable")
    if not row.is_active:
        raise ValueError("Compte déjà désactivé")
    if row.id == actor_account_id:
        raise ValueError("Vous ne pouvez pas désactiver votre propre compte")
    if row.role == "admin":
        admin_count = (
            db.scalar(
                select(func.count())
                .select_from(models.UserAccount)
                .where(
                    models.UserAccount.role == "admin",
                    models.UserAccount.is_active == True,  # noqa: E712
                )
            )
            or 0
        )
        if admin_count <= 1:
            raise ValueError("Impossible de désactiver le dernier administrateur")
    row.is_active = False
    db.commit()


def employee_summary(db: Session, employee_id: int) -> schemas.MeSummary:
    emp = get_employee(db, employee_id)
    if emp is None:
        raise ValueError("Employé introuvable")
    today = date.today()
    week_end = today + timedelta(days=6)
    today_n = (
        db.scalar(
            select(func.count())
            .select_from(models.BreakAssignment)
            .where(
                models.BreakAssignment.employee_id == employee_id,
                models.BreakAssignment.day_date == today,
            )
        )
        or 0
    )
    week_n = (
        db.scalar(
            select(func.count())
            .select_from(models.BreakAssignment)
            .where(
                models.BreakAssignment.employee_id == employee_id,
                models.BreakAssignment.day_date >= today,
                models.BreakAssignment.day_date <= week_end,
            )
        )
        or 0
    )
    return schemas.MeSummary(
        employee=schemas.EmployeeRead.model_validate(emp),
        assignment_count_today=today_n,
        assignment_count_week=week_n,
    )


def stats(db: Session) -> schemas.StatsRead:
    today = date.today()
    week_end = today + timedelta(days=6)
    emp_count = db.scalar(select(func.count()).select_from(models.Employee)) or 0
    today_count = db.scalar(
        select(func.count())
        .select_from(models.BreakAssignment)
        .where(models.BreakAssignment.day_date == today)
    ) or 0
    week_count = db.scalar(
        select(func.count())
        .select_from(models.BreakAssignment)
        .where(
            models.BreakAssignment.day_date >= today,
            models.BreakAssignment.day_date <= week_end,
        )
    ) or 0
    return schemas.StatsRead(
        employee_count=emp_count,
        assignment_count_today=today_count,
        assignment_count_week=week_count,
    )
