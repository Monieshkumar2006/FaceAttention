import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
from app.config import settings
from app.utils.thresholds import (
    EVENT_ATTENTIVE, EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT,
    EVENT_LOOKING_UP, EVENT_LOOKING_DOWN, EVENT_POTENTIAL_DISTRACTION,
    EVENT_DISTRACTED, EVENT_POSSIBLE_DROWSINESS, EVENT_NO_FACE,
    EVENT_MULTIPLE_FACES, EVENT_SEVERITY_MAP,
    EVENT_OBJECT_DETECTED, EVENT_PHONE_DETECTED, EVENT_PHONE_PERSISTENT,
    EVENT_ADDITIONAL_PERSON, EVENT_POTENTIAL_OBJECT_DISTRACTION,
    EVENT_POTENTIAL_PHONE_DISTRACTION,
    HEAD_DIR_CENTER, HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN,
    EYE_OPEN, EYE_CLOSED,
    STUDY_RELATED_OBJECTS, POTENTIAL_DISTRACTION_OBJECTS, ENVIRONMENTAL_OBJECTS
)
from app.utils.logger import logger

class TemporalDistractionEngine:
    def __init__(self):
        self.look_away_threshold = settings.LOOK_AWAY_THRESHOLD_SECONDS
        self.distraction_threshold = settings.DISTRACTION_THRESHOLD_SECONDS
        self.no_face_threshold = settings.NO_FACE_THRESHOLD_SECONDS
        self.drowsiness_threshold = settings.PROLONGED_EYE_CLOSURE_SECONDS
        self.multiple_faces_threshold = settings.MULTIPLE_FACES_THRESHOLD_SECONDS
        self.phone_persistence_threshold = settings.PHONE_PERSISTENCE_THRESHOLD_SECONDS

        # Session tracking state for faces/gaze
        self.current_candidate_state = EVENT_ATTENTIVE
        self.candidate_start_time: Optional[float] = None
        self.current_qualified_status = EVENT_ATTENTIVE
        
        # Track promoted events per unique object ID to avoid duplicate firings
        # Format: { object_id: { event_type: bool } }
        self.promoted_object_events: Dict[str, Dict[str, bool]] = {}

        # Cumulative duration trackers (in seconds)
        self.durations = {
            "attentive": 0.0,
            "distraction": 0.0,
            "looking_away": 0.0,
            "no_face": 0.0,
            "drowsiness": 0.0,
            "multiple_faces": 0.0,
        }

        self.last_update_time: Optional[float] = None

    def reset(self):
        """Reset temporal state machine for a new or restarted session."""
        self.current_candidate_state = EVENT_ATTENTIVE
        self.candidate_start_time = None
        self.current_qualified_status = EVENT_ATTENTIVE
        self.last_update_time = None
        self.promoted_object_events.clear()
        for k in self.durations:
            self.durations[k] = 0.0

    def process_frame_observation(
        self,
        face_count: int,
        head_direction: str,
        eye_state: str,
        active_objects: Optional[List[Dict[str, Any]]] = None,
        current_time: Optional[float] = None
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Process single-frame visual observations along with active tracked objects.
        Returns (current_qualified_status, qualified_event_dict_if_promoted).
        """
        now = current_time if current_time is not None else time.time()
        if self.last_update_time is None:
            self.last_update_time = now
            self.candidate_start_time = now

        dt = max(0.0, now - self.last_update_time)
        self.last_update_time = now

        # ── 1. Determine raw candidate face-based frame state ─────────────────
        raw_state = EVENT_ATTENTIVE
        if face_count == 0:
            raw_state = EVENT_NO_FACE
        elif face_count > 1:
            raw_state = EVENT_MULTIPLE_FACES
        elif eye_state == EYE_CLOSED:
            raw_state = EVENT_POSSIBLE_DROWSINESS
        elif head_direction == HEAD_DIR_LEFT:
            raw_state = EVENT_LOOKING_LEFT
        elif head_direction == HEAD_DIR_RIGHT:
            raw_state = EVENT_LOOKING_RIGHT
        elif head_direction == HEAD_DIR_UP:
            raw_state = EVENT_LOOKING_UP
        elif head_direction == HEAD_DIR_DOWN:
            raw_state = EVENT_LOOKING_DOWN
        else:
            raw_state = EVENT_ATTENTIVE

        # ── 2. Check candidate face state transition ──────────────────────────
        if raw_state != self.current_candidate_state:
            self.current_candidate_state = raw_state
            self.candidate_start_time = now

        ref_start = self.candidate_start_time if self.candidate_start_time is not None else now
        candidate_elapsed = max(0.0, now - ref_start)
        promoted_event = None
        face_qualified_status = self.current_qualified_status

        # ── 3. Apply Temporal Qualification Thresholds for Face events ─────────
        if self.current_candidate_state == EVENT_ATTENTIVE:
            face_qualified_status = EVENT_ATTENTIVE

        elif self.current_candidate_state == EVENT_NO_FACE:
            if candidate_elapsed >= self.no_face_threshold:
                face_qualified_status = EVENT_NO_FACE
                if self.current_qualified_status != EVENT_NO_FACE:
                    promoted_event = {
                        "event_type": EVENT_NO_FACE,
                        "duration": round(candidate_elapsed, 2),
                        "severity": EVENT_SEVERITY_MAP[EVENT_NO_FACE],
                        "confidence": 0.95
                    }
            else:
                face_qualified_status = self.current_qualified_status

        elif self.current_candidate_state == EVENT_MULTIPLE_FACES:
            if candidate_elapsed >= self.multiple_faces_threshold:
                face_qualified_status = EVENT_MULTIPLE_FACES
                if self.current_qualified_status != EVENT_MULTIPLE_FACES:
                    promoted_event = {
                        "event_type": EVENT_MULTIPLE_FACES,
                        "duration": round(candidate_elapsed, 2),
                        "severity": EVENT_SEVERITY_MAP[EVENT_MULTIPLE_FACES],
                        "confidence": 0.90
                    }
            else:
                face_qualified_status = self.current_qualified_status

        elif self.current_candidate_state == EVENT_POSSIBLE_DROWSINESS:
            if candidate_elapsed >= self.drowsiness_threshold:
                face_qualified_status = EVENT_POSSIBLE_DROWSINESS
                if self.current_qualified_status != EVENT_POSSIBLE_DROWSINESS:
                    promoted_event = {
                        "event_type": EVENT_POSSIBLE_DROWSINESS,
                        "duration": round(candidate_elapsed, 2),
                        "severity": EVENT_SEVERITY_MAP[EVENT_POSSIBLE_DROWSINESS],
                        "confidence": 0.88
                    }
            else:
                face_qualified_status = self.current_qualified_status

        elif self.current_candidate_state in (EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN):
            if candidate_elapsed >= self.distraction_threshold:
                face_qualified_status = EVENT_DISTRACTED
                if self.current_qualified_status != EVENT_DISTRACTED:
                    promoted_event = {
                        "event_type": EVENT_DISTRACTED,
                        "duration": round(candidate_elapsed, 2),
                        "severity": EVENT_SEVERITY_MAP[EVENT_DISTRACTED],
                        "confidence": 0.92
                    }
            elif candidate_elapsed >= self.look_away_threshold:
                face_qualified_status = EVENT_POTENTIAL_DISTRACTION
                if self.current_qualified_status != EVENT_POTENTIAL_DISTRACTION:
                    promoted_event = {
                        "event_type": EVENT_POTENTIAL_DISTRACTION,
                        "duration": round(candidate_elapsed, 2),
                        "severity": EVENT_SEVERITY_MAP[EVENT_POTENTIAL_DISTRACTION],
                        "confidence": 0.85
                    }
            else:
                face_qualified_status = self.current_candidate_state

        # ── 4. Process Objects Correlation ────────────────────────────────────
        status = face_qualified_status
        
        # Track active object IDs to clean up expired ones
        active_ids = set()
        
        if active_objects:
            for obj in active_objects:
                obj_id = obj["object_id"]
                class_name = obj["class_name"]
                duration = obj["duration"]
                confidence = obj["confidence"]
                bbox = obj["bbox"]
                active_ids.add(obj_id)

                if obj_id not in self.promoted_object_events:
                    self.promoted_object_events[obj_id] = {}

                promoted = self.promoted_object_events[obj_id]

                # A. Cell Phone Detection (Highest Priority)
                if class_name == "cell phone":
                    # Check persistent or looking away with phone
                    if duration >= self.phone_persistence_threshold:
                        if head_direction in (HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN):
                            if EVENT_POTENTIAL_PHONE_DISTRACTION not in promoted:
                                promoted[EVENT_POTENTIAL_PHONE_DISTRACTION] = True
                                promoted_event = {
                                    "event_type": EVENT_POTENTIAL_PHONE_DISTRACTION,
                                    "duration": duration,
                                    "confidence": confidence,
                                    "severity": EVENT_SEVERITY_MAP[EVENT_POTENTIAL_PHONE_DISTRACTION],
                                    "object_id": obj_id,
                                    "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                                }
                            status = EVENT_POTENTIAL_PHONE_DISTRACTION
                        else:
                            if EVENT_PHONE_PERSISTENT not in promoted:
                                promoted[EVENT_PHONE_PERSISTENT] = True
                                promoted_event = {
                                    "event_type": EVENT_PHONE_PERSISTENT,
                                    "duration": duration,
                                    "confidence": confidence,
                                    "severity": EVENT_SEVERITY_MAP[EVENT_PHONE_PERSISTENT],
                                    "object_id": obj_id,
                                    "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                                }
                            status = EVENT_PHONE_PERSISTENT
                    else:
                        # Initial phone detection
                        if EVENT_PHONE_DETECTED not in promoted:
                            promoted[EVENT_PHONE_DETECTED] = True
                            promoted_event = {
                                "event_type": EVENT_PHONE_DETECTED,
                                "duration": duration,
                                "confidence": confidence,
                                "severity": EVENT_SEVERITY_MAP[EVENT_PHONE_DETECTED],
                                "object_id": obj_id,
                                "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                            }
                        if head_direction in (HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN):
                            status = EVENT_POTENTIAL_PHONE_DISTRACTION
                        else:
                            status = EVENT_PHONE_DETECTED

                # B. Additional Person Detection
                elif class_name == "person":
                    if face_count >= 2 or len([o for o in active_objects if o["class_name"] == "person"]) >= 2:
                        if EVENT_ADDITIONAL_PERSON not in promoted:
                            promoted[EVENT_ADDITIONAL_PERSON] = True
                            if promoted_event is None:
                                promoted_event = {
                                    "event_type": EVENT_ADDITIONAL_PERSON,
                                    "duration": duration,
                                    "confidence": confidence,
                                    "severity": EVENT_SEVERITY_MAP[EVENT_ADDITIONAL_PERSON],
                                    "object_id": obj_id,
                                    "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                                }
                            if status in (EVENT_ATTENTIVE, EVENT_MULTIPLE_FACES):
                                status = EVENT_ADDITIONAL_PERSON

                # C. Potential generic object distraction
                elif class_name in POTENTIAL_DISTRACTION_OBJECTS:
                    if duration >= self.phone_persistence_threshold:
                        if head_direction in (HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN):
                            if EVENT_POTENTIAL_OBJECT_DISTRACTION not in promoted:
                                promoted[EVENT_POTENTIAL_OBJECT_DISTRACTION] = True
                                if promoted_event is None:
                                    promoted_event = {
                                        "event_type": EVENT_POTENTIAL_OBJECT_DISTRACTION,
                                        "duration": duration,
                                        "confidence": confidence,
                                        "severity": EVENT_SEVERITY_MAP[EVENT_POTENTIAL_OBJECT_DISTRACTION],
                                        "object_id": obj_id,
                                        "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                                    }
                            status = EVENT_POTENTIAL_OBJECT_DISTRACTION

                # D. General Object First-Seen Notification
                else:
                    if EVENT_OBJECT_DETECTED not in promoted:
                        promoted[EVENT_OBJECT_DETECTED] = True
                        if promoted_event is None:
                            promoted_event = {
                                "event_type": EVENT_OBJECT_DETECTED,
                                "duration": duration,
                                "confidence": confidence,
                                "severity": EVENT_SEVERITY_MAP[EVENT_OBJECT_DETECTED],
                                "object_id": obj_id,
                                "x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]
                            }

        # ── 5. Clean up expired object tracking histories ──────────────────────
        expired_ids = [oid for oid in self.promoted_object_events if oid not in active_ids]
        for oid in expired_ids:
            del self.promoted_object_events[oid]

        # ── 6. Accumulate cumulative durations ────────────────────────────────
        if status == EVENT_ATTENTIVE:
            self.durations["attentive"] += dt
        elif status in (EVENT_DISTRACTED, EVENT_POTENTIAL_PHONE_DISTRACTION):
            self.durations["distraction"] += dt
        elif status in (EVENT_POTENTIAL_DISTRACTION, EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN, EVENT_PHONE_DETECTED, EVENT_PHONE_PERSISTENT, EVENT_POTENTIAL_OBJECT_DISTRACTION):
            self.durations["looking_away"] += dt
        elif status == EVENT_NO_FACE:
            self.durations["no_face"] += dt
        elif status == EVENT_POSSIBLE_DROWSINESS:
            self.durations["drowsiness"] += dt
        elif status in (EVENT_MULTIPLE_FACES, EVENT_ADDITIONAL_PERSON):
            self.durations["multiple_faces"] += dt

        self.current_qualified_status = status
        return status, promoted_event
