import pytest
from app.services.attention.violation_guard import PhoneViolationGuard, MAX_PHONE_VIOLATIONS
from app.utils.thresholds import (
    EVENT_PHONE_DETECTED,
    EVENT_PHONE_PERSISTENT,
    EVENT_POTENTIAL_PHONE_DISTRACTION,
    EVENT_ATTENTIVE,
    SESSION_RUNNING,
    SESSION_COMPLETED,
)


def test_phone_violation_guard_unit():
    guard = PhoneViolationGuard(max_violations=3)
    assert guard.violation_count == 0
    assert not guard.is_violation_limit_reached()

    # Non-phone event should not increment
    assert not guard.register_event(EVENT_ATTENTIVE, event_id=1)
    assert guard.violation_count == 0

    # 1st violation
    assert guard.register_event(EVENT_PHONE_DETECTED, event_id=2)
    assert guard.violation_count == 1
    assert not guard.is_violation_limit_reached()

    # Duplicate event_id should not double-count
    assert not guard.register_event(EVENT_PHONE_DETECTED, event_id=2)
    assert guard.violation_count == 1

    # 2nd violation
    assert guard.register_event(EVENT_PHONE_PERSISTENT, event_id=3)
    assert guard.violation_count == 2
    assert not guard.is_violation_limit_reached()

    # 3rd violation -> limit reached!
    assert guard.register_event(EVENT_POTENTIAL_PHONE_DISTRACTION, event_id=4)
    assert guard.violation_count == 3
    assert guard.is_violation_limit_reached()

    # Reset
    guard.reset()
    assert guard.violation_count == 0
    assert not guard.is_violation_limit_reached()


def test_phone_auto_termination_websocket(client):
    # 1. Create and Start a session
    create_res = client.post(
        "/api/sessions",
        json={
            "name": "Test Student",
            "subject": "Physics",
            "planned_duration": 25,
        },
    )
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200

    # 2. Connect to WebSocket
    with client.websocket_connect(f"/ws/monitor/{session_id}") as ws:
        # Send 1st frame (heartbeat)
        ws.send_json({"type": "frame", "image": ""})
        data = ws.receive_json()
        assert data["type"] == "analysis"
        assert data.get("phone_violations") == 0

    # Verify session is still running via API
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == SESSION_RUNNING
