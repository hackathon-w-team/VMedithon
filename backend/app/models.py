"""
Pydantic models shared across the simulation engine and the API layer.

The hospital is modelled as a small graph of Department nodes. Each
department has capacity (beds, staff) and load (patients waiting / being
treated). Departments are connected by "dependencies" — e.g. Emergency
depends on General Ward having open beds to admit patients into (this is
what creates the ripple effect: change one department, and its neighbours
feel it).
"""

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DepartmentId(str, Enum):
    EMERGENCY = "emergency"
    ICU = "icu"
    GENERAL_WARD = "general_ward"
    RADIOLOGY = "radiology"


class Department(BaseModel):
    id: DepartmentId
    name: str
    beds_total: int
    beds_occupied: int
    staff_total: int
    staff_assigned: int
    patients_waiting: int
    avg_service_time_min: float = Field(
        description="Average minutes of staff time needed per patient in this department"
    )
    depends_on: list[DepartmentId] = Field(
        default_factory=list,
        description="Departments this one relies on for downstream capacity "
        "(e.g. Emergency depends on General Ward beds for admissions)",
    )

    @property
    def beds_free(self) -> int:
        return max(self.beds_total - self.beds_occupied, 0)

    @property
    def bed_occupancy_pct(self) -> float:
        return 0.0 if self.beds_total == 0 else round(
            100 * self.beds_occupied / self.beds_total, 1
        )


class HospitalState(BaseModel):
    """The full snapshot of the hospital at a point in time."""

    departments: dict[DepartmentId, Department]
    timestamp: Optional[str] = None


class ImportReport(BaseModel):
    """Result of applying an uploaded spreadsheet (.xlsx/.csv) of live
    hospital numbers to the running state."""

    state: HospitalState
    rows_read: int
    departments_updated: list[str] = Field(default_factory=list)
    changes: dict[str, list[str]] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class DepartmentUpdateRequest(BaseModel):
    """Partial update to one department's live operational data. Any field
    left as None is unchanged."""

    beds_total: Optional[int] = Field(default=None, ge=0)
    beds_occupied: Optional[int] = Field(default=None, ge=0)
    staff_total: Optional[int] = Field(default=None, ge=0)
    staff_assigned: Optional[int] = Field(default=None, ge=0)
    patients_waiting: Optional[int] = Field(default=None, ge=0)
    avg_service_time_min: Optional[float] = Field(default=None, gt=0)
    depends_on: Optional[list[DepartmentId]] = None


class ActionType(str, Enum):
    MOVE_STAFF = "move_staff"
    OPEN_BEDS = "open_beds"
    SHIFT_WORKLOAD = "shift_workload"


class Action(BaseModel):
    """A single candidate intervention an administrator could take."""

    type: ActionType
    from_department: Optional[DepartmentId] = None
    to_department: Optional[DepartmentId] = None
    amount: int = Field(gt=0, description="Staff count, bed count, or patients to shift")

    def label(self) -> str:
        frm = self.from_department.value.replace("_", " ").title() if self.from_department else None
        to = self.to_department.value.replace("_", " ").title() if self.to_department else None
        if self.type == ActionType.MOVE_STAFF:
            return f"Move {self.amount} staff: {frm} \u2192 {to}"
        if self.type == ActionType.OPEN_BEDS:
            return f"Open {self.amount} beds in {to}"
        if self.type == ActionType.SHIFT_WORKLOAD:
            return f"Shift {self.amount} patients: {frm} \u2192 {to}"
        return "Unknown action"


class DepartmentPrediction(BaseModel):
    department: DepartmentId
    predicted_wait_min: float
    predicted_occupancy_pct: float
    status: str  # "ok" | "warning" | "critical"
    status_reason: str = ""


class ScenarioResult(BaseModel):
    """The outcome of simulating one candidate scenario (a list of actions)."""

    actions: list[Action]
    predictions: list[DepartmentPrediction]
    score: float
    total_wait_min: float
    max_wait_min: float
    critical_departments: list[DepartmentId]


class SimulateRequest(BaseModel):
    actions: list[Action] = Field(default_factory=list)


class OptimizeRequest(BaseModel):
    max_actions: int = Field(default=2, ge=1, le=3)
    weight_wait_time: float = 0.6
    weight_priority: float = 0.3
    weight_cost: float = 0.1


# ─── Auth & users ──────────────────────────────────────────────────────────

class UserRole(str, Enum):
    ADMIN = "admin"
    NURSE = "nurse"
    DATA_ENTRY = "data_entry"


class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"


class User(BaseModel):
    id: str
    name: str
    email: str
    password_hash: str
    role: UserRole
    status: UserStatus

    def public(self) -> "PublicUser":
        return PublicUser(id=self.id, name=self.name, email=self.email, role=self.role, status=self.status)


class PublicUser(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    status: UserStatus


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)
    requested_role: UserRole = Field(
        default=UserRole.NURSE,
        description="Self-service signup can request 'nurse' or 'data_entry' — "
        "'admin' must be granted by an existing admin.",
    )


class SetRoleRequest(BaseModel):
    role: UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser


# ─── Notifications & Nurse Task Dispatch ─────────────────────────────────

class Notification(BaseModel):
    id: str
    timestamp: str
    title: str
    message: str
    target_role: UserRole = UserRole.NURSE
    target_user_id: Optional[str] = None
    from_department: Optional[DepartmentId] = None
    to_department: Optional[DepartmentId] = None
    action_type: str = "reassignment"  # "reassignment" | "task" | "surge" | "broadcast"
    status: str = "unread"  # "unread" | "acknowledged"
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    created_by: str = "Admin / AI Optimizer"


class NotificationCreateRequest(BaseModel):
    title: str
    message: str
    from_department: Optional[DepartmentId] = None
    to_department: Optional[DepartmentId] = None
    action_type: str = "reassignment"
    target_role: UserRole = UserRole.NURSE
    target_user_id: Optional[str] = None


# ─── Decision log ────────────────────────────────────────────────────────

class DecisionLogEntry(BaseModel):
    id: str
    timestamp: str
    user_name: str
    kind: str  # "simulate" | "optimize" | "reset" | "data_update"
    action_labels: list[str]
    total_wait_min: Optional[float] = None
    score: Optional[float] = None

