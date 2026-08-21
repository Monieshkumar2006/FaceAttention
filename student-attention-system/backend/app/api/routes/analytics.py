from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.database import get_db
from app.models.session import StudySession
from app.models.event import AttentionEvent
from app.models.summary import SessionSummary
from app.schemas.analytics import (
    AnalyticsResponse, ScoreBreakdown, DurationMetrics,
    TimelineBlock, EventDistributionItem, ObjectDetectionSummary
)
from app.schemas.monitoring import EventResponse
from app.services.attention.scoring_engine import scoring_engine
from app.utils.thresholds import (
    EVENT_ATTENTIVE, EVENT_DISTRACTED, EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS,
    EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN,
    EVENT_MULTIPLE_FACES, EVENT_POTENTIAL_DISTRACTION, EVENT_SEVERITY_MAP,
    EVENT_OBJECT_DETECTED, EVENT_PHONE_DETECTED, EVENT_PHONE_PERSISTENT,
    EVENT_ADDITIONAL_PERSON, EVENT_POTENTIAL_OBJECT_DISTRACTION,
    EVENT_POTENTIAL_PHONE_DISTRACTION
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/{session_id}", response_model=AnalyticsResponse)
def get_session_analytics(session_id: int, db: Session = Depends(get_db)):
    """Retrieve comprehensive session analytics, charts, timeline, and score breakdown."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session {session_id} not found."
        )

    # Fetch events
    events = (
        db.query(AttentionEvent)
        .filter(AttentionEvent.session_id == session_id)
        .order_by(AttentionEvent.timestamp)
        .all()
    )

    summary = db.query(SessionSummary).filter(SessionSummary.session_id == session_id).first()
    
    # Calculate durations
    attentive_sec = summary.attentive_duration if summary else 0.0
    distracted_sec = summary.distraction_duration if summary else 0.0
    looking_away_sec = summary.looking_away_duration if summary else 0.0
    no_face_sec = summary.no_face_duration if summary else 0.0
    drowsiness_sec = summary.drowsiness_duration if summary else 0.0
    multiple_faces_sec = summary.multiple_faces_duration if summary else 0.0

    total_actual_sec = session_obj.actual_duration
    if total_actual_sec <= 0.0 and session_obj.start_time and session_obj.end_time:
        total_actual_sec = max(1.0, (session_obj.end_time - session_obj.start_time).total_seconds())
    elif total_actual_sec <= 0.0:
        total_actual_sec = max(1.0, float(session_obj.planned_duration * 60))

    # If summary was not updated, compute from events
    if attentive_sec == 0.0 and distracted_sec == 0.0 and len(events) > 0:
        distracted_sec = sum(e.duration for e in events if e.event_type == EVENT_DISTRACTED)
        looking_away_sec = sum(e.duration for e in events if e.event_type in (EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN, EVENT_POTENTIAL_DISTRACTION))
        no_face_sec = sum(e.duration for e in events if e.event_type == EVENT_NO_FACE)
        drowsiness_sec = sum(e.duration for e in events if e.event_type == EVENT_POSSIBLE_DROWSINESS)
        multiple_faces_sec = sum(e.duration for e in events if e.event_type == EVENT_MULTIPLE_FACES)
        
        non_attentive_total = distracted_sec + looking_away_sec + no_face_sec + drowsiness_sec + multiple_faces_sec
        attentive_sec = max(0.0, total_actual_sec - non_attentive_total)
    elif attentive_sec == 0.0 and len(events) == 0:
        attentive_sec = total_actual_sec

    durations_dict = {
        "attentive": attentive_sec,
        "distraction": distracted_sec,
        "looking_away": looking_away_sec,
        "no_face": no_face_sec,
        "drowsiness": drowsiness_sec,
        "multiple_faces": multiple_faces_sec
    }

    # Score breakdown
    score_breakdown = scoring_engine.calculate_score(durations_dict)

    # Event Distribution
    event_counts: Dict[str, Dict[str, Any]] = {}
    for e in events:
        if e.event_type not in event_counts:
            event_counts[e.event_type] = {
                "event_type": e.event_type,
                "count": 0,
                "total_duration": 0.0,
                "severity": e.severity
            }
        event_counts[e.event_type]["count"] += 1
        event_counts[e.event_type]["total_duration"] += e.duration

    distribution_list = [
        EventDistributionItem(
            event_type=k,
            count=v["count"],
            total_duration=round(v["total_duration"], 1),
            severity=v["severity"]
        )
        for k, v in event_counts.items()
    ]

    # Timeline blocks
    timeline_blocks: List[TimelineBlock] = []
    current_sec = 0.0
    for e in events:
        start_sec = current_sec
        dur = max(1.0, e.duration)
        end_sec = min(total_actual_sec, start_sec + dur)
        timeline_blocks.append(TimelineBlock(
            start_second=start_sec,
            end_second=end_sec,
            duration_seconds=dur,
            status=e.event_type,
            severity=e.severity
        ))
        current_sec = end_sec

    # Fill remaining time with attentive block if timeline is short
    if current_sec < total_actual_sec:
        timeline_blocks.append(TimelineBlock(
            start_second=current_sec,
            end_second=total_actual_sec,
            duration_seconds=round(total_actual_sec - current_sec, 1),
            status=EVENT_ATTENTIVE,
            severity=EVENT_SEVERITY_MAP[EVENT_ATTENTIVE]
        ))

    # Object Detection Summary calculations from events
    phone_events = [
        e for e in events 
        if e.event_type in (EVENT_PHONE_DETECTED, "PHONE_DETECTED", EVENT_PHONE_PERSISTENT, "PHONE_PERSISTENT", EVENT_POTENTIAL_PHONE_DISTRACTION, "POTENTIAL_PHONE_DISTRACTION")
        or (e.object_id and "phone" in str(e.object_id).lower())
    ]
    phone_detection_count = len(phone_events)
    
    phone_persistent_events = [
        e for e in events 
        if e.event_type in (EVENT_PHONE_PERSISTENT, "PHONE_PERSISTENT", EVENT_POTENTIAL_PHONE_DISTRACTION, "POTENTIAL_PHONE_DISTRACTION")
    ]
    phone_persistent_duration = sum(e.duration for e in phone_persistent_events)
    
    additional_person_events = len([
        e for e in events 
        if e.event_type in (EVENT_ADDITIONAL_PERSON, "ADDITIONAL_PERSON", EVENT_MULTIPLE_FACES, "MULTIPLE_FACES")
    ])
    
    object_distraction_events = len([
        e for e in events 
        if e.event_type in (
            EVENT_POTENTIAL_OBJECT_DISTRACTION, "POTENTIAL_OBJECT_DISTRACTION",
            EVENT_POTENTIAL_PHONE_DISTRACTION, "POTENTIAL_PHONE_DISTRACTION",
            EVENT_PHONE_DETECTED, "PHONE_DETECTED",
            EVENT_PHONE_PERSISTENT, "PHONE_PERSISTENT"
        )
    ])

    object_summary = ObjectDetectionSummary(
        phone_detection_count=phone_detection_count,
        phone_persistent_duration=round(phone_persistent_duration, 1),
        additional_person_events=additional_person_events,
        object_distraction_events=object_distraction_events
    )

    # Convert recent events
    recent_events_resp = [
        EventResponse(
            id=e.id,
            session_id=e.session_id,
            timestamp=e.timestamp,
            event_type=e.event_type,
            duration=e.duration,
            confidence=e.confidence,
            severity=e.severity,
            object_id=e.object_id,
            x1=e.x1,
            y1=e.y1,
            x2=e.x2,
            y2=e.y2
        )
        for e in reversed(events[-50:])
    ]

    return AnalyticsResponse(
        session_id=session_obj.id,
        subject=session_obj.subject,
        student_name=session_obj.student.name if session_obj.student else "Student",
        start_time=session_obj.start_time,
        end_time=session_obj.end_time,
        actual_duration_seconds=total_actual_sec,
        planned_duration_minutes=session_obj.planned_duration,
        attention_score=session_obj.attention_score if session_obj.attention_score is not None else score_breakdown.final_score,
        score_breakdown=score_breakdown,
        durations=DurationMetrics(
            total_duration_seconds=total_actual_sec,
            attentive_seconds=round(attentive_sec, 1),
            distraction_seconds=round(distracted_sec, 1),
            looking_away_seconds=round(looking_away_sec, 1),
            no_face_seconds=round(no_face_sec, 1),
            drowsiness_seconds=round(drowsiness_sec, 1),
            multiple_faces_seconds=round(multiple_faces_sec, 1)
        ),
        event_distribution=distribution_list,
        timeline=timeline_blocks,
        recent_events=recent_events_resp,
        object_summary=object_summary
    )
