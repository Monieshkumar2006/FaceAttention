from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.utils.thresholds import SEVERITY_INFO

class AttentionEvent(Base):
    __tablename__ = "attention_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    event_type = Column(String(50), nullable=False)  # ATTENTIVE, DISTRACTED, etc.
    duration = Column(Float, nullable=False, default=0.0)  # duration in seconds
    confidence = Column(Float, nullable=False, default=1.0)  # 0.0 to 1.0
    severity = Column(String(20), nullable=False, default=SEVERITY_INFO)  # INFO, LOW, MEDIUM, HIGH
    
    # Extended columns for object detection events
    object_id = Column(String(50), nullable=True)
    x1 = Column(Integer, nullable=True)
    y1 = Column(Integer, nullable=True)
    x2 = Column(Integer, nullable=True)
    y2 = Column(Integer, nullable=True)

    session = relationship("StudySession", back_populates="events")
