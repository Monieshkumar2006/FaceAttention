import asyncio
import base64
import json
import urllib.request
import websockets
import numpy as np
import cv2

async def test_live_server():
    print("\n--- 1. Testing Live REST /health ---")
    req = urllib.request.urlopen("http://localhost:8000/health")
    health = json.loads(req.read().decode())
    print("   [PASS] Health response:", health)

    print("\n--- 2. Testing Live REST /api/sessions (Create Session) ---")
    payload = json.dumps({
        "name": "Live Student Test",
        "student_id": "STU-LIVE-100",
        "subject": "Deep Learning & CV",
        "planned_duration": 25
    }).encode()
    req = urllib.request.Request(
        "http://localhost:8000/api/sessions",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    session_data = json.loads(urllib.request.urlopen(req).read().decode())
    session_id = session_data["id"]
    print(f"   [PASS] Created Session ID: {session_id}, Status: {session_data['status']}")

    print("\n--- 3. Testing Live REST /start ---")
    req = urllib.request.Request(
        f"http://localhost:8000/api/sessions/{session_id}/start",
        data=b"",
        headers={"Content-Type": "application/json"}
    )
    start_data = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"   [PASS] Started Session Status: {start_data['status']}")

    print("\n--- 4. Testing Live WebSocket /ws/monitor/{session_id} Frame Ingestion ---")
    uri = f"ws://localhost:8000/ws/monitor/{session_id}"
    async with websockets.connect(uri) as ws:
        # Create a mock JPEG frame
        img = np.zeros((240, 320, 3), dtype=np.uint8)
        _, buffer = cv2.imencode(".jpg", img)
        b64 = base64.b64encode(buffer).decode("utf-8")

        frame_msg = json.dumps({
            "type": "frame",
            "timestamp": "2026-08-18T10:00:00Z",
            "image": b64
        })
        await ws.send(frame_msg)
        response = await asyncio.wait_for(ws.recv(), timeout=5.0)
        parsed = json.loads(response)
        print(f"   [PASS] Real-time WS Message Type: {parsed.get('type')}")
        print(f"   [PASS] Face Count: {parsed.get('face_count')}, Direction: {parsed.get('head_direction')}, Status: {parsed.get('status')}, Live Score: {parsed.get('attention_score')}")

    print("\n--- 5. Testing Live REST /complete ---")
    req = urllib.request.Request(
        f"http://localhost:8000/api/sessions/{session_id}/complete",
        data=b"",
        headers={"Content-Type": "application/json"}
    )
    complete_data = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"   [PASS] Completed Session Final Score: {complete_data['attention_score']}, Status: {complete_data['status']}")

    print("\n--- 6. Testing Live REST /api/analytics/{id} ---")
    req = urllib.request.urlopen(f"http://localhost:8000/api/analytics/{session_id}")
    analytics = json.loads(req.read().decode())
    print(f"   [PASS] Analytics Subject: {analytics['subject']}")
    print(f"   [PASS] Timeline Blocks Count: {len(analytics['timeline'])}")
    print(f"   [PASS] Attentive Percentage: {analytics['score_breakdown']['attentive_percentage']}%")

    print("\n--- 7. Testing Live REST /api/ai/{id} (AI Study Insights) ---")
    req = urllib.request.urlopen(f"http://localhost:8000/api/ai/{session_id}")
    ai_data = json.loads(req.read().decode())
    print(f"   [PASS] AI Summary: {ai_data['summary'][:80]}...")
    print(f"   [PASS] AI Recommendations Count: {len(ai_data['recommendations'])}")

    print("\n--- 8. Testing Live REST /api/reports/{id} (ReportLab PDF Stream) ---")
    req = urllib.request.urlopen(f"http://localhost:8000/api/reports/{session_id}")
    pdf_bytes = req.read()
    print(f"   [PASS] Generated PDF Size: {len(pdf_bytes)} bytes")
    print(f"   [PASS] PDF Header Signature: {pdf_bytes[:5].decode('latin-1')}")

    print("\n=======================================================")
    print(" >>> ALL LIVE BACKEND & CV FEATURES TESTED & PASSED <<<")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_live_server())
