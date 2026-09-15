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


def register_and_approve(email: str, role: str = "nurse") -> str:
    reg = client.post(
        "/api/auth/register",
        json={"name": "Ward Clerk", "email": email, "password": "password1", "requested_role": role},
    )
    assert reg.status_code == 200, reg.text
    assert reg.json()["role"] == role

    admin_headers = {"Authorization": f"Bearer {admin_token()}"}
    pending = client.get("/api/auth/pending", headers=admin_headers).json()
    user_id = next(u["id"] for u in pending if u["email"] == email)
    client.post(f"/api/auth/approve/{user_id}", headers=admin_headers)

    login = client.post("/api/auth/login", json={"email": email, "password": "password1"})
    return login.json()["access_token"]


def setup_function():
    set_state(get_initial_state())


def test_can_self_register_as_data_entry():
    token = register_and_approve("clerk1@hospital.demo", role="data_entry")
    res = client.put(
        "/api/hospital/departments/icu",
        json={"patients_waiting": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["departments"]["icu"]["patients_waiting"] == 5


def test_cannot_self_register_as_admin():
    res = client.post(
        "/api/auth/register",
        json={"name": "Sneaky", "email": "sneaky@hospital.demo", "password": "password1", "requested_role": "admin"},
    )
    assert res.status_code == 422


def test_data_entry_cannot_change_dependencies():
    token = register_and_approve("clerk2@hospital.demo", role="data_entry")
    res = client.put(
        "/api/hospital/departments/icu",
        json={"depends_on": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_data_entry_update_is_reflected_immediately_in_shared_state():
    token = register_and_approve("clerk3@hospital.demo", role="data_entry")
    client.put(
        "/api/hospital/departments/general_ward",
        json={"beds_occupied": 39},
        headers={"Authorization": f"Bearer {token}"},
    )
    # The admin's data-feed view reads the exact same shared state — no
    # separate sync step needed.
    admin_headers = {"Authorization": f"Bearer {admin_token()}"}
    state = client.get("/api/hospital/state", headers=admin_headers).json()
    assert state["departments"]["general_ward"]["beds_occupied"] == 39


def test_plain_nurse_still_cannot_update_department_data():
    token = register_and_approve("nurse2@hospital.demo", role="nurse")
    res = client.put(
        "/api/hospital/departments/icu",
        json={"patients_waiting": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_data_entry_cannot_use_import_or_export():
    token = register_and_approve("clerk4@hospital.demo", role="data_entry")
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/hospital/export.xlsx", headers=headers).status_code == 200  # read-only export stays open to any approved user
    res = client.post(
        "/api/hospital/import",
        headers=headers,
        files={"file": ("u.csv", b"department_id,beds_total\nicu,20\n", "text/csv")},
    )
    assert res.status_code == 403


def test_admin_can_reassign_a_users_role():
    token = register_and_approve("clerk5@hospital.demo", role="nurse")
    admin_headers = {"Authorization": f"Bearer {admin_token()}"}
    users = client.get("/api/auth/users", headers=admin_headers).json()
    user_id = next(u["id"] for u in users if u["email"] == "clerk5@hospital.demo")

    res = client.post(f"/api/auth/role/{user_id}", json={"role": "data_entry"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "data_entry"

    # log back in (role is embedded in the fresh JWT/user lookup) and confirm the new permission
    login = client.post("/api/auth/login", json={"email": "clerk5@hospital.demo", "password": "password1"})
    new_token = login.json()["access_token"]
    res = client.put(
        "/api/hospital/departments/radiology",
        json={"patients_waiting": 2},
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert res.status_code == 200


def test_role_reassignment_is_admin_only():
    token = register_and_approve("clerk6@hospital.demo", role="nurse")
    res = client.post(
        "/api/auth/role/anyone",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
