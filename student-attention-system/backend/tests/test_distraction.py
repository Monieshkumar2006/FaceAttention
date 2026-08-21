import pytest
from app.services.attention.distraction_engine import TemporalDistractionEngine
from app.utils.thresholds import (
    EVENT_ATTENTIVE, EVENT_POTENTIAL_DISTRACTION, EVENT_DISTRACTED,
    EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS,
    HEAD_DIR_CENTER, HEAD_DIR_LEFT, HEAD_DIR_RIGHT,
    EYE_OPEN, EYE_CLOSED
)

def test_transient_movement_not_penalized_as_distraction():
    engine = TemporalDistractionEngine()
    engine.reset()

    # Frame 1 at t=0.0: Attentive
    status, evt = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_CENTER, eye_state=EYE_OPEN, current_time=0.0)
    assert status == EVENT_ATTENTIVE
    assert evt is None

    # Frame 2 at t=1.0: Quick glance left (1 second < 2.0s threshold)
    status, evt = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_LEFT, eye_state=EYE_OPEN, current_time=1.0)
    # Should not be promoted to POTENTIAL_DISTRACTION or DISTRACTED
    assert status != EVENT_DISTRACTED
    assert evt is None

    # Frame 3 at t=1.5: Return to center
    status, evt = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_CENTER, eye_state=EYE_OPEN, current_time=1.5)
    assert status == EVENT_ATTENTIVE

def test_looking_away_threshold_promotion():
    engine = TemporalDistractionEngine()
    engine.reset()

    # t=0.0: Starts looking right
    engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_RIGHT, eye_state=EYE_OPEN, current_time=0.0)

    # t=2.1: Exceeds look_away threshold (2.0s) -> promotes to POTENTIAL_DISTRACTION
    status_2s, evt_2s = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_RIGHT, eye_state=EYE_OPEN, current_time=2.1)
    assert status_2s == EVENT_POTENTIAL_DISTRACTION
    assert evt_2s is not None
    assert evt_2s["event_type"] == EVENT_POTENTIAL_DISTRACTION

    # t=5.2: Exceeds distraction threshold (5.0s) -> promotes to DISTRACTED
    status_5s, evt_5s = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_RIGHT, eye_state=EYE_OPEN, current_time=5.2)
    assert status_5s == EVENT_DISTRACTED
    assert evt_5s is not None
    assert evt_5s["event_type"] == EVENT_DISTRACTED

def test_no_face_and_drowsiness_qualification():
    engine = TemporalDistractionEngine()
    engine.reset()

    # t=0.0 to 3.1s: No face detected
    engine.process_frame_observation(face_count=0, head_direction=HEAD_DIR_CENTER, eye_state=EYE_OPEN, current_time=0.0)
    status, evt = engine.process_frame_observation(face_count=0, head_direction=HEAD_DIR_CENTER, eye_state=EYE_OPEN, current_time=3.1)
    assert status == EVENT_NO_FACE
    assert evt is not None
    assert evt["event_type"] == EVENT_NO_FACE

    # Prolonged eye closure
    engine.reset()
    engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_CENTER, eye_state=EYE_CLOSED, current_time=0.0)
    status_eye, evt_eye = engine.process_frame_observation(face_count=1, head_direction=HEAD_DIR_CENTER, eye_state=EYE_CLOSED, current_time=2.2)
    assert status_eye == EVENT_POSSIBLE_DROWSINESS
    assert evt_eye is not None
    assert evt_eye["event_type"] == EVENT_POSSIBLE_DROWSINESS
