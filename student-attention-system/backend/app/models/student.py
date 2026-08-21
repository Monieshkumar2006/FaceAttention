from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    student_id = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sessions = relationship("StudySession", back_populates="student", cascade="all, delete-orphan")
