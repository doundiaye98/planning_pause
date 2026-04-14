"""Supprime les fiches collaborateurs de démo (noms ou e-mails connus) si elles existent."""
from sqlalchemy import func, or_, select

from app import crud, models
from app.database import SessionLocal

DEMO_FULL_NAMES = (
    "Nadia Benali",
    "Sophie Martin",
    "Thomas Leroy",
)

DEMO_EMAILS = (
    "sophie.martin@entreprise.fr",
    "thomas.leroy@entreprise.fr",
    "nadia.benali@entreprise.fr",
)


def main() -> None:
    db = SessionLocal()
    try:
        conds_name = [models.Employee.full_name == n for n in DEMO_FULL_NAMES]
        conds_mail = [
            func.lower(models.Employee.email) == e.lower() for e in DEMO_EMAILS if e
        ]
        q = select(models.Employee).where(or_(*conds_name, *conds_mail))
        seen: set[int] = set()
        for emp in list(db.scalars(q)):
            if emp.id in seen:
                continue
            seen.add(emp.id)
            label = emp.full_name or emp.email or emp.id
            crud.delete_employee(db, emp)
            print("Supprimé:", label, f"(id={emp.id})")
        n = len(list(db.scalars(select(models.Employee))))
        print("Collaborateurs restants:", n)
    finally:
        db.close()


if __name__ == "__main__":
    main()
