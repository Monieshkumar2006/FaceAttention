from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.utils.thresholds import SESSION_CREATED

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject = Column(String(100), nullable=False)
    planned_duration = Column(Integer, nullable=False, default=25)  # in minutes
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    actual_duration = Column(Float, nullable=False, default=0.0)  # in seconds
    attention_score = Column(Float, nullable=True)  # 0 to 100
    status = Column(String(20), nullable=False, default=SESSION_CREATED)  # CREATED, RUNNING, PAUSED, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="sessions")
    events = relationship("AttentionEvent", back_populates="session", cascade="all, delete-orphan", order_by="AttentionEvent.timestamp")
    summary = relationship("SessionSummary", back_populates="session", uselist=False, cascade="all, delete-orphan")
    insights = relationship("AIInsight", back_populates="session", cascade="all, delete-orphan")
