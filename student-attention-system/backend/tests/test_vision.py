import pytest
import numpy as np
from app.services.vision.head_pose import HeadPoseEstimator
from app.services.vision.eye_state import EyeStateAnalyzer
from app.utils.thresholds import (
    HEAD_DIR_CENTER, HEAD_DIR_LEFT, HEAD_DIR_RIGHT, HEAD_DIR_UP, HEAD_DIR_DOWN, HEAD_DIR_UNKNOWN,
    EYE_OPEN, EYE_CLOSED
)

def test_eye_aspect_ratio_open_and_closed():
    analyzer = EyeStateAnalyzer(ear_threshold=0.21)

    # 1. Simulate an open eye landmark array
    open_landmarks = np.zeros((468, 3), dtype=np.float64)
    # Left eye
    for idx in analyzer.LEFT_EYE:
        open_landmarks[idx] = [100.0, 100.0, 0.0]
    open_landmarks[33] = [100.0, 100.0, 0.0]  # p1
    open_landmarks[160] = [102.0, 106.0, 0.0] # p2
    open_landmarks[158] = [106.0, 106.0, 0.0] # p3
    open_landmarks[133] = [108.0, 100.0, 0.0] # p4
    open_landmarks[153] = [106.0, 94.0, 0.0]  # p5
    open_landmarks[144] = [102.0, 94.0, 0.0]  # p6

    # Right eye identical
    for idx in analyzer.RIGHT_EYE:
        open_landmarks[idx] = [200.0, 100.0, 0.0]
    open_landmarks[362] = [200.0, 100.0, 0.0]
    open_landmarks[385] = [202.0, 106.0, 0.0]
    open_landmarks[387] = [206.0, 106.0, 0.0]
    open_landmarks[263] = [208.0, 100.0, 0.0]
    open_landmarks[373] = [206.0, 94.0, 0.0]
    open_landmarks[380] = [202.0, 94.0, 0.0]

    state, metrics = analyzer.analyze_eyes(open_landmarks)
    assert state == EYE_OPEN
    assert metrics["avg_ear"] > 0.21

    # 2. Simulate closed eyes
    closed_landmarks = np.zeros((468, 3), dtype=np.float64)
    for idx in analyzer.LEFT_EYE + analyzer.RIGHT_EYE:
        closed_landmarks[idx] = [100.0, 100.0, 0.0]
    closed_landmarks[33] = [100.0, 100.0, 0.0]
    closed_landmarks[160] = [102.0, 100.2, 0.0]
    closed_landmarks[158] = [106.0, 100.2, 0.0]
    closed_landmarks[133] = [110.0, 100.0, 0.0]
    closed_landmarks[153] = [106.0, 99.8, 0.0]
    closed_landmarks[144] = [102.0, 99.8, 0.0]

    closed_landmarks[362] = [200.0, 100.0, 0.0]
    closed_landmarks[385] = [202.0, 100.2, 0.0]
    closed_landmarks[387] = [206.0, 100.2, 0.0]
    closed_landmarks[263] = [210.0, 100.0, 0.0]
    closed_landmarks[373] = [206.0, 99.8, 0.0]
    closed_landmarks[380] = [202.0, 99.8, 0.0]

    state_closed, metrics_closed = analyzer.analyze_eyes(closed_landmarks)
    assert state_closed == EYE_CLOSED
    assert metrics_closed["avg_ear"] < 0.21

def test_head_pose_neutral_center():
    estimator = HeadPoseEstimator(yaw_threshold=20.0, pitch_threshold=18.0)
    landmarks = np.zeros((468, 3), dtype=np.float64)
    landmarks[1] = [320.0, 240.0, 0.0]    # Nose
    landmarks[152] = [320.0, 350.0, 0.0]  # Chin
    landmarks[33] = [250.0, 200.0, 0.0]   # Left eye
    landmarks[263] = [390.0, 200.0, 0.0]  # Right eye
    landmarks[61] = [280.0, 290.0, 0.0]   # Left mouth
    landmarks[291] = [360.0, 290.0, 0.0]  # Right mouth

    direction, angles = estimator.estimate_pose(landmarks, (480, 640))
    assert direction == HEAD_DIR_CENTER
    assert abs(angles["yaw"]) < 5.0
    assert abs(angles["pitch"]) < 5.0

def test_head_pose_look_right():
    estimator = HeadPoseEstimator(yaw_threshold=15.0, pitch_threshold=15.0)
    # Looking to right: nose shifts significantly to the right of face center
    landmarks = np.zeros((468, 3), dtype=np.float64)
    landmarks[1] = [370.0, 240.0, 0.0]    # Nose shifted right
    landmarks[152] = [340.0, 350.0, 0.0]  # Chin
    landmarks[33] = [280.0, 200.0, 0.0]   # Left eye
    landmarks[263] = [400.0, 200.0, 0.0]  # Right eye (compressed)
    landmarks[61] = [300.0, 290.0, 0.0]   # Left mouth
    landmarks[291] = [370.0, 290.0, 0.0]  # Right mouth

    direction, angles = estimator.estimate_pose(landmarks, (480, 640))
    assert direction in (HEAD_DIR_RIGHT, HEAD_DIR_CENTER)
