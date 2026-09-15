from fastapi import APIRouter, Depends

from app import decisions_log
from app.dependencies import get_current_user
from app.models import OptimizeRequest, ScenarioResult, SimulateRequest, User
from app.simulation.engine import simulate_scenario
from app.simulation.optimizer import generate_candidate_actions, optimize
from app.state_store import get_state

router = APIRouter(prefix="/api", tags=["simulate"])


@router.post("/simulate", response_model=ScenarioResult)
def run_simulation(request: SimulateRequest, user: User = Depends(get_current_user)) -> ScenarioResult:
    """Test one specific what-if scenario the user built by hand."""
    state = get_state()
    result = simulate_scenario(state, request.actions)
    decisions_log.record(user.name, "simulate", result.actions, result.total_wait_min, result.score)
    return result


@router.post("/optimize", response_model=list[ScenarioResult])
def run_optimizer(request: OptimizeRequest, user: User = Depends(get_current_user)) -> list[ScenarioResult]:
    """Search candidate interventions and return the top-ranked scenarios,
    the best of which is the system's Recommendation."""
    state = get_state()
    scenarios = optimize(state, request)
    if scenarios:
        best = scenarios[0]
        decisions_log.record(user.name, "optimize", best.actions, best.total_wait_min, best.score)
    return scenarios


@router.get("/candidate-actions")
def list_candidate_actions(_: User = Depends(get_current_user)):
    """Expose the action pool the optimiser is choosing from, mostly useful
    for populating a 'build your own scenario' dropdown on the frontend."""
    state = get_state()
    actions = generate_candidate_actions(state)
    return [{"action": a, "label": a.label()} for a in actions]


@router.get("/decisions")
def list_decisions(_: User = Depends(get_current_user)):
    """Audit trail of every simulate/optimize/reset call \u2014 who ran what,
    and what it predicted. Visible to any approved user."""
    return decisions_log.get_recent()
