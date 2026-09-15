"""
The "Optimise" stage: builds a pool of sensible candidate actions from the
current hospital state, then searches combinations of them (brute force —
the pool is small by construction, so this stays fast and, unlike a
black-box optimiser, every candidate result is fully explainable) and
returns scenarios ranked by score.
"""

from __future__ import annotations
from itertools import combinations

from app.models import Action, ActionType, HospitalState, OptimizeRequest, ScenarioResult
from app.simulation.engine import simulate_scenario

# Keep the search space small and meaningful for a live demo.
MOVE_STAFF_AMOUNTS = [1, 2]
OPEN_BEDS_AMOUNTS = [1, 2]
SHIFT_WORKLOAD_AMOUNTS = [2, 4]


def generate_candidate_actions(state: HospitalState) -> list[Action]:
    candidates: list[Action] = []
    depts = list(state.departments.values())

    # Move staff from a department with slack to one under pressure.
    for src in depts:
        for dst in depts:
            if src.id == dst.id:
                continue
            if src.staff_assigned <= 2:
                continue  # don't strip a department bare
            for amount in MOVE_STAFF_AMOUNTS:
                if amount < src.staff_assigned:
                    candidates.append(
                        Action(
                            type=ActionType.MOVE_STAFF,
                            from_department=src.id,
                            to_department=dst.id,
                            amount=amount,
                        )
                    )

    # Open extra beds anywhere that isn't already comfortably under capacity.
    for dst in depts:
        if dst.bed_occupancy_pct >= 70 or dst.beds_total == 0:
            for amount in OPEN_BEDS_AMOUNTS:
                candidates.append(
                    Action(type=ActionType.OPEN_BEDS, to_department=dst.id, amount=amount)
                )

    # Shift diagnostic / patient workload between departments with a queue.
    for src in depts:
        if src.patients_waiting < 3:
            continue
        for dst in depts:
            if src.id == dst.id:
                continue
            for amount in SHIFT_WORKLOAD_AMOUNTS:
                if amount <= src.patients_waiting:
                    candidates.append(
                        Action(
                            type=ActionType.SHIFT_WORKLOAD,
                            from_department=src.id,
                            to_department=dst.id,
                            amount=amount,
                        )
                    )

    return candidates


def optimize(state: HospitalState, request: OptimizeRequest) -> list[ScenarioResult]:
    candidates = generate_candidate_actions(state)

    scenarios: list[ScenarioResult] = []

    # Baseline (do nothing) is always included so the improvement is visible.
    scenarios.append(
        simulate_scenario(
            state,
            [],
            request.weight_wait_time,
            request.weight_priority,
            request.weight_cost,
        )
    )

    # Single actions.
    for action in candidates:
        scenarios.append(
            simulate_scenario(
                state,
                [action],
                request.weight_wait_time,
                request.weight_priority,
                request.weight_cost,
            )
        )

    # Pairs (and triples if requested) of DIFFERENT candidate actions.
    # Pool is trimmed first so combinations() stays cheap.
    trimmed_pool = candidates[:24]
    for r in range(2, request.max_actions + 1):
        for combo in combinations(trimmed_pool, r):
            scenarios.append(
                simulate_scenario(
                    state,
                    list(combo),
                    request.weight_wait_time,
                    request.weight_priority,
                    request.weight_cost,
                )
            )

    scenarios.sort(key=lambda s: s.score, reverse=True)
    return scenarios[:10]
