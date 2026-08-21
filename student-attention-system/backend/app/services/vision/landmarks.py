import os
import cv2
import numpy as np
import mediapipe as mp
from typing import Optional
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from app.utils.logger import logger

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "face_landmarker.task")

class LandmarkService:
    def __init__(self, min_detection_confidence: float = 0.5):
        self.landmarker = None
        if os.path.exists(MODEL_PATH):
            try:
                base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.IMAGE,
                    num_faces=1,
                    min_face_detection_confidence=min_detection_confidence,
                    min_face_presence_confidence=min_detection_confidence
                )
                self.landmarker = vision.FaceLandmarker.create_from_options(options)
            except Exception as e:
                logger.warning(f"Unable to initialize MediaPipe FaceLandmarker: {e}")

        # Landmark Indices for head pose and eyes
        self.NOSE_TIP = 1
        self.CHIN = 152
        self.LEFT_EYE_CORNER = 33
        self.RIGHT_EYE_CORNER = 263
        self.LEFT_MOUTH_CORNER = 61
        self.RIGHT_MOUTH_CORNER = 291

        # Eye indices for EAR calculation
        self.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

    def extract_landmarks(self, image_bgr: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract (468/478, 3) pixel coordinate landmarks for primary detected face.
        Returns None if no face detected.
        """
        if image_bgr is None or image_bgr.size == 0 or self.landmarker is None:
            return None

        try:
            h, w, _ = image_bgr.shape
            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            result = self.landmarker.detect(mp_image)

            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return None

            primary_face = result.face_landmarks[0]
            landmarks_px = []
            for lm in primary_face:
                landmarks_px.append([lm.x * w, lm.y * h, lm.z * w])

            return np.array(landmarks_px, dtype=np.float64)
        except Exception as e:
            logger.error(f"Landmark extraction error: {e}")
            return None

landmark_service = LandmarkService()
