from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# Student Schemas
class StudentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    student_id: Optional[str] = Field(None, max_length=50)

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

# Session Schemas
class SessionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Student's name")
    student_id: Optional[str] = Field(None, max_length=50, description="Optional Student ID number/identifier")
    subject: str = Field(..., min_length=1, max_length=100, description="Subject or task name")
    planned_duration: int = Field(25, ge=1, le=480, description="Planned duration in minutes")

class SessionSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    attentive_duration: float
    distraction_duration: float
    looking_away_duration: float
    no_face_duration: float
    drowsiness_duration: float
    multiple_faces_duration: float
    event_count: int
    created_at: datetime

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    student: Optional[StudentResponse] = None
    subject: str
    planned_duration: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    actual_duration: float
    attention_score: Optional[float] = None
    status: str
    created_at: datetime
    summary: Optional[SessionSummaryResponse] = None

class SessionListResponse(BaseModel):
    items: List[SessionResponse]
    total: int
