"""
The core "digital twin" engine.

Three responsibilities live here, matching the pitch's Predict -> Simulate
-> Optimise pipeline:

1. predict_all(state)         - forecast wait time / status per department
2. apply_action(state, action)- mutate a *copy* of the state per candidate action
3. resolve_ripple_effects()   - propagate the knock-on effects of a change
                                 across dependent departments (the
                                 differentiator described in the pitch)

Everything here is deterministic and explainable on purpose: for a judge
demo you want to be able to say "here is exactly why the number moved",
not hand-wave at a black box. A learned predictive model can later replace
predict_all() without changing the simulate/optimise contracts.
"""

from __future__ import annotations
import copy

from app.models import (
    Action,
    ActionType,
    Department,
    DepartmentId,
    DepartmentPrediction,
    HospitalState,
    ScenarioResult,
)

# Wait-time thresholds (minutes) used to classify department status.
WARNING_THRESHOLD_MIN = 45.0
CRITICAL_THRESHOLD_MIN = 90.0

# How strongly a blocked downstream department (e.g. General Ward full)
# inflates the *upstream* department's predicted wait (boarding effect).
RIPPLE_BOARDING_PENALTY_PER_PCT = 0.8


def predict_department(dept: Department, state: HospitalState) -> DepartmentPrediction:
    """Predict wait time for one department, including ripple pressure
    from any departments it depends on."""

    staff = max(dept.staff_assigned, 1)
    base_wait = (dept.patients_waiting * dept.avg_service_time_min) / staff

    # Ripple: if a department this one depends on is nearly full, patients
    # can't move downstream (e.g. ED can't admit into a full General Ward),
    # so they board -> wait time climbs even though ED's own staff are fine.
    # If no patients are waiting in this department, boarding delay is 0.
    ripple_penalty = 0.0
    blocking_neighbour: Department | None = None
    blocking_over_capacity = 0.0

    if dept.patients_waiting > 0:
        for dep_id in dept.depends_on:
            neighbour = state.departments.get(dep_id)
            if neighbour is None:
                continue
            over_capacity_pct = max(neighbour.bed_occupancy_pct - 85.0, 0.0)
            if over_capacity_pct > blocking_over_capacity:
                blocking_neighbour = neighbour
                blocking_over_capacity = over_capacity_pct
            ripple_penalty += over_capacity_pct * RIPPLE_BOARDING_PENALTY_PER_PCT

    predicted_wait = round(base_wait + ripple_penalty, 1)

    if predicted_wait >= CRITICAL_THRESHOLD_MIN:
        status = "critical"
    elif predicted_wait >= WARNING_THRESHOLD_MIN:
        status = "warning"
    else:
        status = "ok"

    status_reason = _describe_reason(dept, status, blocking_neighbour, ripple_penalty)

    return DepartmentPrediction(
        department=dept.id,
        predicted_wait_min=predicted_wait,
        predicted_occupancy_pct=dept.bed_occupancy_pct,
        status=status,
        status_reason=status_reason,
    )


def _describe_reason(
    dept: Department,
    status: str,
    blocking_neighbour: Department | None,
    ripple_penalty: float,
) -> str:
    """Build a plain-language, numbers-grounded explanation of why a
    department is in the state it's in \u2014 no canned copy, every sentence is
    derived from the same numbers the score is computed from."""

    if status == "ok" and ripple_penalty == 0:
        return "Operating normally with comfortable capacity."

    if blocking_neighbour is not None and ripple_penalty > 0:
        return (
            f"{blocking_neighbour.name} is at {blocking_neighbour.bed_occupancy_pct}% bed "
            f"occupancy \u2014 patients can't be admitted out of {dept.name}, adding roughly "
            f"{round(ripple_penalty)} minutes of boarding delay on top of its own caseload."
        )

    if dept.patients_waiting > 0:
        return (
            f"{dept.patients_waiting} patient(s) waiting against {dept.staff_assigned} "
            f"staff on duty is the main driver of the wait time here."
        )

    return "Near capacity \u2014 limited headroom to absorb additional load."


def predict_all(state: HospitalState) -> list[DepartmentPrediction]:
    return [predict_department(d, state) for d in state.departments.values()]


def apply_action(state: HospitalState, action: Action) -> HospitalState:
    """Return a NEW state with one action applied. Never mutates the input."""

    new_state = copy.deepcopy(state)
    depts = new_state.departments

    if action.type == ActionType.MOVE_STAFF:
        src, dst = depts.get(action.from_department), depts.get(action.to_department)
        if src and dst:
            moved = min(action.amount, src.staff_assigned)
            src.staff_assigned -= moved
            dst.staff_assigned += moved

    elif action.type == ActionType.OPEN_BEDS:
        dst = depts.get(action.to_department)
        if dst:
            dst.beds_total += action.amount

    elif action.type == ActionType.SHIFT_WORKLOAD:
        src, dst = depts.get(action.from_department), depts.get(action.to_department)
        if src and dst:
            moved = min(action.amount, src.patients_waiting)
            src.patients_waiting -= moved
            dst.patients_waiting += moved

    return resolve_ripple_effects(new_state)


def resolve_ripple_effects(state: HospitalState) -> HospitalState:
    """
    After an action changes capacity somewhere, let departments that now
    have free beds admit boarding/waiting patients from departments that
    depend on them. This is what makes "open 2 beds in General Ward" show
    up as an improvement in Emergency's wait time too.
    """

    new_state = copy.deepcopy(state)
    depts = new_state.departments

    for dept in depts.values():
        for dependent in depts.values():
            if dept.id not in dependent.depends_on:
                continue
            free_beds = dept.beds_free
            if free_beds <= 0 or dependent.patients_waiting <= 0:
                continue
            admitted = min(free_beds, dependent.patients_waiting)
            dept.beds_occupied += admitted
            dependent.patients_waiting -= admitted

    return new_state


def simulate_scenario(
    state: HospitalState,
    actions: list[Action],
    weight_wait_time: float = 0.6,
    weight_priority: float = 0.3,
    weight_cost: float = 0.1,
) -> ScenarioResult:
    """Apply a full list of actions in sequence and score the outcome."""

    working_state = state
    for action in actions:
        working_state = apply_action(working_state, action)

    predictions = predict_all(working_state)
    total_wait = sum(p.predicted_wait_min for p in predictions)
    max_wait = max((p.predicted_wait_min for p in predictions), default=0.0)
    critical = [p.department for p in predictions if p.status == "critical"]

    baseline_predictions = predict_all(state)
    baseline_total_wait = sum(p.predicted_wait_min for p in baseline_predictions)

    wait_improvement = baseline_total_wait - total_wait
    critical_penalty = len(critical) * 50.0
    action_cost = len(actions) * 5.0

    score = round(
        weight_wait_time * wait_improvement
        - weight_priority * critical_penalty
        - weight_cost * action_cost,
        2,
    )

    return ScenarioResult(
        actions=actions,
        predictions=predictions,
        score=score,
        total_wait_min=round(total_wait, 1),
        max_wait_min=round(max_wait, 1),
        critical_departments=critical,
    )
