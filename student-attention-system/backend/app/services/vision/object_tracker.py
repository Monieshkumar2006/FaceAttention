"""
Object Tracker Service — IoU-based simple tracker.

Prevents the same physical object from generating a new event every frame.
Tracks objects across frames by computing Intersection-over-Union (IoU)
between consecutive detections. No external tracking library required.
"""
import time
import uuid
from typing import List, Dict, Any, Optional
from app.utils.logger import logger

# Minimum IoU to consider two detections as the same object
_IOU_THRESHOLD = 0.30
# Seconds without a detection before a tracked object is considered gone
_DISAPPEAR_TIMEOUT = 2.0


def _compute_iou(bbox_a: List[int], bbox_b: List[int]) -> float:
    """
    Compute Intersection-over-Union between two bounding boxes.
    Boxes are [x1, y1, x2, y2].
    """
    ax1, ay1, ax2, ay2 = bbox_a
    bx1, by1, bx2, by2 = bbox_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union_area = area_a + area_b - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


class TrackedObject:
    """Represents a single persistent tracked object across frames."""

    def __init__(self, class_name: str, confidence: float, bbox: List[int], ts: float):
        self.object_id: str = f"obj_{uuid.uuid4().hex[:6]}"
        self.class_name: str = class_name
        self.confidence: float = confidence
        self.bbox: List[int] = bbox
        self.first_seen: float = ts
        self.last_seen: float = ts

    @property
    def duration(self) -> float:
        return round(self.last_seen - self.first_seen, 2)

    def update(self, confidence: float, bbox: List[int], ts: float):
        """Update with a new matched detection."""
        self.confidence = confidence
        self.bbox = bbox
        self.last_seen = ts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "object_id": self.object_id,
            "class_name": self.class_name,
            "confidence": round(self.confidence, 4),
            "bbox": self.bbox,
            "bounding_box": self.bbox,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "duration": self.duration,
        }
class ObjectTracker:
    """
    Session-scoped object tracker.

    One ObjectTracker instance per monitoring session. Each frame's raw
    detections are passed to update(); the tracker matches them to existing
    tracked objects by class + IoU, updating durations in-place.
    """

    def __init__(self):
        self._objects: Dict[str, TrackedObject] = {}  # object_id -> TrackedObject

    def update(
        self, detections: List[Dict[str, Any]], current_time: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Update tracker with a new batch of raw detections.

        Args:
            detections: List of detection dicts from ObjectDetectorService.detect()
            current_time: Current epoch time (uses time.time() if None)

        Returns:
            List of active tracked object dicts (after matching and timeout cleanup).
        """
        now = current_time if current_time is not None else time.time()

        # ── 1. Match new detections to existing tracked objects ───────────────
        matched_ids: set = set()
        unmatched_detections: List[Dict[str, Any]] = []

        for det in detections:
            best_iou = 0.0
            best_id: Optional[str] = None

            for obj_id, tracked in self._objects.items():
                if tracked.class_name != det["class_name"]:
                    continue  # Must be same class to match
                iou = _compute_iou(tracked.bbox, det["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_id = obj_id

            if best_id and best_iou >= _IOU_THRESHOLD:
                self._objects[best_id].update(det["confidence"], det["bbox"], now)
                matched_ids.add(best_id)
            else:
                unmatched_detections.append(det)

        # ── 2. Create new tracked objects for unmatched detections ───────────
        for det in unmatched_detections:
            new_obj = TrackedObject(
                class_name=det["class_name"],
                confidence=det["confidence"],
                bbox=det["bbox"],
                ts=now,
            )
            self._objects[new_obj.object_id] = new_obj

        # ── 3. Remove objects not seen within the timeout window ─────────────
        expired = [
            obj_id
            for obj_id, tracked in self._objects.items()
            if (now - tracked.last_seen) > _DISAPPEAR_TIMEOUT
        ]
        for obj_id in expired:
            del self._objects[obj_id]

        return self.get_active_objects(now)

    def get_active_objects(self, current_time: Optional[float] = None) -> List[Dict[str, Any]]:
        """Return all currently active tracked objects as dicts."""
        now = current_time if current_time is not None else time.time()
        active = []
        for tracked in self._objects.values():
            if (now - tracked.last_seen) <= _DISAPPEAR_TIMEOUT:
                active.append(tracked.to_dict())
        return active

    def reset(self):
        """Clear all tracked objects (e.g. when session resets)."""
        self._objects.clear()

    def get_object_duration(self, class_name: str) -> float:
        """Return the longest current duration for any tracked object of a given class."""
        durations = [
            obj.duration
            for obj in self._objects.values()
            if obj.class_name == class_name
        ]
        return max(durations) if durations else 0.0

    def has_class(self, class_name: str) -> bool:
        """Return True if at least one active tracked object has the given class."""
        return any(obj.class_name == class_name for obj in self._objects.values())
