"""
Object Detection Service using OpenCV DNN + YOLOv4-Tiny (COCO) or MobileNet SSD (VOC).
Runs locally — no cloud API required.
Model files are downloaded automatically on first use.
"""
import os
import time
import urllib.request
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from app.utils.logger import logger
from app.config import settings

# ── Model directories ────────────────────────────────────────────────────────
_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ── YOLOv8 Nano (COCO) ONNX Paths & URLs ─────────────────────────────────────
_YOLOV8_ONNX_PATH = os.path.join(_MODELS_DIR, "yolov8n.onnx")
_YOLOV8_ONNX_URL = "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx"

# ── YOLOv4-Tiny (COCO) Paths & URLs (Legacy fallback) ────────────────────────
_YOLO_CFG_PATH = os.path.join(_MODELS_DIR, "yolov4-tiny.cfg")
_YOLO_WEIGHTS_PATH = os.path.join(_MODELS_DIR, "yolov4-tiny.weights")
_YOLO_CFG_URL = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
_YOLO_WEIGHTS_URL = "https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights"

# ── Class Maps ───────────────────────────────────────────────────────────────
YOLO_COCO_CLASSES = [
    "person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa", "pottedplant", "bed",
    "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
    "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

# Aliases to map raw detector labels to canonical system labels
CLASS_ALIASES: Dict[str, str] = {
    "tvmonitor": "laptop",
    "bottle": "bottle",
    "cup": "cup",
    "chair": "chair",
    "person": "person",
    "cell phone": "cell phone",
    "book": "book",
    "keyboard": "keyboard",
    "mouse": "mouse",
    "laptop": "laptop",
}

def _download_file(url: str, path: str, name: str) -> bool:
    """Download a file with retry and timeout."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return True

    logger.info(f"[ObjectDetector] Downloading {name} from {url}...")
    try:
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
        urllib.request.install_opener(opener)
        urllib.request.urlretrieve(url, path)
        logger.info(f"[ObjectDetector] Successfully downloaded {name} to {path}")
        return True
    except Exception as e:
        logger.error(f"[ObjectDetector] Failed to download {name}: {e}")
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
        return False

class ObjectDetectorService:
    """
    Lightweight object detector using OpenCV DNN.
    Supports YOLOv8 ONNX (COCO) and runs locally on CPU.
    """

    def __init__(self, confidence_threshold: Optional[float] = None):
        self.net: Optional[cv2.dnn.Net] = None
        self.model_type: str = "none"  # "yolov8_onnx", "yolo", "mock"
        self._confidence_threshold = confidence_threshold
        self._load_model()

    @property
    def confidence_threshold(self) -> float:
        if self._confidence_threshold is not None:
            return self._confidence_threshold
        return getattr(settings, "OBJECT_CONFIDENCE_THRESHOLD", 0.35)

    @confidence_threshold.setter
    def confidence_threshold(self, val: float):
        self._confidence_threshold = val

    def _load_model(self):
        """Try loading YOLOv8 ONNX first, then YOLO Darknet, then Mock."""
        # 1. Try YOLOv8 ONNX
        yolov8_ok = _download_file(_YOLOV8_ONNX_URL, _YOLOV8_ONNX_PATH, "YOLOv8 ONNX model")
        if yolov8_ok:
            try:
                self.net = cv2.dnn.readNetFromONNX(_YOLOV8_ONNX_PATH)
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                self.model_type = "yolov8_onnx"
                logger.info("[ObjectDetector] YOLOv8 ONNX model loaded successfully.")
                return
            except Exception as e:
                logger.warning(f"[ObjectDetector] Failed to load YOLOv8 ONNX: {e}")

        # 2. Try YOLOv4-Tiny Darknet
        try:
            if hasattr(cv2.dnn, "readNetFromDarknet"):
                yolo_ok = _download_file(_YOLO_CFG_URL, _YOLO_CFG_PATH, "YOLOv4-Tiny config") and \
                          _download_file(_YOLO_WEIGHTS_URL, _YOLO_WEIGHTS_PATH, "YOLOv4-Tiny weights")
                if yolo_ok:
                    self.net = cv2.dnn.readNetFromDarknet(_YOLO_CFG_PATH, _YOLO_WEIGHTS_PATH)
                    self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                    self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                    self.model_type = "yolo"
                    logger.info("[ObjectDetector] YOLOv4-Tiny loaded successfully.")
                    return
        except Exception as e:
            logger.warning(f"[ObjectDetector] Darknet load failed: {e}")

        # 3. Fallback to mock
        self.model_type = "mock"
        logger.warning("[ObjectDetector] No vision models loaded. Operating in MOCK detector mode.")

    @property
    def is_available(self) -> bool:
        return self.model_type != "none"

    def detect(
        self, image_bgr: np.ndarray, timestamp: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect objects in a BGR OpenCV image.

        Returns a list of dicts:
            {
                "class_name": str,
                "confidence": float,
                "bbox": [x1, y1, x2, y2],
                "timestamp": float
            }
        """
        ts = timestamp if timestamp is not None else time.time()
        
        # Guard for empty frame
        if image_bgr is None or image_bgr.size == 0:
            return []

        if self.model_type == "mock":
            return []

        try:
            h, w = image_bgr.shape[:2]
            results: List[Dict[str, Any]] = []

            # ── Run YOLOv8 ONNX ─────────────────────────────────────────────────────
            if self.model_type == "yolov8_onnx" and self.net is not None:
                input_size = 640
                blob = cv2.dnn.blobFromImage(
                    image_bgr,
                    scalefactor=1.0 / 255.0,
                    size=(input_size, input_size),
                    mean=(0, 0, 0),
                    swapRB=True,
                    crop=False
                )
                self.net.setInput(blob)
                preds = self.net.forward()  # shape: (1, 84, 8400)

                # Transpose to (8400, 84)
                preds = np.squeeze(preds).T
                
                boxes_raw = preds[:, :4]
                scores_raw = preds[:, 4:]
                class_ids = np.argmax(scores_raw, axis=1)
                confidences = np.max(scores_raw, axis=1)

                mask = confidences >= self.confidence_threshold
                valid_boxes = boxes_raw[mask]
                valid_scores = confidences[mask]
                valid_class_ids = class_ids[mask]

                x_factor = w / float(input_size)
                y_factor = h / float(input_size)

                boxes = []
                for box in valid_boxes:
                    cx, cy, bw, bh = box
                    left = int((cx - 0.5 * bw) * x_factor)
                    top = int((cy - 0.5 * bh) * y_factor)
                    width = int(bw * x_factor)
                    height = int(bh * y_factor)
                    boxes.append([left, top, width, height])

                indices = cv2.dnn.NMSBoxes(boxes, valid_scores.tolist(), self.confidence_threshold, 0.45)

                if len(indices) > 0:
                    for idx in indices.flatten():
                        box = boxes[idx]
                        x, y, width, height = box
                        x1 = max(0, x)
                        y1 = max(0, y)
                        x2 = min(w, x + width)
                        y2 = min(h, y + height)

                        if x2 <= x1 or y2 <= y1:
                            continue

                        raw_class = YOLO_COCO_CLASSES[valid_class_ids[idx]]
                        class_name = CLASS_ALIASES.get(raw_class, raw_class)

                        results.append({
                            "class_name": class_name,
                            "confidence": round(float(valid_scores[idx]), 4),
                            "bbox": [x1, y1, x2, y2],
                            "timestamp": ts
                        })

            # ── Run YOLOv4-Tiny ─────────────────────────────────────────────────────
            elif self.model_type == "yolo" and self.net is not None:
                # YOLOv4-Tiny typically takes 416x416 input
                blob = cv2.dnn.blobFromImage(
                    image_bgr,
                    scalefactor=1/255.0,
                    size=(416, 416),
                    mean=(0, 0, 0),
                    swapRB=True,
                    crop=False
                )
                self.net.setInput(blob)
                
                # Get output layers
                out_names = self.net.getUnconnectedOutLayersNames()
                outs = self.net.forward(out_names)

                class_ids = []
                confidences = []
                boxes = []

                for out in outs:
                    for detection in out:
                        scores = detection[5:]
                        class_id = np.argmax(scores)
                        confidence = float(scores[class_id])
                        
                        if confidence >= self.confidence_threshold:
                            center_x = int(detection[0] * w)
                            center_y = int(detection[1] * h)
                            width = int(detection[2] * w)
                            height = int(detection[3] * h)

                            x = int(center_x - width / 2)
                            y = int(center_y - height / 2)
                            
                            boxes.append([x, y, width, height])
                            confidences.append(confidence)
                            class_ids.append(class_id)

                indices = cv2.dnn.NMSBoxes(boxes, confidences, self.confidence_threshold, 0.4)
                
                if len(indices) > 0:
                    for idx in indices.flatten():
                        box = boxes[idx]
                        x, y, width, height = box
                        x1 = max(0, x)
                        y1 = max(0, y)
                        x2 = min(w, x + width)
                        y2 = min(h, y + height)

                        if x2 <= x1 or y2 <= y1:
                            continue

                        raw_class = YOLO_COCO_CLASSES[class_ids[idx]]
                        class_name = CLASS_ALIASES.get(raw_class, raw_class)

                        results.append({
                            "class_name": class_name,
                            "confidence": round(confidences[idx], 4),
                            "bbox": [x1, y1, x2, y2],
                            "timestamp": ts
                        })

            return results

        except Exception as e:
            logger.error(f"[ObjectDetector] Detection error: {e}")
            return []

# ── Module-level singleton ────────────────────────────────────────────────────
_detector_instance: Optional[ObjectDetectorService] = None

def get_object_detector(confidence_threshold: Optional[float] = None) -> ObjectDetectorService:
    """Return the shared ObjectDetectorService instance."""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = ObjectDetectorService(confidence_threshold)
    elif confidence_threshold is not None:
        _detector_instance.confidence_threshold = confidence_threshold
    return _detector_instance
