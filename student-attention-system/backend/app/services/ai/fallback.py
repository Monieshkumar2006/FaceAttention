from typing import Dict, Any, List, Optional
from app.schemas.ai import AIInsightResponse

def generate_rule_based_insights(session_id: Optional[int], stats: Dict[str, Any]) -> AIInsightResponse:
    """
    Generate deterministic, rule-based study habit recommendations from aggregate statistics.
    No external LLM or API key required.
    """
    actual_duration_min = max(1.0, stats.get("actual_duration_seconds", 0.0) / 60.0)
    score = stats.get("attention_score", 100.0)
    attentive_pct = stats.get("attentive_percentage", 100.0)
    
    distraction_sec = stats.get("distraction_seconds", 0.0)
    looking_away_sec = stats.get("looking_away_seconds", 0.0)
    no_face_sec = stats.get("no_face_seconds", 0.0)
    drowsiness_sec = stats.get("drowsiness_seconds", 0.0)
    event_count = stats.get("event_count", 0)
    phone_events = stats.get("phone_events", stats.get("phone_detection_count", 0))

    recommendations: List[str] = []
    patterns: List[str] = []

    # 1. Evaluate Overall Attention Score
    if score >= 85.0:
        summary = (
            f"The session demonstrates high overall focus ({score:.0f}/100) with {attentive_pct:.1f}% attentive engagement. "
            f"Observable visual cues indicate steady concentration throughout the {actual_duration_min:.1f}-minute block."
        )
        patterns.append("Consistent central gaze and sustained head alignment.")
        recommendations.append("Maintain this productive study structure and consider continuing with structured 25-minute Pomodoro sprints.")
    elif score >= 70.0:
        summary = (
            f"The session exhibits moderate attention ({score:.0f}/100) with periodic shifts in gaze or posture. "
            f"Out of {actual_duration_min:.1f} minutes, {attentive_pct:.1f}% of the time remained in primary visual focus."
        )
        patterns.append("Occasional brief look-aways or distraction intervals followed by re-engagement.")
        recommendations.append("Try placing reference materials directly in your central line of sight to reduce lateral head movement.")
    else:
        summary = (
            f"The session shows frequent observable interruptions ({score:.0f}/100) with {attentive_pct:.1f}% central focus. "
            f"Visual analysis recorded {event_count} qualified events across {actual_duration_min:.1f} study minutes."
        )
        patterns.append("Frequent or prolonged gaze diversions away from the central screen area.")
        recommendations.append("Consider silencing mobile notifications and organizing your physical workspace to eliminate peripheral distractions.")

    # 2. Evaluate Phone Events
    if phone_events > 0:
        patterns.append(f"Recorded {phone_events} phone distraction occurrence{'s' if phone_events > 1 else ''}.")
        recommendations.append(
            f"Detected {phone_events} phone interaction event{'s' if phone_events > 1 else ''}. "
            f"Place your smartphone in 'Do Not Disturb' mode or keep it out of reach during focus blocks to avoid habit loops."
        )

    # 3. Evaluate Specific Event Categories
    if drowsiness_sec >= 10.0:
        patterns.append(f"Recorded {drowsiness_sec:.0f}s of prolonged eye closure.")
        recommendations.append("Observable eye closure patterns suggest potential fatigue. Ensure adequate lighting, stay hydrated, and take a 5-minute break.")

    if looking_away_sec >= 30.0 or distraction_sec >= 20.0:
        dist_min = (looking_away_sec + distraction_sec) / 60.0
        patterns.append(f"Recorded {dist_min:.1f} min of lateral/downward gaze distraction.")
        recommendations.append("If you are reading physical textbooks or secondary screens, align them closer to the primary monitor to maintain ergonomic posture.")

    if no_face_sec >= 15.0:
        no_face_min = no_face_sec / 60.0
        patterns.append(f"Face was out of webcam frame for {no_face_min:.1f} min ({no_face_sec:.0f}s).")
        recommendations.append("Verify webcam angle and room illumination so facial cues remain clearly observable throughout the session.")

    if actual_duration_min >= 45.0:
        recommendations.append("For study blocks exceeding 45 minutes, schedule a 5–10 minute break to sustain cognitive endurance.")

    # Default fallback recommendation if none triggered
    if len(recommendations) < 3:
        recommendations.append("Reflect on your study environment and set a clear single-task objective for the next session.")

    main_pattern_str = " ".join(patterns) if patterns else "Stable, centered visual focus throughout the session."

    return AIInsightResponse(
        session_id=session_id,
        summary=summary,
        main_pattern=main_pattern_str,
        recommendations=recommendations,
        limitations="Estimates observable visual cues (head pose, eye state). Not a medical or psychological diagnosis.",
        provider="Deterministic Rule-Based Fallback Engine"
    )

