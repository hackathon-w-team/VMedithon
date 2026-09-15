"""
Shared logic for applying a partial update to one department's live
operational numbers. Used by both the manual "Hospital data" form
(routers/hospital.py) and the spreadsheet import feed
(routers/data_feed.py) so the two entry points can never drift apart or
enforce different validation rules.
"""

from __future__ import annotations

from fastapi import HTTPException, status

from app.models import DepartmentId, DepartmentUpdateRequest, HospitalState


class DepartmentUpdateError(Exception):
    """Raised for a bad update; carries an HTTP status code to translate to."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def apply_department_update(
    state: HospitalState, department_id: DepartmentId, update: DepartmentUpdateRequest
) -> list[str]:
    """Applies `update` to `state` in place. Returns a list of human-readable
    change descriptions (empty if nothing actually changed). Raises
    DepartmentUpdateError on invalid input."""

    dept = state.departments.get(department_id)
    if dept is None:
        raise DepartmentUpdateError(status.HTTP_404_NOT_FOUND, "Unknown department")

    # Work on a copy so a rejected update (e.g. beds_occupied > beds_total)
    # never partially mutates the live, shared state — either the whole
    # update lands or none of it does.
    draft = dept.model_copy(deep=True)
    changes: list[str] = []

    def apply_field(field: str, new_value, label: str, fmt=str):
        nonlocal changes
        if new_value is None:
            return
        old_value = getattr(draft, field)
        if new_value != old_value:
            changes.append(f"{label} {fmt(old_value)} \u2192 {fmt(new_value)}")
        setattr(draft, field, new_value)

    apply_field("beds_total", update.beds_total, "beds total")
    apply_field("beds_occupied", update.beds_occupied, "beds occupied")
    apply_field("staff_total", update.staff_total, "staff total")
    apply_field("staff_assigned", update.staff_assigned, "staff on duty")
    apply_field("patients_waiting", update.patients_waiting, "patients waiting")
    apply_field("avg_service_time_min", update.avg_service_time_min, "avg service time", lambda v: f"{v}min")

    if update.depends_on is not None:
        if department_id in update.depends_on:
            raise DepartmentUpdateError(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "A department can't depend on itself"
            )
        unknown = [d for d in update.depends_on if d not in state.departments]
        if unknown:
            raise DepartmentUpdateError(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown department(s): {unknown}"
            )
        if set(update.depends_on) != set(draft.depends_on):
            changes.append(f"depends on \u2192 {', '.join(d.value for d in update.depends_on) or 'none'}")
        draft.depends_on = update.depends_on

    if draft.beds_occupied > draft.beds_total:
        raise DepartmentUpdateError(status.HTTP_422_UNPROCESSABLE_ENTITY, "Beds occupied can't exceed total beds")
    if draft.staff_assigned > draft.staff_total:
        raise DepartmentUpdateError(status.HTTP_422_UNPROCESSABLE_ENTITY, "Staff on duty can't exceed total staff")

    state.departments[department_id] = draft
    return changes


def apply_department_update_or_raise(
    state: HospitalState, department_id: DepartmentId, update: DepartmentUpdateRequest
) -> list[str]:
    """Same as apply_department_update, but raises FastAPI's HTTPException
    directly, for use inside a route handler."""
    try:
        return apply_department_update(state, department_id, update)
    except DepartmentUpdateError as e:
        raise HTTPException(e.status_code, e.detail) from e
