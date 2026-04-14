from datetime import date

from fastapi.testclient import TestClient


def test_health(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_admin(client: TestClient):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"
    assert data["email"] == "admin@univers-diaspora.fr"


def test_login_wrong_password(client: TestClient):
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "wrong"},
    )
    assert r.status_code == 401


def test_stats_requires_admin_session(client: TestClient):
    r = client.get("/api/stats")
    assert r.status_code == 401


def test_stats_with_admin(client: TestClient):
    client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    r = client.get("/api/stats")
    assert r.status_code == 200
    body = r.json()
    assert "employee_count" in body
    assert body["employee_count"] >= 0


def _create_employee(client: TestClient) -> int:
    client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    r = client.post(
        "/api/employees",
        json={
            "full_name": "Test Collaborateur",
            "email": "test.collab@example.com",
            "department": "QA",
            "role": "Test",
            "color": "#142843",
        },
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_assignment(client: TestClient):
    eid = _create_employee(client)
    day = date.today().isoformat()
    r = client.post(
        "/api/assignments",
        json={
            "employee_id": eid,
            "day_date": day,
            "start_time": "12:00:00",
            "end_time": "13:00:00",
            "label": "Pause test",
        },
    )
    assert r.status_code == 200
    assert r.json()["label"] == "Pause test"


def test_deactivate_self_forbidden(client: TestClient):
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    admin_id = login.json()["id"]
    r = client.delete(f"/api/admin/accounts/{admin_id}")
    assert r.status_code == 400
    assert "propre" in r.json()["detail"].lower() or "désactiver" in r.json()["detail"].lower()


def test_deactivate_employee_revokes_login(client: TestClient):
    eid = _create_employee(client)
    c = client.post(
        "/api/admin/accounts",
        json={
            "email": "collab.revoke@example.com",
            "password": "Demo2024!",
            "role": "employee",
            "employee_id": eid,
        },
    )
    assert c.status_code == 200
    lst = client.get("/api/admin/accounts")
    assert lst.status_code == 200
    row = next(a for a in lst.json() if a["email"] == "collab.revoke@example.com")
    sid = row["id"]
    r = client.delete(f"/api/admin/accounts/{sid}")
    assert r.status_code == 200
    assert r.json().get("deactivated") is True
    client.cookies.clear()
    bad = client.post(
        "/api/auth/login",
        json={"email": "collab.revoke@example.com", "password": "Demo2024!"},
    )
    assert bad.status_code == 401


def test_second_admin_then_deactivate_other(client: TestClient):
    client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    r = client.post(
        "/api/admin/accounts",
        json={
            "email": "admin2@example.com",
            "password": "OtherAdmin9!",
            "role": "admin",
            "employee_id": None,
        },
    )
    assert r.status_code == 200
    aid2 = r.json()["id"]
    d = client.delete(f"/api/admin/accounts/{aid2}")
    assert d.status_code == 200


def test_cannot_reuse_email_of_deactivated_account(client: TestClient):
    eid = _create_employee(client)
    client.post(
        "/api/auth/login",
        json={"email": "admin@univers-diaspora.fr", "password": "Admin2024!"},
    )
    client.post(
        "/api/admin/accounts",
        json={
            "email": "reuse.test@example.com",
            "password": "Pass123!",
            "role": "employee",
            "employee_id": eid,
        },
    )
    lst = client.get("/api/admin/accounts")
    acc = next(a for a in lst.json() if a["email"] == "reuse.test@example.com")
    client.delete(f"/api/admin/accounts/{acc['id']}")
    r = client.post(
        "/api/admin/accounts",
        json={
            "email": "reuse.test@example.com",
            "password": "NewPass1!",
            "role": "employee",
            "employee_id": eid,
        },
    )
    assert r.status_code == 400
    assert "désactivé" in r.json()["detail"].lower()
