import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ADMIN_EMAIL = "admin@hospital.demo"
ADMIN_PASSWORD = "admin123"


def admin_token():
    res = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_seeded_admin_can_log_in():
    res = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["status"] == "approved"


def test_wrong_password_rejected():
    res = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert res.status_code == 401


def test_unauthenticated_request_rejected():
    res = client.get("/api/hospital/state")
    assert res.status_code == 401


def test_new_signup_is_pending_and_cannot_log_in_yet():
    email = "new.nurse@hospital.demo"
    res = client.post("/api/auth/register", json={"name": "New Nurse", "email": email, "password": "password1"})
    assert res.status_code == 200
    assert res.json()["status"] == "pending"

    login_res = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    assert login_res.status_code == 200  # login succeeds, token issued...
    token = login_res.json()["access_token"]

    # ...but the token is rejected on real endpoints until an admin approves.
    state_res = client.get("/api/hospital/state", headers={"Authorization": f"Bearer {token}"})
    assert state_res.status_code == 403


def test_admin_can_approve_a_pending_user():
    email = "approve.me@hospital.demo"
    signup = client.post("/api/auth/register", json={"name": "Approve Me", "email": email, "password": "password1"})
    user_id = signup.json()["id"]

    token = admin_token()
    pending = client.get("/api/auth/pending", headers={"Authorization": f"Bearer {token}"})
    assert any(u["id"] == user_id for u in pending.json())

    approve = client.post(f"/api/auth/approve/{user_id}", headers={"Authorization": f"Bearer {token}"})
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"

    login = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    new_token = login.json()["access_token"]
    state_res = client.get("/api/hospital/state", headers={"Authorization": f"Bearer {new_token}"})
    assert state_res.status_code == 200


def test_only_admin_can_reset_or_approve():
    email = "nurse_test@hospital.demo"
    signup = client.post("/api/auth/register", json={"name": "Nurse Test", "email": email, "password": "password1"})
    user_id = signup.json()["id"]

    admin_tok = admin_token()
    client.post(f"/api/auth/approve/{user_id}", headers={"Authorization": f"Bearer {admin_tok}"})

    nurse_login = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    nurse_token = nurse_login.json()["access_token"]

    reset_res = client.post("/api/hospital/reset", headers={"Authorization": f"Bearer {nurse_token}"})
    assert reset_res.status_code == 403

    pending_res = client.get("/api/auth/pending", headers={"Authorization": f"Bearer {nurse_token}"})
    assert pending_res.status_code == 403


def test_approved_nurse_can_simulate():
    email = "sim.nurse@hospital.demo"
    signup = client.post("/api/auth/register", json={"name": "Sim Nurse", "email": email, "password": "password1"})
    user_id = signup.json()["id"]
    admin_tok = admin_token()
    client.post(f"/api/auth/approve/{user_id}", headers={"Authorization": f"Bearer {admin_tok}"})

    nurse_login = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    nurse_token = nurse_login.json()["access_token"]

    res = client.post(
        "/api/simulate",
        json={"actions": []},
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert res.status_code == 200
    assert "total_wait_min" in res.json()


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
