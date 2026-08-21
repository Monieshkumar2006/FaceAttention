from datetime import datetime, timedelta
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.database import get_db
from app.models.student import Student
from app.models.session import StudySession
from app.models.summary import SessionSummary
from app.models.event import AttentionEvent
from app.models.insight import AIInsight
from app.schemas.session import SessionCreate, SessionResponse, SessionListResponse
from app.schemas.monitoring import EventResponse
from app.schemas.ai import CustomEvaluationRequest
from app.services.ai.ai_service import ai_service
from app.services.attention.scoring_engine import scoring_engine
from app.utils.thresholds import (
    SESSION_CREATED, SESSION_RUNNING, SESSION_PAUSED, SESSION_COMPLETED,
    EVENT_ATTENTIVE, EVENT_DISTRACTED, EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS,
    EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN,
    EVENT_MULTIPLE_FACES, EVENT_PHONE_DETECTED, EVENT_PHONE_PERSISTENT,
    SEVERITY_INFO, SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH
)
from app.utils.logger import logger

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    """Create a student and study session in CREATED state."""
    # Find or create student
    student = None
    if payload.student_id:
        student = db.query(Student).filter(Student.student_id == payload.student_id).first()
    
    if not student:
        student = Student(name=payload.name.strip(), student_id=payload.student_id)
        db.add(student)
        db.commit()
        db.refresh(student)
    else:
        # Update name if changed
        if student.name != payload.name.strip():
            student.name = payload.name.strip()
            db.commit()

    # Create new study session
    study_session = StudySession(
        student_id=student.id,
        subject=payload.subject.strip(),
        planned_duration=payload.planned_duration,
        status=SESSION_CREATED,
        attention_score=100.0,
        actual_duration=0.0
    )
    db.add(study_session)
    db.commit()
    db.refresh(study_session)

    # Initialize empty session summary
    summary = SessionSummary(
        session_id=study_session.id,
        attentive_duration=0.0,
        distraction_duration=0.0,
        looking_away_duration=0.0,
        no_face_duration=0.0,
        drowsiness_duration=0.0,
        multiple_faces_duration=0.0,
        event_count=0
    )
    db.add(summary)
    db.commit()
    db.refresh(study_session)

    logger.info(f"Created study session {study_session.id} for student '{student.name}'")
    return study_session

