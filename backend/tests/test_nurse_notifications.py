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


def test_can_register_and_approve_nurse():
    email = "nurse.sarah@hospital.demo"
    res = client.post(
        "/api/auth/register",
        json={"name": "Nurse Sarah", "email": email, "password": "password123", "requested_role": "nurse"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "nurse"
    assert res.json()["status"] == "pending"

    user_id = res.json()["id"]
    adm_tok = admin_token()
    approve_res = client.post(f"/api/auth/approve/{user_id}", headers={"Authorization": f"Bearer {adm_tok}"})
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"
    assert approve_res.json()["role"] == "nurse"


def test_nurse_receives_and_acknowledges_notifications():
    email = "nurse.joy@hospital.demo"
    signup = client.post(
        "/api/auth/register",
        json={"name": "Nurse Joy", "email": email, "password": "password123", "requested_role": "nurse"},
    )
    user_id = signup.json()["id"]
    adm_tok = admin_token()
    client.post(f"/api/auth/approve/{user_id}", headers={"Authorization": f"Bearer {adm_tok}"})

    login = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    nurse_tok = login.json()["access_token"]

    # 1. Nurse gets their notification feed
    notifs = client.get("/api/notifications", headers={"Authorization": f"Bearer {nurse_tok}"})
    assert notifs.status_code == 200
    notif_list = notifs.json()
    assert len(notif_list) > 0

    # 2. Admin dispatches a new direct shift reassignment
    dispatch_res = client.post(
        "/api/notifications/dispatch",
        json={
            "title": "⚡ Priority Shift Transfer to ICU",
            "message": "Please report to ICU Bed Wing to assist with urgent ventilator monitoring.",
            "from_department": "general_ward",
            "to_department": "icu",
            "target_role": "nurse",
            "action_type": "reassignment",
        },
        headers={"Authorization": f"Bearer {adm_tok}"},
    )
    assert dispatch_res.status_code == 200
    new_notif_id = dispatch_res.json()["id"]

    # 3. Nurse sees new notification and acknowledges it
    nurse_feed = client.get("/api/notifications", headers={"Authorization": f"Bearer {nurse_tok}"}).json()
    assert any(n["id"] == new_notif_id for n in nurse_feed)

    ack_res = client.post(
        f"/api/notifications/acknowledge/{new_notif_id}",
        headers={"Authorization": f"Bearer {nurse_tok}"},
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"
