import base64
import json
import os
import time
import cv2
import numpy as np
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.database.database import SessionLocal, get_db
from app.models.session import StudySession
from app.models.event import AttentionEvent
from app.models.summary import SessionSummary
from app.services.vision.face_detector import face_detector
from app.services.vision.landmarks import landmark_service
from app.services.vision.head_pose import head_pose_estimator
from app.services.vision.eye_state import eye_state_analyzer
from app.services.vision.object_detector import get_object_detector
from app.services.vision.object_tracker import ObjectTracker
from app.services.attention.distraction_engine import TemporalDistractionEngine
from app.services.attention.scoring_engine import scoring_engine
from app.services.attention.violation_guard import PhoneViolationGuard
from app.utils.thresholds import (
    SESSION_RUNNING, SESSION_COMPLETED,
    HEAD_DIR_CENTER, HEAD_DIR_UNKNOWN,
    EYE_OPEN, EYE_UNKNOWN,
    EVENT_ATTENTIVE, EVENT_DISTRACTED, EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS
)
from app.utils.logger import logger

router = APIRouter(tags=["Monitoring WebSocket"])

# Active engine, tracker, and violation guard instances per session_id — cleaned up on disconnect
session_engines: dict[int, TemporalDistractionEngine] = {}
session_trackers: dict[int, ObjectTracker] = {}
session_guards: dict[int, PhoneViolationGuard] = {}

# ── Minimum frame dimensions to accept ───────────────────────────────────────
MIN_FRAME_WIDTH = 10
MIN_FRAME_HEIGHT = 10
MAX_FRAME_BYTES = 2 * 1024 * 1024  # 2 MB safety cap

# ── Score persistence interval (frames) ──────────────────────────────────────
SCORE_PERSIST_INTERVAL = 30  # ~6 seconds at 5 FPS


def decode_base64_image(base64_str: str) -> np.ndarray | None:
    """
    Decode base64 string to OpenCV BGR image with validation.
    Returns None if string is empty, too large, or image cannot be decoded.
    """
    if not base64_str:
        return None

    # Strip optional data URI prefix
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]

    # Reject suspiciously large payloads
    raw_bytes_len = len(base64_str) * 3 // 4
    if raw_bytes_len > MAX_FRAME_BYTES:
        logger.warning(f"Rejected oversized frame: ~{raw_bytes_len // 1024} KB")
        return None

    try:
        img_bytes = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Validate decoded image dimensions
        if image is None:
            return None
        h, w = image.shape[:2]
        if w < MIN_FRAME_WIDTH or h < MIN_FRAME_HEIGHT:
            logger.warning(f"Rejected undersized frame: {w}x{h}")
            return None

        return image
    except Exception as e:
        logger.warning(f"Frame decode error: {e}")
        return None


# ── Camera / Model Status REST Endpoint ──────────────────────────────────────
@router.get("/api/camera/status", tags=["Camera Status"])
def get_camera_status():
    """
    Returns the availability status of vision AI models.
    The frontend uses this to show whether real CV analysis is active
    or whether a graceful fallback is being used.
    """
    from app.services.vision.face_detector import MODEL_PATH as FACE_MODEL_PATH

    face_model_ready = (
        os.path.exists(FACE_MODEL_PATH) and face_detector.landmarker is not None
    )
    landmark_model_ready = (
        os.path.exists(FACE_MODEL_PATH) and landmark_service.landmarker is not None
    )

    return {
        "vision_ready": face_model_ready and landmark_model_ready,
        "face_detector": {
            "available": face_model_ready,
            "model_path": FACE_MODEL_PATH,
            "model_exists": os.path.exists(FACE_MODEL_PATH),
        },
        "landmark_service": {
            "available": landmark_model_ready,
        },
        "active_sessions": len(session_engines),
        "frame_processing_fps": 5,
    }


