from datetime import datetime
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.database import Base

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    main_pattern = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=False)  # JSON or newline-separated strings
    limitations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("StudySession", back_populates="insights")
