from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_settings():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "face_confidence" in data
    assert "max_phone_violations" in data
    assert "phone_detection_enabled" in data
    assert "object_confidence_threshold" in data
    assert data["max_phone_violations"] == 3
    assert data["store_webcam_frames"] is False
    assert data["store_raw_video"] is False

def test_update_settings():
    payload = {
        "face_confidence": 0.65,
        "object_confidence": 0.40,
        "eye_sensitivity": 0.22,
        "head_pose_sensitivity": 25.0,
        "distraction_persistence": 6.0,
        "look_away_threshold": 2.5,
        "no_face_threshold": 3.5,
        "phone_detection_enabled": True,
        "max_phone_violations": 4,
        "phone_persistence_threshold": 4.5,
        "phone_alerts_enabled": True,
        "object_detection_enabled": True,
        "object_confidence_threshold": 0.40,
        "unknown_object_detection": False,
        "object_tracking_enabled": True,
        "alerts_enabled": True,
        "distraction_alerts": True,
        "phone_alerts": True,
        "no_face_alerts": True,
        "alert_cooldown": 12,
        "auto_end_phone_violations": True,
        "save_session_analytics": True,
        "show_session_summary": True,
        "store_webcam_frames": False,
        "store_raw_video": False,
        "store_detection_metadata": True,
        "show_bounding_boxes": True,
        "show_confidence": True,
        "show_attention_score": True,
        "show_event_timeline": True,
    }
    response = client.patch("/api/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["face_confidence"] == 0.65
    assert data["max_phone_violations"] == 4
    assert data["object_confidence_threshold"] == 0.40

def test_reset_settings():
    response = client.post("/api/settings/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["max_phone_violations"] == 3
    assert data["object_confidence_threshold"] == 0.35
