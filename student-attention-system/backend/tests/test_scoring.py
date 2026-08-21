import pytest
from app.services.attention.scoring_engine import AttentionScoringEngine

def test_perfect_attention_score():
    engine = AttentionScoringEngine()
    durations = {
        "attentive": 1500.0, # 25 minutes
        "distraction": 0.0,
        "looking_away": 0.0,
        "no_face": 0.0,
        "drowsiness": 0.0,
        "multiple_faces": 0.0
    }
    breakdown = engine.calculate_score(durations)
    assert breakdown.base_score == 100.0
    assert breakdown.total_penalty == 0.0
    assert breakdown.final_score == 100.0
    assert breakdown.attentive_percentage == 100.0

def test_deterministic_penalties_and_clamping():
    engine = AttentionScoringEngine(
        distraction_weight=25.0,
        looking_away_weight=15.0,
        no_face_weight=20.0,
        drowsiness_weight=30.0,
        multiple_face_weight=20.0
    )
    # 2 minutes of distraction -> penalty = 2 * 25 = 50
    # 1 minute of looking away -> penalty = 1 * 15 = 15
    # Total penalty = 65 -> final score = 100 - 65 = 35.0
    durations = {
        "attentive": 600.0, # 10 mins
        "distraction": 120.0, # 2 mins
        "looking_away": 60.0, # 1 min
        "no_face": 0.0,
        "drowsiness": 0.0,
        "multiple_faces": 0.0
    }
    breakdown = engine.calculate_score(durations)
    assert breakdown.distraction_penalty == 50.0
    assert breakdown.looking_away_penalty == 15.0
    assert breakdown.total_penalty == 65.0
    assert breakdown.final_score == 35.0

    # Test clamping: heavy penalty that exceeds 100
    heavy_durations = {
        "attentive": 0.0,
        "distraction": 600.0, # 10 mins * 25 = 250 penalty
        "looking_away": 0.0,
        "no_face": 0.0,
        "drowsiness": 0.0,
        "multiple_faces": 0.0
    }
    heavy_breakdown = engine.calculate_score(heavy_durations)
    assert heavy_breakdown.final_score == 0.0
    assert heavy_breakdown.final_score >= 0.0
