from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# Frame payload received from client
class FrameMessage(BaseModel):
    type: str = "frame"
    timestamp: str
    image: str  # Base64 encoded JPEG / PNG

# Real-time analysis output sent to client
class VisionOutput(BaseModel):
    timestamp: str
    face_detected: bool
    face_count: int
    head_direction: str  # CENTER, LEFT, RIGHT, UP, DOWN, UNKNOWN
    eye_state: str  # OPEN, CLOSED, UNKNOWN
    status: str  # ATTENTIVE, LOOKING_LEFT, DISTRACTED, etc.
    confidence: float
    attention_score: Optional[float] = 100.0

class MonitoringAnalysisMessage(BaseModel):
    type: str = "analysis"
    timestamp: str
    face_count: int
    head_direction: str
    eye_state: str
    status: str
    confidence: float
    attention_score: float
    active_event: Optional[str] = None
    elapsed_seconds: float = 0.0

# Event Schema
class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    timestamp: datetime
    event_type: str
    duration: float
    confidence: float
    severity: str
    object_id: Optional[str] = None
    x1: Optional[int] = None
    y1: Optional[int] = None
    x2: Optional[int] = None
    y2: Optional[int] = None
