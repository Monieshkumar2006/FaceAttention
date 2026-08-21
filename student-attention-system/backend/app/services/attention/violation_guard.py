"""
Phone Violation Guard Service.

Monitors and counts qualified mobile phone violation events for active sessions.
Triggers automatic session termination threshold when phone violation count reaches 3.
"""
from typing import Dict, Optional, Set
from app.config import settings
from app.utils.thresholds import (
    EVENT_PHONE_DETECTED,
    EVENT_PHONE_PERSISTENT,
    EVENT_POTENTIAL_PHONE_DISTRACTION,
)
from app.utils.logger import logger

PHONE_VIOLATION_EVENT_TYPES: Set[str] = {
    EVENT_PHONE_DETECTED,
    EVENT_PHONE_PERSISTENT,
    EVENT_POTENTIAL_PHONE_DISTRACTION,
}

MAX_PHONE_VIOLATIONS: int = getattr(settings, "MAX_PHONE_VIOLATIONS", 3)


class PhoneViolationGuard:
    """Session-scoped tracker for mobile phone violations."""

    def __init__(self, max_violations: Optional[int] = None):
        self.max_violations = (
            max_violations
            if max_violations is not None
            else getattr(settings, "MAX_PHONE_VIOLATIONS", 3)
        )
        self._violation_count: int = 0
        self._recorded_event_ids: Set[int] = set()

    @property
    def violation_count(self) -> int:
        return self._violation_count

    def is_violation_limit_reached(self) -> bool:
        return self._violation_count >= self.max_violations

    def register_event(self, event_type: str, event_id: Optional[int] = None) -> bool:
        """
        Record a qualified event. Returns True if this event increments violation count.
        """
        if event_type not in PHONE_VIOLATION_EVENT_TYPES:
            return False

        if event_id is not None and event_id in self._recorded_event_ids:
            return False

        if event_id is not None:
            self._recorded_event_ids.add(event_id)

        self._violation_count += 1
        logger.info(
            f"Phone violation registered (count: {self._violation_count}/{self.max_violations})"
        )
        return True

    def reset(self):
        self._violation_count = 0
        self._recorded_event_ids.clear()
