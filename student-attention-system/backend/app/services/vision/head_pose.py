import cv2
import numpy as np
from typing import Tuple, Dict, Any
from app.config import settings
from app.utils.thresholds import (
    HEAD_DIR_CENTER, HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN, HEAD_DIR_UNKNOWN
)

class HeadPoseEstimator:
    def __init__(self, yaw_threshold: float = None, pitch_threshold: float = None):
        self.yaw_threshold = yaw_threshold if yaw_threshold is not None else settings.YAW_THRESHOLD
        self.pitch_threshold = pitch_threshold if pitch_threshold is not None else settings.PITCH_THRESHOLD

        # OpenCV standard 3D facial coordinate frame:
        # X: Right (+), Left (-)
        # Y: Down (+), Up (-)
        # Z: Forward from camera
        self.model_points_3d = np.array([
            (0.0, 0.0, 0.0),             # Nose tip (landmark 1)
            (0.0, 110.0, -30.0),         # Chin (landmark 152)
            (-70.0, -40.0, -30.0),       # Left eye outer corner (landmark 33)
            (70.0, -40.0, -30.0),        # Right eye outer corner (landmark 263)
            (-40.0, 50.0, -30.0),        # Left mouth corner (landmark 61)
            (40.0, 50.0, -30.0)          # Right mouth corner (landmark 291)
        ], dtype=np.float64)

    def estimate_pose(self, landmarks_px: np.ndarray, image_shape: Tuple[int, int]) -> Tuple[str, Dict[str, float]]:
        """
        Estimate head orientation from 2D facial landmarks.
        Returns (direction, {"yaw": yaw, "pitch": pitch, "roll": roll}).
        """
        if landmarks_px is None or len(landmarks_px) < 300:
            return HEAD_DIR_UNKNOWN, {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}

        h, w = image_shape

        # 2D image coordinates matching the 3D model points
        image_points_2d = np.array([
            landmarks_px[1][:2],    # Nose tip
            landmarks_px[152][:2],  # Chin
            landmarks_px[33][:2],   # Left eye corner
            landmarks_px[263][:2],  # Right eye corner
            landmarks_px[61][:2],   # Left mouth corner
            landmarks_px[291][:2]   # Right mouth corner
        ], dtype=np.float64)

        # Approximate camera focal length and optical center
        focal_length = float(w)
        center = (float(w) / 2.0, float(h) / 2.0)
        camera_matrix = np.array([
            [focal_length, 0.0, center[0]],
            [0.0, focal_length, center[1]],
            [0.0, 0.0, 1.0]
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        success, rvec, tvec = cv2.solvePnP(
            self.model_points_3d,
            image_points_2d,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return HEAD_DIR_UNKNOWN, {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}

        rmat, _ = cv2.Rodrigues(rvec)

        # Analytical Euler angles (Yaw, Pitch, Roll) in degrees
        yaw = float(np.degrees(np.arctan2(-rmat[2, 0], np.sqrt(rmat[2, 1]**2 + rmat[2, 2]**2))))
        pitch = float(np.degrees(np.arctan2(rmat[2, 1], rmat[2, 2])))
        roll = float(np.degrees(np.arctan2(rmat[1, 0], rmat[0, 0])))

        # Direction classification based on yaw and pitch
        direction = HEAD_DIR_CENTER
        if yaw > self.yaw_threshold:
            direction = HEAD_DIR_RIGHT
        elif yaw < -self.yaw_threshold:
            direction = HEAD_DIR_LEFT
        elif pitch > self.pitch_threshold:
            direction = HEAD_DIR_DOWN
        elif pitch < -self.pitch_threshold:
            direction = HEAD_DIR_UP

        return direction, {"yaw": round(yaw, 2), "pitch": round(pitch, 2), "roll": round(roll, 2)}

head_pose_estimator = HeadPoseEstimator()
