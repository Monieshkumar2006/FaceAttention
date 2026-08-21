from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.session import StudySession
from app.models.event import AttentionEvent
from app.models.summary import SessionSummary
from app.models.insight import AIInsight
from app.services.reports.report_service import report_generator

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{session_id}")
def generate_pdf_report(session_id: int, db: Session = Depends(get_db)):
    """Generate and stream a PDF summary report for a given study session."""
    session_obj = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study session {session_id} not found."
        )

    summary = db.query(SessionSummary).filter(SessionSummary.session_id == session_id).first()
    events = db.query(AttentionEvent).filter(AttentionEvent.session_id == session_id).all()
    insight = db.query(AIInsight).filter(AIInsight.session_id == session_id).order_by(AIInsight.created_at.desc()).first()

    pdf_buffer = report_generator.generate_session_pdf(
        session=session_obj,
        summary=summary,
        events=events,
        insight=insight
    )

    filename = f"StudySession_{session_id}_{session_obj.subject.replace(' ', '_')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
