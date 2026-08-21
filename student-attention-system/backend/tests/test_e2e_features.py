import asyncio
import base64
import json
import numpy as np
import cv2
import httpx
import pytest
import websockets
from app.main import app
from app.config import settings
from app.services.vision.face_detector import face_detector
from app.services.vision.landmarks import landmark_service
from app.services.vision.head_pose import head_pose_estimator
from app.services.vision.eye_state import eye_state_analyzer
from app.services.attention.distraction_engine import TemporalDistractionEngine
from app.services.attention.scoring_engine import scoring_engine
from app.services.reports.report_service import report_generator
from app.models.session import StudySession
from app.models.summary import SessionSummary
from app.models.event import AttentionEvent
from app.models.insight import AIInsight

def test_feature_health_endpoint(client):
    """Feature 1: Health check endpoint"""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["project"] == settings.PROJECT_NAME
    assert data["fps_target"] == 5

def test_feature_session_crud_and_state_machine(client):
    """Feature 2: Session CRUD and Lifecycle transitions"""
    # 1. Create Session
    create_res = client.post("/api/sessions", json={
        "name": "Sarah Connor",
        "student_id": "STU-8899",
        "subject": "Quantum Computing",
        "planned_duration": 45
    })
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]
    assert create_res.json()["status"] == "CREATED"
    assert create_res.json()["student"]["name"] == "Sarah Connor"

    # 2. Invalid Transition: Pause before starting
    invalid_pause = client.post(f"/api/sessions/{session_id}/pause")
    assert invalid_pause.status_code == 400

    # 3. Start Session
    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "RUNNING"
    assert start_res.json()["start_time"] is not None

    # 4. Invalid Transition: Start again
    invalid_start = client.post(f"/api/sessions/{session_id}/start")
    assert invalid_start.status_code == 400

    # 5. Pause Session
    pause_res = client.post(f"/api/sessions/{session_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    # 6. Resume Session
    resume_res = client.post(f"/api/sessions/{session_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "RUNNING"

    # 7. Complete Session
    complete_res = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"
    assert complete_res.json()["end_time"] is not None
    assert complete_res.json()["attention_score"] is not None

    # 8. Terminal State: Cannot resume or start after completion
    terminal_res = client.post(f"/api/sessions/{session_id}/start")
    assert terminal_res.status_code == 400

def test_feature_vision_pipeline_components():
    """Feature 3: Vision Detection, Landmarks, 3D Head Pose, and Eye Aspect Ratio"""
    # 1. Test EAR Analysis
    open_landmarks = np.zeros((468, 3), dtype=np.float64)
    for idx in eye_state_analyzer.LEFT_EYE + eye_state_analyzer.RIGHT_EYE:
        open_landmarks[idx] = [100.0, 100.0, 0.0]
    # Configure wide open eyes
    open_landmarks[33] = [100.0, 100.0, 0.0]
    open_landmarks[160] = [102.0, 106.0, 0.0]
    open_landmarks[158] = [106.0, 106.0, 0.0]
    open_landmarks[133] = [108.0, 100.0, 0.0]
    open_landmarks[153] = [106.0, 94.0, 0.0]
    open_landmarks[144] = [102.0, 94.0, 0.0]

    open_landmarks[362] = [200.0, 100.0, 0.0]
    open_landmarks[385] = [202.0, 106.0, 0.0]
    open_landmarks[387] = [206.0, 106.0, 0.0]
    open_landmarks[263] = [208.0, 100.0, 0.0]
    open_landmarks[373] = [206.0, 94.0, 0.0]
    open_landmarks[380] = [202.0, 94.0, 0.0]

    state_open, metrics_open = eye_state_analyzer.analyze_eyes(open_landmarks)
    assert state_open == "OPEN"
    assert metrics_open["avg_ear"] > 0.21

    # 2. Test Head Pose Center
    landmarks_center = np.zeros((468, 3), dtype=np.float64)
    landmarks_center[1] = [320.0, 240.0, 0.0]
    landmarks_center[152] = [320.0, 350.0, 0.0]
    landmarks_center[33] = [250.0, 200.0, 0.0]
    landmarks_center[263] = [390.0, 200.0, 0.0]
    landmarks_center[61] = [280.0, 290.0, 0.0]
    landmarks_center[291] = [360.0, 290.0, 0.0]

    direction, angles = head_pose_estimator.estimate_pose(landmarks_center, (480, 640))
    assert direction == "CENTER"
    assert abs(angles["yaw"]) < 5.0
    assert abs(angles["pitch"]) < 5.0

def test_feature_temporal_distraction_qualification():
    """Feature 4: Temporal qualification preventing false alarms"""
    engine = TemporalDistractionEngine()
    engine.reset()

    # t=0.0: Look away right
    engine.process_frame_observation(face_count=1, head_direction="RIGHT", eye_state="OPEN", current_time=0.0)

    # t=1.0: Still within threshold (1.0s < 2.0s) -> not promoted
    status_1s, evt_1s = engine.process_frame_observation(face_count=1, head_direction="RIGHT", eye_state="OPEN", current_time=1.0)
    assert evt_1s is None

    # t=2.1s: Exceeds 2.0s -> promoted to POTENTIAL_DISTRACTION
    status_2s, evt_2s = engine.process_frame_observation(face_count=1, head_direction="RIGHT", eye_state="OPEN", current_time=2.1)
    assert status_2s == "POTENTIAL_DISTRACTION"
    assert evt_2s is not None
    assert evt_2s["event_type"] == "POTENTIAL_DISTRACTION"

    # t=5.2s: Exceeds 5.0s -> promoted to DISTRACTED
    status_5s, evt_5s = engine.process_frame_observation(face_count=1, head_direction="RIGHT", eye_state="OPEN", current_time=5.2)
    assert status_5s == "DISTRACTED"
    assert evt_5s is not None
    assert evt_5s["event_type"] == "DISTRACTED"

def test_feature_deterministic_scoring_penalties():
    """Feature 5: Explainable Attention Score calculation"""
    durations = {
        "attentive": 1200.0,   # 20 mins
        "distraction": 120.0,  # 2 mins -> penalty 2 * 25 = 50
        "looking_away": 60.0,  # 1 min -> penalty 1 * 15 = 15
        "no_face": 0.0,
        "drowsiness": 0.0,
        "multiple_faces": 0.0
    }
    breakdown = scoring_engine.calculate_score(durations)
    assert breakdown.base_score == 100.0
    assert breakdown.distraction_penalty == 50.0
    assert breakdown.looking_away_penalty == 15.0
    assert breakdown.total_penalty == 65.0
    assert breakdown.final_score == 35.0
    assert breakdown.attentive_percentage == round((1200 / 1380) * 100, 1)

def test_feature_analytics_and_timeline_generation(client):
    """Feature 6: Analytics, timeline blocks, and duration charts"""
    # Create and complete session
    create_res = client.post("/api/sessions", json={
        "name": "David Miller",
        "subject": "Algorithms & Complexity",
        "planned_duration": 25
    })
    session_id = create_res.json()["id"]
    client.post(f"/api/sessions/{session_id}/start")
    client.post(f"/api/sessions/{session_id}/complete")

    # Fetch Analytics
    analytics_res = client.get(f"/api/analytics/{session_id}")
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert data["session_id"] == session_id
    assert data["subject"] == "Algorithms & Complexity"
    assert "durations" in data
    assert "score_breakdown" in data
    assert "timeline" in data
    assert len(data["timeline"]) >= 1

def test_feature_ai_insights_and_offline_fallback(client):
    """Feature 7: AI study habits generation with offline rule-based fallback"""
    create_res = client.post("/api/sessions", json={
        "name": "Emma Watson",
        "subject": "Data Structures",
        "planned_duration": 30
    })
    session_id = create_res.json()["id"]
    client.post(f"/api/sessions/{session_id}/start")
    client.post(f"/api/sessions/{session_id}/complete")

    # Fetch AI Insight
    ai_res = client.get(f"/api/ai/{session_id}")
    assert ai_res.status_code == 200
    data = ai_res.json()
    assert data["session_id"] == session_id
    assert len(data["summary"]) > 10
    assert len(data["recommendations"]) >= 2
    assert "limitations" in data
    assert "medical" in data["limitations"].lower() or "observable" in data["limitations"].lower()

def test_feature_pdf_report_generation(client):
    """Feature 8: ReportLab PDF Report generator"""
    create_res = client.post("/api/sessions", json={
        "name": "Lucas Grey",
        "subject": "Robotics",
        "planned_duration": 20
    })
    session_id = create_res.json()["id"]
    client.post(f"/api/sessions/{session_id}/start")
    client.post(f"/api/sessions/{session_id}/complete")

    report_res = client.get(f"/api/reports/{session_id}")
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    # PDF magic signature
    assert report_res.content.startswith(b"%PDF")
