from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AIInsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    session_id: Optional[int] = None
    summary: str
    main_pattern: Optional[str] = None
    recommendations: List[str]
    limitations: Optional[str] = "Estimated from observable visual signals; not a medical or psychological evaluation."
    provider: str = "fallback"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIInsightGenerateRequest(BaseModel):
    regenerate: bool = False

class CustomEvaluationRequest(BaseModel):
    attention_score: Optional[float] = Field(default=78.0, description="Overall attention score out of 100")
    session_duration: float = Field(default=60.0, description="Total session duration in minutes (or seconds)")
    distraction_duration: float = Field(default=8.0, description="Total distraction time in minutes (or seconds)")
    phone_events: int = Field(default=2, description="Count of detected phone distraction events")
    no_face_duration: float = Field(default=3.0, description="Total duration when face was not detected in minutes (or seconds)")
    looking_away_duration: Optional[float] = Field(default=0.0, description="Total duration looking away in minutes (or seconds)")
    drowsiness_duration: Optional[float] = Field(default=0.0, description="Total duration of possible drowsiness in minutes (or seconds)")
    subject: Optional[str] = Field(default="Custom Study Session", description="Subject name")
    student_name: Optional[str] = Field(default="Student", description="Student name")

class CustomEvaluationResponse(BaseModel):
    attention_score: float
    session_duration_minutes: float
    distraction_duration_minutes: float
    phone_events: int
    no_face_duration_minutes: float
    attentive_duration_minutes: float
    attentive_percentage: float
    penalties: Dict[str, float]
    insight: AIInsightResponse