# ── WebSocket Monitor Endpoint ────────────────────────────────────────────────
@router.websocket("/ws/monitor/{session_id}")
async def websocket_monitor_endpoint(websocket: WebSocket, session_id: int):
    await websocket.accept()
    logger.info(f"WebSocket client connected for session {session_id}")

    db: Session = SessionLocal()
    frame_counter = 0

    try:
        # Verify session existence
        session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
        if not session_obj:
            await websocket.send_json({"type": "error", "message": f"Session {session_id} not found."})
            await websocket.close()
            return

        # Initialize or reuse temporal engine and tracker for this session
        if session_id not in session_engines:
            session_engines[session_id] = TemporalDistractionEngine()
        engine = session_engines[session_id]

        if session_id not in session_trackers:
            session_trackers[session_id] = ObjectTracker()
        tracker = session_trackers[session_id]

        if session_id not in session_guards:
            session_guards[session_id] = PhoneViolationGuard()
        guard = session_guards[session_id]

        session_start_time = time.time()

        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            msg_type = data.get("type", "frame")

            # ── Ping/pong heartbeat ──────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
                continue

            # ── Frame analysis ───────────────────────────────────────────────
            if msg_type == "frame":
                image_base64 = data.get("image", "")
                image_bgr = decode_base64_image(image_base64)

                now_ts = time.time()
                elapsed_sec = round(now_ts - session_start_time, 1)
                frame_counter += 1

                face_count = 0
                head_dir = HEAD_DIR_UNKNOWN
                eye_state = EYE_UNKNOWN
                confidence = 0.9

                active_objects = []
                if image_bgr is not None:
                    h, w = image_bgr.shape[:2]
                    # 1. Face Detection
                    face_count, _ = face_detector.detect_faces(image_bgr)

                    # 2. Single Face Analysis
                    if face_count == 1:
                        landmarks_px = landmark_service.extract_landmarks(image_bgr)
                        if landmarks_px is not None:
                            head_dir, _ = head_pose_estimator.estimate_pose(landmarks_px, (h, w))
                            eye_state, _ = eye_state_analyzer.analyze_eyes(landmarks_px)
                        else:
                            head_dir = HEAD_DIR_CENTER
                            eye_state = EYE_OPEN
                    elif face_count == 0:
                        head_dir = HEAD_DIR_UNKNOWN
                        eye_state = EYE_UNKNOWN
                    else:
                        # Multiple faces — unknown individual pose
                        head_dir = HEAD_DIR_UNKNOWN
                        eye_state = EYE_UNKNOWN

                    # 2.5 Object Detection and Tracking
                    try:
                        detector = get_object_detector()
                        raw_objects = detector.detect(image_bgr, now_ts)
                        active_objects = tracker.update(raw_objects, now_ts)
                    except Exception as e:
                        logger.error(f"Object detection/tracking failed: {e}")
                        active_objects = []
                else:
                    # Frame decode failure — treat as attentive heartbeat
                    face_count = 1
                    head_dir = HEAD_DIR_CENTER
                    eye_state = EYE_OPEN

                # 3. Temporal State Machine
                qualified_status, promoted_event = engine.process_frame_observation(
                    face_count=face_count,
                    head_direction=head_dir,
                    eye_state=eye_state,
                    active_objects=active_objects,
                    current_time=now_ts
                )

                # 4. Save Qualified Event to Database if promoted
                active_event_payload = None
                auto_terminate_triggered = False
                if promoted_event is not None:
                    db_event = AttentionEvent(
                        session_id=session_id,
                        timestamp=datetime.now(timezone.utc),
                        event_type=promoted_event["event_type"],
                        duration=promoted_event["duration"],
                        confidence=promoted_event["confidence"],
                        severity=promoted_event["severity"],
                        object_id=promoted_event.get("object_id"),
                        x1=promoted_event.get("x1"),
                        y1=promoted_event.get("y1"),
                        x2=promoted_event.get("x2"),
                        y2=promoted_event.get("y2")
                    )
                    db.add(db_event)
                    db.commit()
                    db.refresh(db_event)

                    active_event_payload = {
                        "id": db_event.id,
                        "session_id": session_id,
                        "timestamp": db_event.timestamp.isoformat(),
                        "event_type": db_event.event_type,
                        "duration": db_event.duration,
                        "severity": db_event.severity,
                        "confidence": db_event.confidence,
                        "object_id": db_event.object_id,
                        "x1": db_event.x1,
                        "y1": db_event.y1,
                        "x2": db_event.x2,
                        "y2": db_event.y2
                    }
                    logger.info(
                        f"Session {session_id}: Promoted event {db_event.event_type} "
                        f"(severity: {db_event.severity})"
                    )

                    # Check phone violation limit
                    guard.register_event(db_event.event_type, db_event.id)
                    if guard.is_violation_limit_reached():
                        auto_terminate_triggered = True
                        logger.warning(
                            f"Session {session_id}: Auto-terminating session due to {guard.violation_count} phone violations"
                        )

                # 5. Deterministic Real-Time Score Calculation
                score_breakdown = scoring_engine.calculate_score(engine.durations)

                # 6. Persist score + elapsed duration to DB every SCORE_PERSIST_INTERVAL frames or upon auto-termination
                if frame_counter % SCORE_PERSIST_INTERVAL == 0 or auto_terminate_triggered:
                    try:
                        session_obj.attention_score = score_breakdown.final_score
                        session_obj.actual_duration = elapsed_sec
                        if auto_terminate_triggered:
                            session_obj.status = SESSION_COMPLETED
                            session_obj.end_time = datetime.now(timezone.utc)
                            summary = db.query(SessionSummary).filter(SessionSummary.session_id == session_id).first()
                            if summary:
                                summary.attentive_duration = engine.durations.get("attentive", 0.0)
                                summary.distraction_duration = engine.durations.get("distraction", 0.0)
                                summary.looking_away_duration = engine.durations.get("looking_away", 0.0)
                                summary.no_face_duration = engine.durations.get("no_face", 0.0)
                                summary.drowsiness_duration = engine.durations.get("drowsiness", 0.0)
                                summary.multiple_faces_duration = engine.durations.get("multiple_faces", 0.0)
                        db.commit()
                    except Exception as persist_err:
                        logger.warning(f"Score persistence failed for session {session_id}: {persist_err}")
                        db.rollback()

                # 7. Send Analysis Message back to client
                response_payload = {
                    "type": "analysis",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "face_detected": face_count > 0,
                    "face_count": face_count,
                    "head_direction": head_dir,
                    "eye_state": eye_state,
                    "status": qualified_status,
                    "confidence": confidence,
                    "attention_score": score_breakdown.final_score,
                    "score_breakdown": score_breakdown.model_dump(),
                    "active_event": active_event_payload,
                    "latest_event": active_event_payload,
                    "elapsed_seconds": elapsed_sec,
                    "objects": active_objects,
                    "phone_violations": guard.violation_count
                }

                await websocket.send_json(response_payload)

                if auto_terminate_triggered:
                    termination_payload = {
                        "type": "session_terminated",
                        "reason": "MAX_PHONE_VIOLATIONS_REACHED",
                        "message": "Session automatically terminated due to 3 mobile phone violation events.",
                        "session_id": session_id,
                        "phone_violations": guard.violation_count
                    }
                    await websocket.send_json(termination_payload)
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as exc:
        logger.error(f"WebSocket error on session {session_id}: {exc}")
    finally:
        # ── B2 Fix: Clean up engine on disconnect to prevent memory leak ────
        if session_id in session_engines:
            # Check if the session is completed — if so, remove engine entirely;
            # if still running (e.g. page refresh), keep engine for reconnect
            try:
                db.expire_all()
                session_check = db.query(StudySession).filter(StudySession.id == session_id).first()
                if session_check and session_check.status == SESSION_COMPLETED:
                    del session_engines[session_id]
                    if session_id in session_trackers:
                        del session_trackers[session_id]
                    if session_id in session_guards:
                        del session_guards[session_id]
                    logger.info(f"Cleaned up engine, tracker, and guard for completed session {session_id}")
                else:
                    logger.info(f"Keeping engine for session {session_id} (status: {session_check.status if session_check else 'unknown'}) — may reconnect")
            except Exception:
                # Safe fallback: clean up anyway
                if session_id in session_engines:
                    del session_engines[session_id]
                if session_id in session_trackers:
                    del session_trackers[session_id]
                if session_id in session_guards:
                    del session_guards[session_id]

        db.close()
