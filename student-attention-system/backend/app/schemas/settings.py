from pydantic import BaseModel, Field
from typing import Optional

class SystemSettingsSchema(BaseModel):
    # 1. Detection Settings
    face_confidence: float = Field(default=0.50, ge=0.1, le=1.0, description="Face detection confidence threshold")
    object_confidence: float = Field(default=0.35, ge=0.1, le=1.0, description="Object detection confidence threshold")
    eye_sensitivity: float = Field(default=0.21, ge=0.1, le=0.4, description="Eye aspect ratio threshold for drowsiness")
    head_pose_sensitivity: float = Field(default=22.0, ge=5.0, le=45.0, description="Yaw/Pitch threshold in degrees")

    # 2. Distraction Settings
    distraction_persistence: float = Field(default=5.0, ge=1.0, le=30.0, description="Distraction persistence in seconds")
    look_away_threshold: float = Field(default=2.0, ge=0.5, le=15.0, description="Look away threshold in seconds")
    no_face_threshold: float = Field(default=3.0, ge=1.0, le=20.0, description="No-face threshold in seconds")

    # 3. Mobile Phone Detection
    phone_detection_enabled: bool = Field(default=True, description="Enable or disable mobile phone detection")
    max_phone_violations: int = Field(default=3, ge=1, le=10, description="Maximum phone violations before auto-termination")
    phone_persistence_threshold: float = Field(default=5.0, ge=1.0, le=30.0, description="Phone persistence threshold in seconds")
    phone_alerts_enabled: bool = Field(default=True, description="Enable or disable phone alerts")

    # 4. Object Detection
    object_detection_enabled: bool = Field(default=True, description="Enable or disable general object detection")
    object_confidence_threshold: float = Field(default=0.35, ge=0.1, le=1.0, description="Object confidence threshold")
    unknown_object_detection: bool = Field(default=True, description="Track and classify unknown/ambient objects")
    object_tracking_enabled: bool = Field(default=True, description="Enable temporal object tracking across frames")

    # 5. Alert Settings
    alerts_enabled: bool = Field(default=True, description="Master toggle for visual/audio alerts")
    distraction_alerts: bool = Field(default=True, description="Show alerts on distraction events")
    phone_alerts: bool = Field(default=True, description="Show alerts on phone detection")
    no_face_alerts: bool = Field(default=True, description="Show alerts when student face is absent")
    alert_cooldown: int = Field(default=10, ge=1, le=60, description="Cooldown between repeated alerts in seconds")

    # 6. Session Settings
    auto_end_phone_violations: bool = Field(default=True, description="Automatically end session after max violations")
    save_session_analytics: bool = Field(default=True, description="Persist session events and score history")
    show_session_summary: bool = Field(default=True, description="Display analytics summary upon completion")

    # 7. Privacy
    store_webcam_frames: bool = Field(default=False, description="Store raw webcam frame images on disk")
    store_raw_video: bool = Field(default=False, description="Store raw webcam video recordings")
    store_detection_metadata: bool = Field(default=True, description="Store lightweight detection coordinates & event logs")

    # 8. Display Preferences
    show_bounding_boxes: bool = Field(default=True, description="Render bounding boxes on live monitor")
    show_confidence: bool = Field(default=True, description="Render confidence percentages on labels")
    show_attention_score: bool = Field(default=True, description="Render real-time attention score gauge")
    show_event_timeline: bool = Field(default=True, description="Render real-time event log timeline")
