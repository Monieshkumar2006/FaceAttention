"""
Configurable vision and attention engine constants and thresholds.
"""
from app.config import settings

# ── Existing Face/Head/Eye Event Types ───────────────────────────────────────
EVENT_ATTENTIVE = "ATTENTIVE"
EVENT_LOOKING_LEFT = "LOOKING_LEFT"
EVENT_LOOKING_RIGHT = "LOOKING_RIGHT"
EVENT_LOOKING_UP = "LOOKING_UP"
EVENT_LOOKING_DOWN = "LOOKING_DOWN"
EVENT_POTENTIAL_DISTRACTION = "POTENTIAL_DISTRACTION"
EVENT_DISTRACTED = "DISTRACTED"
EVENT_POSSIBLE_DROWSINESS = "POSSIBLE_DROWSINESS"
EVENT_NO_FACE = "NO_FACE"
EVENT_MULTIPLE_FACES = "MULTIPLE_FACES"

# ── New Object Detection Event Types ─────────────────────────────────────────
EVENT_OBJECT_DETECTED = "OBJECT_DETECTED"
EVENT_PHONE_DETECTED = "PHONE_DETECTED"
EVENT_PHONE_PERSISTENT = "PHONE_PERSISTENT"
EVENT_ADDITIONAL_PERSON = "ADDITIONAL_PERSON"
EVENT_POTENTIAL_OBJECT_DISTRACTION = "POTENTIAL_OBJECT_DISTRACTION"
EVENT_POTENTIAL_PHONE_DISTRACTION = "POTENTIAL_PHONE_DISTRACTION"

# ── Severities ────────────────────────────────────────────────────────────────
SEVERITY_INFO = "INFO"
SEVERITY_LOW = "LOW"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_HIGH = "HIGH"

EVENT_SEVERITY_MAP = {
    # Existing
    EVENT_ATTENTIVE: SEVERITY_INFO,
    EVENT_LOOKING_LEFT: SEVERITY_LOW,
    EVENT_LOOKING_RIGHT: SEVERITY_LOW,
    EVENT_LOOKING_UP: SEVERITY_LOW,
    EVENT_LOOKING_DOWN: SEVERITY_LOW,
    EVENT_POTENTIAL_DISTRACTION: SEVERITY_MEDIUM,
    EVENT_DISTRACTED: SEVERITY_HIGH,
    EVENT_POSSIBLE_DROWSINESS: SEVERITY_MEDIUM,
    EVENT_NO_FACE: SEVERITY_HIGH,
    EVENT_MULTIPLE_FACES: SEVERITY_HIGH,
    # New object events
    EVENT_OBJECT_DETECTED: SEVERITY_INFO,
    EVENT_PHONE_DETECTED: SEVERITY_LOW,
    EVENT_PHONE_PERSISTENT: SEVERITY_MEDIUM,
    EVENT_ADDITIONAL_PERSON: SEVERITY_MEDIUM,
    EVENT_POTENTIAL_OBJECT_DISTRACTION: SEVERITY_MEDIUM,
    EVENT_POTENTIAL_PHONE_DISTRACTION: SEVERITY_HIGH,
}

# ── Head Directions ───────────────────────────────────────────────────────────
HEAD_DIR_CENTER = "CENTER"
HEAD_DIR_LEFT = "LEFT"
HEAD_DIR_RIGHT = "RIGHT"
HEAD_DIR_UP = "UP"
HEAD_DIR_DOWN = "DOWN"
HEAD_DIR_UNKNOWN = "UNKNOWN"

# ── Eye States ────────────────────────────────────────────────────────────────
EYE_OPEN = "OPEN"
EYE_CLOSED = "CLOSED"
EYE_UNKNOWN = "UNKNOWN"

# ── Session Statuses ──────────────────────────────────────────────────────────
SESSION_CREATED = "CREATED"
SESSION_RUNNING = "RUNNING"
SESSION_PAUSED = "PAUSED"
SESSION_COMPLETED = "COMPLETED"

# ── Object Classification (configurable sets) ─────────────────────────────────
# Objects considered study-related (typically not a distraction)
STUDY_RELATED_OBJECTS: set = {
    "book", "laptop", "keyboard", "mouse", "diningtable", "paper", "document"
}

# Objects that may indicate potential distraction (context-dependent)
POTENTIAL_DISTRACTION_OBJECTS: set = {
    "cell phone", "person"
}

# Environmental / neutral objects (present but not diagnostic)
ENVIRONMENTAL_OBJECTS: set = {
    "bottle", "cup", "headphones", "chair", "sofa",
    "pottedplant", "tvmonitor"
}

# Convenience: all objects we care about reporting
ALL_TRACKED_OBJECTS: set = (
    STUDY_RELATED_OBJECTS | POTENTIAL_DISTRACTION_OBJECTS | ENVIRONMENTAL_OBJECTS
)

