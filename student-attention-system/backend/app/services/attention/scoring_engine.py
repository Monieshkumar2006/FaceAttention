from typing import Dict, Any
from app.config import settings
from app.schemas.analytics import ScoreBreakdown

class AttentionScoringEngine:
    def __init__(
        self,
        distraction_weight: float = None,
        looking_away_weight: float = None,
        no_face_weight: float = None,
        drowsiness_weight: float = None,
        multiple_face_weight: float = None
    ):
        self.distraction_weight = distraction_weight if distraction_weight is not None else settings.DISTRACTION_WEIGHT
        self.looking_away_weight = looking_away_weight if looking_away_weight is not None else settings.LOOKING_AWAY_WEIGHT
        self.no_face_weight = no_face_weight if no_face_weight is not None else settings.NO_FACE_WEIGHT
        self.drowsiness_weight = drowsiness_weight if drowsiness_weight is not None else settings.DROWSINESS_WEIGHT
        self.multiple_face_weight = multiple_face_weight if multiple_face_weight is not None else settings.MULTIPLE_FACE_WEIGHT

    def calculate_score(self, durations: Dict[str, float]) -> ScoreBreakdown:
        """
        Calculate deterministic attention score and explainable penalty breakdown.
        durations dictionary contains elapsed seconds per category.
        """
        distraction_min = max(0.0, durations.get("distraction", 0.0)) / 60.0
        looking_away_min = max(0.0, durations.get("looking_away", 0.0)) / 60.0
        no_face_min = max(0.0, durations.get("no_face", 0.0)) / 60.0
        drowsiness_min = max(0.0, durations.get("drowsiness", 0.0)) / 60.0
        multiple_faces_min = max(0.0, durations.get("multiple_faces", 0.0)) / 60.0

        p_distraction = distraction_min * self.distraction_weight
        p_looking_away = looking_away_min * self.looking_away_weight
        p_no_face = no_face_min * self.no_face_weight
        p_drowsiness = drowsiness_min * self.drowsiness_weight
        p_multiple_faces = multiple_faces_min * self.multiple_face_weight

        total_penalty = p_distraction + p_looking_away + p_no_face + p_drowsiness + p_multiple_faces
        base_score = 100.0
        final_score = max(0.0, min(100.0, round(base_score - total_penalty, 1)))

        total_seconds = sum(durations.values())
        attentive_seconds = durations.get("attentive", 0.0)
        attentive_pct = round((attentive_seconds / max(1.0, total_seconds)) * 100.0, 1)

        return ScoreBreakdown(
            base_score=base_score,
            distraction_penalty=round(p_distraction, 2),
            looking_away_penalty=round(p_looking_away, 2),
            no_face_penalty=round(p_no_face, 2),
            drowsiness_penalty=round(p_drowsiness, 2),
            multiple_faces_penalty=round(p_multiple_faces, 2),
            total_penalty=round(total_penalty, 2),
            final_score=final_score,
            attentive_percentage=attentive_pct
        )

scoring_engine = AttentionScoringEngine()
