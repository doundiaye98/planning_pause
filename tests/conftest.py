import os

os.environ.setdefault("SQLALCHEMY_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SESSION_SECRET", "pytest-session-secret-not-for-prod")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app, seed_users_if_empty


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_users_if_empty()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
