import numpy as np
from typing import Tuple, Dict, Any
from app.config import settings
from app.utils.thresholds import EYE_OPEN, EYE_CLOSED, EYE_UNKNOWN

class EyeStateAnalyzer:
    def __init__(self, ear_threshold: float = None):
        self.ear_threshold = ear_threshold if ear_threshold is not None else settings.EAR_THRESHOLD

        # Landmark indices
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]

    def _calculate_ear(self, eye_points: np.ndarray) -> float:
        """
        Calculate Eye Aspect Ratio (EAR) for a 6-point eye polygon.
        eye_points shape: (6, 2 or 3)
        """
        p1, p2, p3, p4, p5, p6 = eye_points[:, :2]

        # Vertical distances
        dist_v1 = np.linalg.norm(p2 - p6)
        dist_v2 = np.linalg.norm(p3 - p5)

        # Horizontal distance
        dist_h = np.linalg.norm(p1 - p4)

        if dist_h < 1e-6:
            return 0.0

        ear = (dist_v1 + dist_v2) / (2.0 * dist_h)
        return float(ear)

    def analyze_eyes(self, landmarks_px: np.ndarray) -> Tuple[str, Dict[str, float]]:
        """
        Compute EAR for left and right eyes and classify state.
        Returns (state, {"left_ear": float, "right_ear": float, "avg_ear": float}).
        """
        if landmarks_px is None or len(landmarks_px) < 400:
            return EYE_UNKNOWN, {"left_ear": 0.0, "right_ear": 0.0, "avg_ear": 0.0}

        left_pts = landmarks_px[self.LEFT_EYE]
        right_pts = landmarks_px[self.RIGHT_EYE]

        left_ear = self._calculate_ear(left_pts)
        right_ear = self._calculate_ear(right_pts)
        avg_ear = (left_ear + right_ear) / 2.0

        state = EYE_CLOSED if avg_ear < self.ear_threshold else EYE_OPEN

        return state, {
            "left_ear": round(left_ear, 3),
            "right_ear": round(right_ear, 3),
            "avg_ear": round(avg_ear, 3)
        }

eye_state_analyzer = EyeStateAnalyzer()
