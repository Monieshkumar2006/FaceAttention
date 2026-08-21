import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.session import StudySession
from app.models.event import AttentionEvent
from app.models.summary import SessionSummary
from app.models.insight import AIInsight
from app.schemas.ai import (
    AIInsightResponse, AIInsightGenerateRequest, 
    CustomEvaluationRequest, CustomEvaluationResponse
)
from app.services.ai.ai_service import ai_service
from app.services.attention.scoring_engine import scoring_engine
from app.utils.thresholds import (
    EVENT_DISTRACTED, EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS,
    EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN,
    EVENT_MULTIPLE_FACES
)

router = APIRouter(prefix="/ai", tags=["AI Insights"])

def _gather_session_stats(session_obj: StudySession, db: Session) -> dict:
    events = db.query(AttentionEvent).filter(AttentionEvent.session_id == session_obj.id).all()
    summary = db.query(SessionSummary).filter(SessionSummary.session_id == session_obj.id).first()

    total_actual_sec = session_obj.actual_duration
    if total_actual_sec <= 0.0 and session_obj.start_time and session_obj.end_time:
        total_actual_sec = max(1.0, (session_obj.end_time - session_obj.start_time).total_seconds())
    elif total_actual_sec <= 0.0:
        total_actual_sec = max(1.0, float(session_obj.planned_duration * 60))

    attentive_sec = summary.attentive_duration if summary else 0.0
    distracted_sec = summary.distraction_duration if summary else 0.0
    looking_away_sec = summary.looking_away_duration if summary else 0.0
    no_face_sec = summary.no_face_duration if summary else 0.0
    drowsiness_sec = summary.drowsiness_duration if summary else 0.0
    multiple_faces_sec = summary.multiple_faces_duration if summary else 0.0

    if attentive_sec == 0.0 and distracted_sec == 0.0 and len(events) > 0:
        distracted_sec = sum(e.duration for e in events if e.event_type == EVENT_DISTRACTED)
        looking_away_sec = sum(e.duration for e in events if e.event_type in (EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN))
        no_face_sec = sum(e.duration for e in events if e.event_type == EVENT_NO_FACE)
        drowsiness_sec = sum(e.duration for e in events if e.event_type == EVENT_POSSIBLE_DROWSINESS)
        multiple_faces_sec = sum(e.duration for e in events if e.event_type == EVENT_MULTIPLE_FACES)
        non_att = distracted_sec + looking_away_sec + no_face_sec + drowsiness_sec + multiple_faces_sec
        attentive_sec = max(0.0, total_actual_sec - non_att)
    elif attentive_sec == 0.0 and len(events) == 0:
        attentive_sec = total_actual_sec

    # Count phone events
    phone_events_count = sum(1 for e in events if e.event_type in ("PHONE_DETECTED", "PHONE_PERSISTENT", "POTENTIAL_PHONE_DISTRACTION") or (e.object_id and "cell phone" in str(e.object_id).lower()))

    durations_dict = {
        "attentive": attentive_sec,
        "distraction": distracted_sec,
        "looking_away": looking_away_sec,
        "no_face": no_face_sec,
        "drowsiness": drowsiness_sec,
        "multiple_faces": multiple_faces_sec
    }
    score_breakdown = scoring_engine.calculate_score(durations_dict)

    return {
        "subject": session_obj.subject,
        "actual_duration_seconds": total_actual_sec,
        "planned_duration_minutes": session_obj.planned_duration,
        "attention_score": session_obj.attention_score or score_breakdown.final_score,
        "attentive_percentage": score_breakdown.attentive_percentage,
        "distraction_seconds": distracted_sec,
        "looking_away_seconds": looking_away_sec,
        "no_face_seconds": no_face_sec,
        "drowsiness_seconds": drowsiness_sec,
        "multiple_faces_seconds": multiple_faces_sec,
        "phone_events": phone_events_count,
        "event_count": len(events)
    }