@router.post("/simulate", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def simulate_session(payload: CustomEvaluationRequest, db: Session = Depends(get_db)):
    """
    Simulate and save a completed study session with custom metrics:
    attention_score, session_duration, distraction_duration, phone_events, no_face_duration.
    Synthesizes timeline events and generates AI insights.
    """
    # 1. Normalize Durations
    is_minutes = payload.session_duration <= 180.0
    total_sec = payload.session_duration * 60.0 if is_minutes else payload.session_duration
    planned_min = max(1, int(round(total_sec / 60.0)))
    distraction_sec = payload.distraction_duration * 60.0 if is_minutes else payload.distraction_duration
    no_face_sec = payload.no_face_duration * 60.0 if is_minutes else payload.no_face_duration
    looking_away_sec = (payload.looking_away_duration or 0.0) * 60.0 if is_minutes else (payload.looking_away_duration or 0.0)
    drowsiness_sec = (payload.drowsiness_duration or 0.0) * 60.0 if is_minutes else (payload.drowsiness_duration or 0.0)

    non_attentive = distraction_sec + no_face_sec + looking_away_sec + drowsiness_sec
    attentive_sec = max(0.0, total_sec - non_attentive)

    # Calculate score breakdown
    durations_dict = {
        "attentive": attentive_sec,
        "distraction": distraction_sec,
        "looking_away": looking_away_sec,
        "no_face": no_face_sec,
        "drowsiness": drowsiness_sec,
        "multiple_faces": 0.0
    }
    score_calc = scoring_engine.calculate_score(durations_dict)
    final_score = payload.attention_score if payload.attention_score is not None else score_calc.final_score

    # 2. Find or create student
    student_name = (payload.student_name or "Student").strip()
    student = db.query(Student).filter(Student.name == student_name).first()
    if not student:
        student = Student(name=student_name, student_id=f"SIM-{int(datetime.utcnow().timestamp()) % 10000}")
        db.add(student)
        db.commit()
        db.refresh(student)

    # 3. Create Completed StudySession
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(seconds=total_sec)

    study_session = StudySession(
        student_id=student.id,
        subject=(payload.subject or "Custom Evaluated Session").strip(),
        planned_duration=planned_min,
        actual_duration=round(total_sec, 1),
        status=SESSION_COMPLETED,
        attention_score=final_score,
        start_time=start_time,
        end_time=end_time
    )
    db.add(study_session)
    db.commit()
    db.refresh(study_session)

    # 4. Generate Synthetic Timeline Events
    created_events = []
    
    # Base Attentive Event
    if attentive_sec > 0:
        created_events.append(
            AttentionEvent(
                session_id=study_session.id,
                timestamp=start_time + timedelta(seconds=10),
                event_type=EVENT_ATTENTIVE,
                duration=round(attentive_sec, 1),
                confidence=0.98,
                severity=SEVERITY_INFO
            )
        )

    # Distraction Events
    if distraction_sec > 0:
        created_events.append(
            AttentionEvent(
                session_id=study_session.id,
                timestamp=start_time + timedelta(seconds=max(30, int(total_sec * 0.25))),
                event_type=EVENT_DISTRACTED,
                duration=round(distraction_sec, 1),
                confidence=0.92,
                severity=SEVERITY_HIGH
            )
        )

    # No Face Events
    if no_face_sec > 0:
        created_events.append(
            AttentionEvent(
                session_id=study_session.id,
                timestamp=start_time + timedelta(seconds=max(45, int(total_sec * 0.55))),
                event_type=EVENT_NO_FACE,
                duration=round(no_face_sec, 1),
                confidence=0.95,
                severity=SEVERITY_MEDIUM
            )
        )

    # Phone Events
    phone_count = max(0, int(payload.phone_events))
    for i in range(phone_count):
        offset_ratio = 0.2 + (i + 1) * (0.6 / max(1, phone_count + 1))
        created_events.append(
            AttentionEvent(
                session_id=study_session.id,
                timestamp=start_time + timedelta(seconds=int(total_sec * offset_ratio)),
                event_type=EVENT_PHONE_DETECTED,
                duration=5.0 + (i * 2.5),
                confidence=0.88,
                severity=SEVERITY_HIGH,
                object_id=f"cell_phone_{i+1}",
                x1=120, y1=180, x2=240, y2=360
            )
        )

    for ev in created_events:
        db.add(ev)
    db.commit()

    # 5. Create SessionSummary
    summary = SessionSummary(
        session_id=study_session.id,
        attentive_duration=round(attentive_sec, 1),
        distraction_duration=round(distraction_sec, 1),
        looking_away_duration=round(looking_away_sec, 1),
        no_face_duration=round(no_face_sec, 1),
        drowsiness_duration=round(drowsiness_sec, 1),
        multiple_faces_duration=0.0,
        event_count=len(created_events)
    )
    db.add(summary)
    db.commit()

    # 6. Generate and Persist AI Insight
    stats = {
        "subject": study_session.subject,
        "student_name": student.name,
        "actual_duration_seconds": total_sec,
        "planned_duration_minutes": planned_min,
        "attention_score": final_score,
        "attentive_percentage": score_calc.attentive_percentage,
        "distraction_seconds": distraction_sec,
        "looking_away_seconds": looking_away_sec,
        "no_face_seconds": no_face_sec,
        "drowsiness_seconds": drowsiness_sec,
        "phone_events": phone_count,
        "event_count": len(created_events)
    }
    insight_res = ai_service.generate_insights(session_id=study_session.id, stats=stats)
    db_insight = AIInsight(
        session_id=study_session.id,
        summary=insight_res.summary,
        main_pattern=insight_res.main_pattern,
        recommendations=json.dumps(insight_res.recommendations),
        limitations=insight_res.limitations
    )
    db.add(db_insight)
    db.commit()

    db.refresh(study_session)
    logger.info(f"Simulated study session #{study_session.id} with score {final_score}")
    return study_session

@router.get("", response_model=SessionListResponse)
def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    student_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List sessions with optional filtering and pagination."""
    query = db.query(StudySession).order_by(desc(StudySession.created_at))
    if status_filter:
        query = query.filter(StudySession.status == status_filter.upper())
    if student_id:
        query = query.join(Student).filter(Student.student_id == student_id)
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return SessionListResponse(items=items, total=total)

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Fetch session details by ID."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session with ID {session_id} not found."
        )
    return session_obj

@router.post("/{session_id}/start", response_model=SessionResponse)
def start_session(session_id: int, db: Session = Depends(get_db)):
    """Transition session from CREATED to RUNNING."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    if session_obj.status != SESSION_CREATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start session in '{session_obj.status}' state. Only '{SESSION_CREATED}' sessions can be started."
        )
    
    session_obj.status = SESSION_RUNNING
    session_obj.start_time = datetime.utcnow()
    db.commit()
    db.refresh(session_obj)
    logger.info(f"Started session {session_id}")
    return session_obj

