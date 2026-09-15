from fastapi import APIRouter, Depends, HTTPException, status

from app import decisions_log
from app.data.sample_hospital import get_initial_state
from app.dependencies import get_current_user, require_admin, require_data_editor
from app.hospital_ops import apply_department_update_or_raise
from app.models import DepartmentId, DepartmentUpdateRequest, HospitalState, User, UserRole
from app.simulation.engine import predict_all
from app.state_store import get_state, set_state

router = APIRouter(prefix="/api/hospital", tags=["hospital"])


@router.get("/state", response_model=HospitalState)
def read_state(_: User = Depends(get_current_user)) -> HospitalState:
    return get_state()


@router.post("/reset", response_model=HospitalState)
def reset_state(user: User = Depends(require_admin)) -> HospitalState:
    fresh = get_initial_state()
    set_state(fresh)
    decisions_log.record(user.name, "reset", [], None, None)
    return fresh


@router.get("/predict")
def predict_current(_: User = Depends(get_current_user)):
    state = get_state()
    return predict_all(state)


@router.get("/dependencies")
def dependency_graph(_: User = Depends(get_current_user)):
    """Edges for a ripple-effect map: which departments depend on which."""
    state = get_state()
    edges = []
    for dept in state.departments.values():
        for target in dept.depends_on:
            edges.append({"from": dept.id, "to": target})
    return edges


@router.put("/departments/{department_id}", response_model=HospitalState)
def update_department(
    department_id: DepartmentId,
    update: DepartmentUpdateRequest,
    user: User = Depends(require_data_editor),
) -> HospitalState:
    """Admin- or data-entry-accessible: overwrite a department's live
    operational numbers (beds, staff, queue, service time) so the
    simulation immediately reflects real, current hospital data instead of
    the seed demo values. Changing which departments depend on which is a
    structural edit and stays admin-only."""

    if update.depends_on is not None and user.role != UserRole.ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only admins can change department dependencies"
        )

    state = get_state()
    if department_id not in state.departments:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown department")

    dept = state.departments[department_id]
    changes = apply_department_update_or_raise(state, department_id, update)
    set_state(state)

    if changes:
        kind_prefix = "" if user.role == UserRole.ADMIN else "[data entry] "
        decisions_log.record_labels(
            user.name, "data_update", [f"{kind_prefix}{dept.name}: {c}" for c in changes]
        )

    return state
