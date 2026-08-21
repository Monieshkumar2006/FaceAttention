import pytest

def test_analytics_and_ai_fallback_and_report_endpoints(client):
    # 1. Create and complete session through API
    create_res = client.post("/api/sessions", json={
        "name": "Alex Johnson",
        "student_id": "STU-API-1",
        "subject": "Organic Chemistry",
        "planned_duration": 30
    })
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200

    complete_res = client.post(f"/api/sessions/{session_id}/complete")
    assert complete_res.status_code == 200

    # 2. Test Analytics endpoint
    analytics_res = client.get(f"/api/analytics/{session_id}")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["session_id"] == session_id
    assert analytics_data["subject"] == "Organic Chemistry"
    assert "score_breakdown" in analytics_data
    assert len(analytics_data["timeline"]) > 0

    # 3. Test AI Insights fallback endpoint
    ai_res = client.get(f"/api/ai/{session_id}")
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["session_id"] == session_id
    assert "summary" in ai_data
    assert len(ai_data["recommendations"]) >= 1

    # 4. Test ReportLab PDF generation endpoint
    report_res = client.get(f"/api/reports/{session_id}")
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    assert len(report_res.content) > 500  # PDF binary output is returned
