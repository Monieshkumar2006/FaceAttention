# FocusVision AI — AI-Based Student Attention & Distraction Detection System

A privacy-preserving, full-stack application that estimates observable student attention-related signals from webcam input in real time. The system classifies gaze orientation and eye closure, applies a temporal state machine to eliminate false positives from transient blinks or brief glances, calculates a deterministic, explainable attention score, renders real-time dashboards & post-session analytics, generates AI-powered study habit recommendations with an offline rule-based fallback, and produces downloadable PDF session reports.

---

## Key Highlights & Architecture

- **Privacy-First Design**: Raw webcam frames are processed locally for observable visual cues (head direction, eye state) and immediately discarded. No video is ever stored to disk or uploaded to cloud storage. No biometric facial identification is performed.
- **Observable Framing**: Language strictly avoids mental or medical claims, presenting metrics as *estimated attention*, *potential distraction*, and *possible drowsiness*.
- **Temporal Distraction Engine**: Uses configurable time thresholds (e.g. looking away $\ge 2.0s \implies$ potential distraction, $\ge 5.0s \implies$ qualified distraction) to prevent normal blinks and natural head shifts from triggering false penalties.
- **Deterministic Attention Scoring**: Calculates a reproducible score starting from 100 with weighted time-based deductions per qualified distraction category.
- **Real-Time WebSocket Pipeline**: Operates at a controlled 5 FPS transmission rate with automatic reconnection and heartbeat pinging.
- **AI Study Habits & Offline Fallback**: Synthesizes aggregate session statistics (durations, event counts) into personalized study habit recommendations. Works 100% offline with zero external API key dependencies via its rule-based engine.
- **Presentation Demo Mode**: First-class simulated session mode to demonstrate the complete live monitoring, scoring, analytics, and PDF reporting pipeline without requiring a physical camera.

---

## Tech Stack

- **Frontend**: React 18, Vite 6, React Router DOM v6, Recharts, Lucide Icons, Vanilla CSS Design System.
- **Backend**: FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic V2, SQLite, ReportLab (PDF), WebSockets.
- **Vision Engine**: MediaPipe Tasks Face Mesh (468 3D landmarks), OpenCV (`solvePnP` 3D Euler head pose estimation, Eye Aspect Ratio EAR).
- **Testing**: Pytest with automated unit and API integration suites.

---

## Repository Structure

