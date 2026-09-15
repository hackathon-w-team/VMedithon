"""
Records every simulate/optimize/reset/data_update call so there's an
auditable trail of what was tried and by whom \u2014 the kind of thing a
hospital compliance team would actually ask for before letting a tool like
this touch real operations decisions.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone

from app.models import Action, DecisionLogEntry

_log: list[DecisionLogEntry] = []
_MAX_ENTRIES = 200


def _entry(user_name: str, kind: str, labels: list[str], total_wait_min: float | None, score: float | None) -> DecisionLogEntry:
    return DecisionLogEntry(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        user_name=user_name,
        kind=kind,
        action_labels=labels,
        total_wait_min=total_wait_min,
        score=score,
    )


def record(user_name: str, kind: str, actions: list[Action], total_wait_min: float | None, score: float | None) -> None:
    """Log a simulate/optimize/reset call described by a list of Actions."""
    entry = _entry(user_name, kind, [a.label() for a in actions], total_wait_min, score)
    _log.insert(0, entry)
    del _log[_MAX_ENTRIES:]


def record_labels(user_name: str, kind: str, labels: list[str]) -> None:
    """Log an event described directly by plain-text labels (e.g. a manual
    hospital data edit, which isn't expressed as a list of Actions)."""
    entry = _entry(user_name, kind, labels, None, None)
    _log.insert(0, entry)
    del _log[_MAX_ENTRIES:]


def get_recent(limit: int = 50) -> list[DecisionLogEntry]:
    return _log[:limit]
