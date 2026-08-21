import json
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas.ai import AIInsightResponse
from app.services.ai.fallback import generate_rule_based_insights
from app.utils.logger import logger

SYSTEM_INSTRUCTION = """
You summarize observable study-session visual statistics.
Do not diagnose mental, psychological, sleep, or medical conditions.
Use cautious language such as "the session shows", "observable visual signals suggest", and "possible distraction pattern".
Pay special attention to phone events, distraction durations, and face presence when providing tips.
Return concise, actionable recommendations for study habits in JSON format:
{
  "summary": "...",
  "main_pattern": "...",
  "recommendations": ["rec1", "rec2", "rec3"],
  "limitations": "Estimated from observable visual signals; not a medical or psychological evaluation."
}
"""

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.api_key = settings.AI_API_KEY

    def generate_insights(self, session_id: Optional[int], stats: Dict[str, Any]) -> AIInsightResponse:
        """Generate study habit recommendations via LLM if configured, else fallback."""
        if self.provider == "none" or not self.api_key:
            return generate_rule_based_insights(session_id, stats)

        if self.provider == "openai":
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.api_key)

                prompt_content = f"Session Aggregate Statistics: {json.dumps(stats, indent=2)}"
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": SYSTEM_INSTRUCTION},
                        {"role": "user", "content": prompt_content}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.4,
                    max_tokens=500
                )

                content = response.choices[0].message.content
                parsed = json.loads(content)
                return AIInsightResponse(
                    session_id=session_id,
                    summary=parsed.get("summary", ""),
                    main_pattern=parsed.get("main_pattern", ""),
                    recommendations=parsed.get("recommendations", []),
                    limitations=parsed.get("limitations", "Not a medical or psychological diagnosis."),
                    provider=f"OpenAI ({response.model})"
                )
            except Exception as e:
                logger.warning(f"OpenAI generation failed: {e}. Defaulting to rule-based fallback.")
                return generate_rule_based_insights(session_id, stats)

        # Default fallback
        return generate_rule_based_insights(session_id, stats)

ai_service = AIService()

