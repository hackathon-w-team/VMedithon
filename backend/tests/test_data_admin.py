import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.main import app
from app.state_store import get_state, set_state
from app.data.sample_hospital import get_initial_state

client = TestClient(app)

ADMIN_EMAIL = "admin@hospital.demo"
ADMIN_PASSWORD = "admin123"


def admin_token():
    res = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return res.json()["access_token"]


def approved_staff_token(email: str):
    client.post("/api/auth/register", json={"name": "Staffer", "email": email, "password": "password1"})
    admin_res = client.get(
        "/api/auth/pending", headers={"Authorization": f"Bearer {admin_token()}"}
    )
    pending_id = next(u["id"] for u in admin_res.json() if u["email"] == email)
    client.post(f"/api/auth/approve/{pending_id}", headers={"Authorization": f"Bearer {admin_token()}"})
    login = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    return login.json()["access_token"]


def setup_function():
    # reset live state before each test so edits don't leak across tests
    set_state(get_initial_state())


def test_admin_can_update_department_fields():
    token = admin_token()
    res = client.put(
        "/api/hospital/departments/general_ward",
        json={"beds_total": 45, "staff_total": 18, "staff_assigned": 16},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    updated = res.json()["departments"]["general_ward"]
    assert updated["beds_total"] == 45
    assert updated["staff_assigned"] == 16
    # untouched fields stay as they were
    assert updated["patients_waiting"] == 3


def test_update_is_reflected_in_live_predictions():
    token = admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    before = client.get("/api/hospital/predict", headers=headers).json()
    before_wait = next(p["predicted_wait_min"] for p in before if p["department"] == "general_ward")

    client.put(
        "/api/hospital/departments/general_ward",
        json={"patients_waiting": 20},
        headers=headers,
    )

    after = client.get("/api/hospital/predict", headers=headers).json()
    after_wait = next(p["predicted_wait_min"] for p in after if p["department"] == "general_ward")
    assert after_wait > before_wait


def test_staff_cannot_update_department_data():
    staff_token = approved_staff_token("data.staffer@hospital.demo")
    res = client.put(
        "/api/hospital/departments/general_ward",
        json={"beds_total": 100},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res.status_code == 403


def test_occupied_beds_cannot_exceed_total():
    token = admin_token()
    res = client.put(
        "/api/hospital/departments/general_ward",
        json={"beds_total": 5, "beds_occupied": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_department_cannot_depend_on_itself():
    token = admin_token()
    res = client.put(
        "/api/hospital/departments/emergency",
        json={"depends_on": ["emergency"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_unknown_department_returns_404():
    token = admin_token()
    res = client.put(
        "/api/hospital/departments/not_a_real_department",
        json={"beds_total": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422  # rejected by the DepartmentId path enum before reaching the handler


def test_data_update_is_logged():
    token = admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    client.put("/api/hospital/departments/icu", json={"staff_assigned": 6}, headers=headers)
    log = client.get("/api/decisions", headers=headers).json()
    assert any(entry["kind"] == "data_update" for entry in log)


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
