import pytest
from app.utils.thresholds import SESSION_CREATED, SESSION_RUNNING, SESSION_PAUSED, SESSION_COMPLETED

def test_create_session(client):
    response = client.post("/api/sessions", json={
        "name": "Alice Johnson",
        "student_id": "STU101",
        "subject": "Mathematics",
        "planned_duration": 30
    })
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Mathematics"
    assert data["status"] == SESSION_CREATED
    assert data["student"]["name"] == "Alice Johnson"
    assert data["id"] is not None

def test_session_lifecycle_transitions(client):
    # 1. Create Session
    create_res = client.post("/api/sessions", json={
        "name": "Bob Smith",
        "subject": "Physics",
        "planned_duration": 45
    })
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # Invalid transition: try pausing before starting
    pause_invalid = client.post(f"/api/sessions/{session_id}/pause")
    assert pause_invalid.status_code == 400

    # 2. Start Session
    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == SESSION_RUNNING
    assert start_res.json()["start_time"] is not None

    # Invalid transition: try starting again
    start_invalid = client.post(f"/api/sessions/{session_id}/start")
    assert start_invalid.status_code == 400

    # 3. Pause Session
    pause_res = client.post(f"/api/sessions/{session_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == SESSION_PAUSED

    # 4. Resume Session
    resume_res = client.post(f"/api/sessions/{session_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == SESSION_RUNNING

    # 5. Complete Session
    complete_res = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == SESSION_COMPLETED
    assert complete_res.json()["end_time"] is not None

    # Terminal state: cannot start or pause after completion
    start_after_complete = client.post(f"/api/sessions/{session_id}/start")
    assert start_after_complete.status_code == 400

def test_list_and_get_sessions(client):
    # Create two sessions
    client.post("/api/sessions", json={"name": "User 1", "subject": "Biology", "planned_duration": 20})
    client.post("/api/sessions", json={"name": "User 2", "subject": "Chemistry", "planned_duration": 25})

    list_res = client.get("/api/sessions")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    # Get specific session
    session_id = data["items"][0]["id"]
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == session_id