```
student-attention-system/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AttentionScore/      # Radial score gauge & grade badge
│   │   │   ├── CameraStatus/        # Live FPS & stream status indicators
│   │   │   ├── EventLog/            # Real-time and post-session event feed
│   │   │   ├── SessionTimer/        # Elapsed/planned stopwatch with pause state
│   │   │   ├── StatusCard/          # Head direction, eye state, face count badges
│   │   │   ├── Timeline/            # Color-coded session time breakdown bar
│   │   │   └── WebcamMonitor/       # Video preview with HUD overlay
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx  # Sidebar navigation, brand header, privacy badge
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Summary cards, quick start, recent sessions
│   │   │   ├── StartSession.jsx     # Form, duration slider, demo toggle, privacy notice
│   │   │   ├── Monitoring.jsx       # Live WebSocket monitor with HUD & controls
│   │   │   ├── Analytics.jsx        # Recharts time allocation, timeline, score breakdown
│   │   │   ├── History.jsx          # Searchable, filterable session archive
│   │   │   ├── SessionDetails.jsx   # Dedicated deep dive for past sessions
│   │   │   ├── AIInsights.jsx       # Study habit recommendations & pattern analysis
│   │   │   └── Report.jsx           # Embedded PDF report preview & download
│   │   ├── hooks/
│   │   │   ├── useWebcam.js         # MediaDevices stream management & frame capture
│   │   │   └── useMonitoring.js     # WebSocket connection & demo sequence runner
│   │   ├── services/
│   │   │   ├── api.js               # Axios REST client with error interceptors
│   │   │   └── websocket.js         # Resilient WebSocket client
│   │   ├── utils/
│   │   │   ├── constants.js         # Event types, severities, colors, thresholds
│   │   │   └── formatting.js        # Duration, date, and score grade formatters
│   │   ├── App.jsx                  # Main router setup
│   │   ├── index.css                # Academic productivity design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application & router assembly
│   │   ├── config.py                # Pydantic Settings configuration loader
│   │   ├── api/routes/
│   │   │   ├── sessions.py          # Session CRUD & state validation machine
│   │   │   ├── monitoring.py        # Real-time WebSocket `/ws/monitor/{id}` endpoint
│   │   │   ├── analytics.py         # Summary statistics & timeline endpoint
│   │   │   ├── ai.py                # AI study insights generation endpoint
│   │   │   └── reports.py           # ReportLab PDF generation endpoint
│   │   ├── services/
│   │   │   ├── vision/
│   │   │   │   ├── face_detector.py # MediaPipe Tasks Face Detection
│   │   │   │   ├── landmarks.py     # 468-point Face Mesh landmark extractor
│   │   │   │   ├── head_pose.py     # 3D solvePnP Euler angles estimation
│   │   │   │   └── eye_state.py     # Eye Aspect Ratio (EAR) blink analyzer
│   │   │   ├── attention/
│   │   │   │   ├── distraction_engine.py # Temporal qualification state machine
│   │   │   │   └── scoring_engine.py    # Deterministic weighted penalty scoring
│   │   │   ├── ai/
│   │   │   │   ├── ai_service.py    # OpenAI provider integration
│   │   │   │   └── fallback.py      # Rule-based offline insights generator
│   │   │   └── reports/
│   │   │       └── report_service.py# ReportLab PDF document generator
│   │   ├── models/                  # SQLAlchemy models (Student, StudySession, AttentionEvent, SessionSummary, AIInsight)
│   │   ├── schemas/                 # Pydantic V2 schemas
│   │   ├── database/                # SQLite connection & table initializers
│   │   └── utils/                   # Thresholds, severities, and structured logger
│   ├── tests/
│   │   ├── conftest.py              # Shared in-memory SQLite fixture & client
│   │   ├── test_sessions.py         # Session lifecycle state machine tests
│   │   ├── test_vision.py           # EAR & Head Pose estimation tests
│   │   ├── test_distraction.py      # Temporal threshold qualification tests
│   │   ├── test_scoring.py          # Penalty deduction & clamping tests
│   │   └── test_api.py              # Analytics, AI Fallback, and Report tests
│   ├── requirements.txt
│   └── .env.example
├── start-all.bat                    # One-click Windows launcher
├── start-backend.ps1                # PowerShell backend launcher
├── start-frontend.ps1               # PowerShell frontend launcher
└── README.md
```

---

## Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ & npm

### 2. Automatic One-Click Startup (Windows)
Double-click `start-all.bat` or run:
```powershell
.\start-all.bat
```

### 3. Manual Startup

**Terminal 1 — Backend:**
```powershell
cd backend
py -3.14 -m uvicorn app.main:app --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## Running the Automated Test Suite

Run the full backend test suite with verbose output:
```powershell
$env:PYTHONPATH = "backend"
py -3.14 -m pytest backend/tests/ -v
```

All 12 unit & integration tests verify:
1. `test_sessions.py`: Session CRUD and lifecycle state machine (`CREATED` $\to$ `RUNNING` $\leftrightarrow$ `PAUSED` $\to$ `COMPLETED`).
2. `test_vision.py`: Eye Aspect Ratio (EAR) calculations and 3D head pose classification.
3. `test_distraction.py`: Temporal filtering (transient blinks vs qualified distractions vs drowsiness).
4. `test_scoring.py`: Deterministic weighted penalty math and range constraints.
5. `test_api.py`: Analytics aggregation, AI fallback generation, and ReportLab PDF streaming.

---

## Presentation & Demo Checklist

1. **Launch**: Start both frontend and backend. Open `http://localhost:5173`.
2. **Dashboard**: View aggregate statistics (Avg Attention Score, Total Focus Time, Recent Activity).
3. **Start Session**: Click **New Session**, enter student details, review the **Privacy Notice**, and choose Live Camera or Demo Mode.
4. **Live Monitoring**:
   - Preview webcam feed with real-time HUD (Faces detected, Head Direction, Eye State).
   - Observe real-time score dial and session timer.
   - Demonstrate look-away/gaze shift to trigger time-qualified events.
   - Test **Pause** and **Resume** controls.
5. **Complete Session**: Conclude session to view **Analytics**.
6. **Analytics & Charts**: Inspect time allocation pie chart, event distribution, score breakdown, and interactive timeline.
7. **AI Insights**: View tailored study recommendations and pattern summaries.
8. **PDF Report**: Download or preview the ReportLab PDF summary report.
9. **History**: Re-open any past session from the history archive.
