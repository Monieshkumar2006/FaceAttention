from datetime import datetime
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.database import Base

class SessionSummary(Base):
    __tablename__ = "session_summaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("study_sessions.id"), unique=True, nullable=False)
    
    attentive_duration = Column(Float, nullable=False, default=0.0)  # seconds
    distraction_duration = Column(Float, nullable=False, default=0.0)  # seconds
    looking_away_duration = Column(Float, nullable=False, default=0.0)  # seconds
    no_face_duration = Column(Float, nullable=False, default=0.0)  # seconds
    drowsiness_duration = Column(Float, nullable=False, default=0.0)  # seconds
    multiple_faces_duration = Column(Float, nullable=False, default=0.0)  # seconds
    
    event_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("StudySession", back_populates="summary")
