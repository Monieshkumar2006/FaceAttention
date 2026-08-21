from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.monitoring import EventResponse

class ScoreBreakdown(BaseModel):
    base_score: float = 100.0
    distraction_penalty: float = 0.0
    looking_away_penalty: float = 0.0
    no_face_penalty: float = 0.0
    drowsiness_penalty: float = 0.0
    multiple_faces_penalty: float = 0.0
    total_penalty: float = 0.0
    final_score: float = 100.0
    attentive_percentage: float = 100.0

class DurationMetrics(BaseModel):
    total_duration_seconds: float
    attentive_seconds: float
    distraction_seconds: float
    looking_away_seconds: float
    no_face_seconds: float
    drowsiness_seconds: float
    multiple_faces_seconds: float

class TimelineBlock(BaseModel):
    start_second: float
    end_second: float
    duration_seconds: float
    status: str
    severity: str

class EventDistributionItem(BaseModel):
    event_type: str
    count: int
    total_duration: float
    severity: str

class ObjectDetectionSummary(BaseModel):
    phone_detection_count: int = 0
    phone_persistent_duration: float = 0.0
    additional_person_events: int = 0
    object_distraction_events: int = 0

class AnalyticsResponse(BaseModel):
    session_id: int
    subject: str
    student_name: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    actual_duration_seconds: float
    planned_duration_minutes: int
    attention_score: float
    score_breakdown: ScoreBreakdown
    durations: DurationMetrics
    event_distribution: List[EventDistributionItem]
    timeline: List[TimelineBlock]
    recent_events: List[EventResponse]
    object_summary: Optional[ObjectDetectionSummary] = None