@router.post("/evaluate-custom", response_model=CustomEvaluationResponse)
def evaluate_custom_metrics(payload: CustomEvaluationRequest):
    """
    Direct evaluation of custom session statistics without requiring pre-recorded sessions.
    Accepts metrics like attention_score, session_duration, distraction_duration, phone_events, no_face_duration.
    """
    # Normalize durations: if values look like minutes (<= 180), convert to seconds for calculation
    is_minutes = payload.session_duration <= 180.0
    total_sec = payload.session_duration * 60.0 if is_minutes else payload.session_duration
    distraction_sec = payload.distraction_duration * 60.0 if is_minutes else payload.distraction_duration
    no_face_sec = payload.no_face_duration * 60.0 if is_minutes else payload.no_face_duration
    looking_away_sec = (payload.looking_away_duration or 0.0) * 60.0 if is_minutes else (payload.looking_away_duration or 0.0)
    drowsiness_sec = (payload.drowsiness_duration or 0.0) * 60.0 if is_minutes else (payload.drowsiness_duration or 0.0)

    non_attentive = distraction_sec + no_face_sec + looking_away_sec + drowsiness_sec
    attentive_sec = max(0.0, total_sec - non_attentive)

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

    stats = {
        "subject": payload.subject or "Custom Session Evaluation",
        "student_name": payload.student_name or "Student",
        "actual_duration_seconds": total_sec,
        "attention_score": final_score,
        "attentive_percentage": score_calc.attentive_percentage,
        "distraction_seconds": distraction_sec,
        "looking_away_seconds": looking_away_sec,
        "no_face_seconds": no_face_sec,
        "drowsiness_seconds": drowsiness_sec,
        "phone_events": payload.phone_events,
        "event_count": payload.phone_events + (1 if distraction_sec > 0 else 0) + (1 if no_face_sec > 0 else 0)
    }

    insight_response = ai_service.generate_insights(session_id=None, stats=stats)

    penalties = {
        "distraction_penalty": score_calc.distraction_penalty,
        "no_face_penalty": score_calc.no_face_penalty,
        "looking_away_penalty": score_calc.looking_away_penalty,
        "drowsiness_penalty": score_calc.drowsiness_penalty,
        "total_penalty": score_calc.total_penalty
    }

    return CustomEvaluationResponse(
        attention_score=final_score,
        session_duration_minutes=round(total_sec / 60.0, 1),
        distraction_duration_minutes=round(distraction_sec / 60.0, 1),
        phone_events=payload.phone_events,
        no_face_duration_minutes=round(no_face_sec / 60.0, 1),
        attentive_duration_minutes=round(attentive_sec / 60.0, 1),
        attentive_percentage=score_calc.attentive_percentage,
        penalties=penalties,
        insight=insight_response
    )

@router.get("/{session_id}", response_model=AIInsightResponse)
def get_ai_insight(session_id: int, db: Session = Depends(get_db)):
    """Fetch stored AI insights or generate if not previously generated."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    insight = db.query(AIInsight).filter(AIInsight.session_id == session_id).order_by(AIInsight.created_at.desc()).first()
    if insight:
        recs = json.loads(insight.recommendations) if insight.recommendations.startswith("[") else insight.recommendations.split("\n")
        return AIInsightResponse(
            id=insight.id,
            session_id=session_id,
            summary=insight.summary,
            main_pattern=insight.main_pattern,
            recommendations=recs,
            limitations=insight.limitations,
            provider="Stored DB Insight",
            created_at=insight.created_at
        )

    # Generate new insight
    stats = _gather_session_stats(session_obj, db)
    generated = ai_service.generate_insights(session_id, stats)

    # Persist in DB
    db_insight = AIInsight(
        session_id=session_id,
        summary=generated.summary,
        main_pattern=generated.main_pattern,
        recommendations=json.dumps(generated.recommendations),
        limitations=generated.limitations
    )
    db.add(db_insight)
    db.commit()
    db.refresh(db_insight)

    generated.id = db_insight.id
    return generated

@router.post("/{session_id}/generate", response_model=AIInsightResponse)
def generate_ai_insight(session_id: int, payload: AIInsightGenerateRequest, db: Session = Depends(get_db)):
    """Generate or re-generate study habit recommendations for a session."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    stats = _gather_session_stats(session_obj, db)
    generated = ai_service.generate_insights(session_id, stats)

    db_insight = AIInsight(
        session_id=session_id,
        summary=generated.summary,
        main_pattern=generated.main_pattern,
        recommendations=json.dumps(generated.recommendations),
        limitations=generated.limitations
    )
    db.add(db_insight)
    db.commit()
    db.refresh(db_insight)

    generated.id = db_insight.id
    return generated

