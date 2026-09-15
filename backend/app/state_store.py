"""
Holds the "live" hospital state in memory for the demo.

For the hackathon this keeps things fast and dependency-free. To make this
production-ready, swap the two functions below for reads/writes against a
`hospital_state` collection in MongoDB (see README's "Post-hackathon"
section) — nothing else in the codebase needs to change, since every
router only talks to get_state()/set_state().
"""

from app.data.sample_hospital import get_initial_state
from app.models import HospitalState

_state: HospitalState = get_initial_state()


def get_state() -> HospitalState:
    return _state


def set_state(new_state: HospitalState) -> None:
    global _state
    _state = new_state
