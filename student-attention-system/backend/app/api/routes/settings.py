from fastapi import APIRouter, HTTPException, status
from app.config import settings
from app.schemas.settings import SystemSettingsSchema
from app.services.vision.object_detector import get_object_detector
from app.utils.logger import logger

router = APIRouter(prefix="/settings", tags=["Settings"])

# In-memory settings state initialized from default settings values
_current_settings = SystemSettingsSchema(
    face_confidence=0.50,
    object_confidence=getattr(settings, "OBJECT_CONFIDENCE_THRESHOLD", 0.35),
    eye_sensitivity=getattr(settings, "EAR_THRESHOLD", 0.21),
    head_pose_sensitivity=getattr(settings, "YAW_THRESHOLD", 22.0),
    distraction_persistence=getattr(settings, "DISTRACTION_THRESHOLD_SECONDS", 5.0),
    look_away_threshold=getattr(settings, "LOOK_AWAY_THRESHOLD_SECONDS", 2.0),
    no_face_threshold=getattr(settings, "NO_FACE_THRESHOLD_SECONDS", 3.0),
    phone_detection_enabled=True,
    max_phone_violations=getattr(settings, "MAX_PHONE_VIOLATIONS", 3),
    phone_persistence_threshold=getattr(settings, "PHONE_PERSISTENCE_THRESHOLD_SECONDS", 5.0),
    phone_alerts_enabled=True,
    object_detection_enabled=True,
    object_confidence_threshold=getattr(settings, "OBJECT_CONFIDENCE_THRESHOLD", 0.35),
    unknown_object_detection=True,
    object_tracking_enabled=True,
    alerts_enabled=True,
    distraction_alerts=True,
    phone_alerts=True,
    no_face_alerts=True,
    alert_cooldown=getattr(settings, "ALERT_COOLDOWN_SECONDS", 10),
    auto_end_phone_violations=True,
    save_session_analytics=True,
    show_session_summary=True,
    store_webcam_frames=False,
    store_raw_video=False,
    store_detection_metadata=True,
    show_bounding_boxes=True,
    show_confidence=True,
    show_attention_score=True,
    show_event_timeline=True,
)


@router.get("", response_model=SystemSettingsSchema)
def get_settings():
    """Retrieve current system configuration and monitoring preferences."""
    return _current_settings


@router.patch("", response_model=SystemSettingsSchema)
def update_settings(payload: SystemSettingsSchema):
    """Update system settings and synchronize thresholds with backend engines."""
    global _current_settings
    _current_settings = payload

    # Sync with global config / vision service
    try:
        settings.OBJECT_CONFIDENCE_THRESHOLD = payload.object_confidence_threshold
        settings.MAX_PHONE_VIOLATIONS = payload.max_phone_violations
        settings.DISTRACTION_THRESHOLD_SECONDS = payload.distraction_persistence
        settings.LOOK_AWAY_THRESHOLD_SECONDS = payload.look_away_threshold
        settings.NO_FACE_THRESHOLD_SECONDS = payload.no_face_threshold
        settings.PHONE_PERSISTENCE_THRESHOLD_SECONDS = payload.phone_persistence_threshold

        # Update detector confidence threshold
        detector = get_object_detector()
        detector.confidence_threshold = payload.object_confidence_threshold

        logger.info("[Settings] Successfully updated and synchronized system settings.")
    except Exception as e:
        logger.warning(f"[Settings] Error synchronizing settings to runtime services: {e}")

    return _current_settings


@router.post("/reset", response_model=SystemSettingsSchema)
def reset_settings():
    """Reset all settings to system default values."""
    global _current_settings
    _current_settings = SystemSettingsSchema()

    # Sync defaults
    try:
        settings.OBJECT_CONFIDENCE_THRESHOLD = 0.35
        settings.MAX_PHONE_VIOLATIONS = 3
        detector = get_object_detector()
        detector.confidence_threshold = 0.35
        logger.info("[Settings] Reset system settings to defaults.")
    except Exception as e:
        logger.warning(f"[Settings] Error resetting runtime services: {e}")

    return _current_settings