@router.post("/{session_id}/pause", response_model=SessionResponse)
def pause_session(session_id: int, db: Session = Depends(get_db)):
    """Transition session from RUNNING to PAUSED."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    if session_obj.status != SESSION_RUNNING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause session in '{session_obj.status}' state. Only '{SESSION_RUNNING}' sessions can be paused."
        )
    
    session_obj.status = SESSION_PAUSED
    db.commit()
    db.refresh(session_obj)
    logger.info(f"Paused session {session_id}")
    return session_obj

@router.post("/{session_id}/resume", response_model=SessionResponse)
def resume_session(session_id: int, db: Session = Depends(get_db)):
    """Transition session from PAUSED to RUNNING."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    if session_obj.status != SESSION_PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume session in '{session_obj.status}' state. Only '{SESSION_PAUSED}' sessions can be resumed."
        )
    
    session_obj.status = SESSION_RUNNING
    db.commit()
    db.refresh(session_obj)
    logger.info(f"Resumed session {session_id}")
    return session_obj

@router.post("/{session_id}/complete", response_model=SessionResponse)
def complete_session(session_id: int, db: Session = Depends(get_db)):
    """Transition session from RUNNING or PAUSED to COMPLETED."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    if session_obj.status not in (SESSION_RUNNING, SESSION_PAUSED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete session in '{session_obj.status}' state."
        )
    
    session_obj.status = SESSION_COMPLETED
    session_obj.end_time = datetime.utcnow()
    
    # Calculate actual duration if start_time exists
    if session_obj.start_time:
        total_seconds = (session_obj.end_time - session_obj.start_time).total_seconds()
        if session_obj.actual_duration <= 0.0:
            session_obj.actual_duration = max(1.0, total_seconds)
    
    # Calculate summary if not populated
    summary = db.query(SessionSummary).filter(SessionSummary.session_id == session_id).first()
    if not summary:
        summary = SessionSummary(session_id=session_id)
        db.add(summary)
    
    events = db.query(AttentionEvent).filter(AttentionEvent.session_id == session_id).all()
    summary.event_count = len(events)
    
    # Aggregate durations from events
    attentive_sec = sum(e.duration for e in events if e.event_type == EVENT_ATTENTIVE)
    distracted_sec = sum(e.duration for e in events if e.event_type == EVENT_DISTRACTED)
    looking_away_sec = sum(e.duration for e in events if e.event_type in (EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN))
    no_face_sec = sum(e.duration for e in events if e.event_type == EVENT_NO_FACE)
    drowsiness_sec = sum(e.duration for e in events if e.event_type == EVENT_POSSIBLE_DROWSINESS)
    multiple_faces_sec = sum(e.duration for e in events if e.event_type == EVENT_MULTIPLE_FACES)
    
    summary.attentive_duration = attentive_sec
    summary.distraction_duration = distracted_sec
    summary.looking_away_duration = looking_away_sec
    summary.no_face_duration = no_face_sec
    summary.drowsiness_duration = drowsiness_sec
    summary.multiple_faces_duration = multiple_faces_sec

    # Default score calculation if not yet assigned
    if session_obj.attention_score is None:
        total_duration = max(1.0, session_obj.actual_duration)
        distract_ratio = (distracted_sec + no_face_sec + drowsiness_sec + looking_away_sec * 0.5) / total_duration
        session_obj.attention_score = max(0.0, min(100.0, round((1.0 - distract_ratio) * 100.0, 1)))

    db.commit()
    db.refresh(session_obj)
    logger.info(f"Completed session {session_id} with score {session_obj.attention_score}")
    return session_obj

@router.get("/{session_id}/events", response_model=List[EventResponse])
def get_session_events(
    session_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve recorded attention events for a session."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    events = (
        db.query(AttentionEvent)
        .filter(AttentionEvent.session_id == session_id)
        .order_by(desc(AttentionEvent.timestamp))
        .limit(limit)
        .all()
    )
    return events

