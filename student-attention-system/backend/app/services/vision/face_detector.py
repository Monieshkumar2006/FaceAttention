import os
import cv2
import numpy as np
import mediapipe as mp
from typing import Tuple, List, Dict, Any
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from app.utils.logger import logger

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "face_landmarker.task")

class FaceDetectorService:
    def __init__(self, min_detection_confidence: float = 0.5):
        self.landmarker = None
        if os.path.exists(MODEL_PATH):
            try:
                base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.IMAGE,
                    num_faces=4, # Detect up to 4 faces to identify MULTIPLE_FACES state
                    min_face_detection_confidence=min_detection_confidence,
                    min_face_presence_confidence=min_detection_confidence
                )
                self.landmarker = vision.FaceLandmarker.create_from_options(options)
            except Exception as e:
                logger.warning(f"Unable to initialize MediaPipe FaceLandmarker: {e}")

    def detect_faces(self, image_bgr: np.ndarray) -> Tuple[int, List[Dict[str, Any]]]:
        """
        Detect faces in a BGR OpenCV image.
        Returns (face_count, bounding_boxes).
        """
        if image_bgr is None or image_bgr.size == 0 or self.landmarker is None:
            return 0, []

        try:
            h, w, _ = image_bgr.shape
            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            result = self.landmarker.detect(mp_image)

            face_count = len(result.face_landmarks) if result.face_landmarks else 0
            detections = []
            for face in result.face_landmarks:
                xs = [lm.x * w for lm in face]
                ys = [lm.y * h for lm in face]
                xmin, xmax = int(min(xs)), int(max(xs))
                ymin, ymax = int(min(ys)), int(max(ys))
                detections.append({
                    "score": 0.95,
                    "xmin": max(0, xmin),
                    "ymin": max(0, ymin),
                    "width": max(1, xmax - xmin),
                    "height": max(1, ymax - ymin)
                })

            return face_count, detections
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return 0, []

face_detector = FaceDetectorService()
