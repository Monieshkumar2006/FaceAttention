import pytest
import time
import numpy as np
from app.services.vision.object_detector import ObjectDetectorService, get_object_detector
from app.services.vision.object_tracker import ObjectTracker
from app.services.attention.distraction_engine import TemporalDistractionEngine
from app.services.attention.scoring_engine import scoring_engine
from app.utils.thresholds import (
    EVENT_ATTENTIVE, EVENT_PHONE_DETECTED, EVENT_PHONE_PERSISTENT,
    EVENT_ADDITIONAL_PERSON, EVENT_POTENTIAL_OBJECT_DISTRACTION,
    EVENT_POTENTIAL_PHONE_DISTRACTION, EVENT_DISTRACTED, EVENT_NO_FACE,
    EVENT_OBJECT_DETECTED, HEAD_DIR_CENTER, HEAD_DIR_DOWN, HEAD_DIR_RIGHT,
    HEAD_DIR_LEFT, EYE_OPEN
)

# 1. Object confidence filtering test
def test_object_confidence_filtering():
    detector = ObjectDetectorService(confidence_threshold=0.50)
    assert detector.confidence_threshold == 0.50
    detector.confidence_threshold = 0.70
    assert detector.confidence_threshold == 0.70

# 2. Object Tracking and duration calculation
def test_object_tracking_and_iou_matching():
    tracker = ObjectTracker()
    tracker.reset()

    # Frame 1: Detection at t=0
    det1 = [{"class_name": "cell phone", "confidence": 0.9, "bbox": [100, 100, 200, 200]}]
    tracked1 = tracker.update(det1, current_time=0.0)
    assert len(tracked1) == 1
    assert tracked1[0]["class_name"] == "cell phone"
    assert tracked1[0]["duration"] == 0.0
    obj_id = tracked1[0]["object_id"]

    # Frame 2: Same object slightly shifted at t=2.0 (IoU match)
    det2 = [{"class_name": "cell phone", "confidence": 0.92, "bbox": [105, 105, 205, 205]}]
    tracked2 = tracker.update(det2, current_time=2.0)
    assert len(tracked2) == 1
    assert tracked2[0]["object_id"] == obj_id
    assert tracked2[0]["duration"] == 2.0

    # Frame 3: Disappear after timeout (> 2.0s without detection)
    tracked3 = tracker.update([], current_time=5.0)
    assert len(tracked3) == 0

# 3. Phone detection vs persistence vs correlation
def test_phone_detection_and_distraction_correlation():
    engine = TemporalDistractionEngine()
    engine.reset()

    # Case A: Phone detected for 2s with Face Center -> PHONE_DETECTED, NOT distracted
    phone_obj_2s = [{
        "object_id": "phone_1",
        "class_name": "cell phone",
        "confidence": 0.92,
        "bbox": [100, 100, 180, 180],
        "duration": 2.0
    }]
    status_2s, evt_2s = engine.process_frame_observation(
        face_count=1,
        head_direction=HEAD_DIR_CENTER,
        eye_state=EYE_OPEN,
        active_objects=phone_obj_2s,
        current_time=2.0
    )
    assert status_2s == EVENT_PHONE_DETECTED
    assert evt_2s is not None
    assert evt_2s["event_type"] in (EVENT_PHONE_DETECTED, EVENT_OBJECT_DETECTED)

    # Case B: Phone persistent (6s > 5s threshold), looking center
    phone_obj_6s = [{
        "object_id": "phone_1",
        "class_name": "cell phone",
        "confidence": 0.92,
        "bbox": [100, 100, 180, 180],
        "duration": 6.0
    }]
    status_6s, evt_6s = engine.process_frame_observation(
        face_count=1,
        head_direction=HEAD_DIR_CENTER,
        eye_state=EYE_OPEN,
        active_objects=phone_obj_6s,
        current_time=6.0
    )
    assert status_6s == EVENT_PHONE_PERSISTENT

    # Case C: Phone persistent + looking DOWN -> POTENTIAL_PHONE_DISTRACTION
    phone_obj_7s = [{
        "object_id": "phone_1",
        "class_name": "cell phone",
        "confidence": 0.92,
        "bbox": [100, 100, 180, 180],
        "duration": 7.0
    }]
    status_7s, evt_7s = engine.process_frame_observation(
        face_count=1,
        head_direction=HEAD_DIR_DOWN,
        eye_state=EYE_OPEN,
        active_objects=phone_obj_7s,
        current_time=7.0
    )
    assert status_7s == EVENT_POTENTIAL_PHONE_DISTRACTION
    assert evt_7s is not None
    assert evt_7s["event_type"] == EVENT_POTENTIAL_PHONE_DISTRACTION

# 4. Multiple person detection
def test_multiple_person_detection():
    engine = TemporalDistractionEngine()
    engine.reset()

    person_objs = [
        {"object_id": "p1", "class_name": "person", "confidence": 0.9, "bbox": [50, 50, 150, 200], "duration": 1.0},
        {"object_id": "p2", "class_name": "person", "confidence": 0.85, "bbox": [200, 50, 300, 200], "duration": 1.0}
    ]
    status, evt = engine.process_frame_observation(
        face_count=2,
        head_direction=HEAD_DIR_CENTER,
        eye_state=EYE_OPEN,
        active_objects=person_objs,
        current_time=1.0
    )
    assert status == EVENT_ADDITIONAL_PERSON

# 5. Session scoring and penalty calculation
def test_scoring_with_distractions():
    durations = {
        "attentive": 500.0,
        "distraction": 60.0,
        "looking_away": 0.0,
        "no_face": 0.0,
        "drowsiness": 0.0,
        "multiple_faces": 0.0
    }
    score = scoring_engine.calculate_score(durations)
    assert score.final_score == 75.0
    assert score.distraction_penalty == 25.0

# 6. Session Analytics API integration test
def test_analytics_object_summary_endpoint(client):
    create_res = client.post("/api/sessions", json={
        "name": "Alex Mercer",
        "student_id": "STU-9900",
        "subject": "Neural Networks",
        "planned_duration": 30
    })
    session_id = create_res.json()["id"]
    client.post(f"/api/sessions/{session_id}/start")
    client.post(f"/api/sessions/{session_id}/complete")

    analytics_res = client.get(f"/api/analytics/{session_id}")
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert "object_summary" in data
    assert "phone_detection_count" in data["object_summary"]
    assert "phone_persistent_duration" in data["object_summary"]
    assert "additional_person_events" in data["object_summary"]
    assert "object_distraction_events" in data["object_summary"]
