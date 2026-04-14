import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = os.environ.get(
    "SQLALCHEMY_DATABASE_URL",
    "sqlite:///./pause_entreprise.db",
)

_engine_kw: dict = {"connect_args": {"check_same_thread": False}}
if ":memory:" in SQLALCHEMY_DATABASE_URL:
    _engine_kw["poolclass"] = StaticPool

engine = create_engine(SQLALCHEMY_DATABASE_URL, **_engine_kw)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
