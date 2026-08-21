from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "AI-Based Student Attention & Distraction Detection System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./attention.db"
    
    # AI Settings
    AI_PROVIDER: str = "none"  # "none", "openai", "gemini"
    AI_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    
    # Vision & Monitoring Settings
    FRAME_PROCESSING_FPS: int = 5
    LOOK_AWAY_THRESHOLD_SECONDS: float = 2.0
    DISTRACTION_THRESHOLD_SECONDS: float = 5.0
    NO_FACE_THRESHOLD_SECONDS: float = 3.0
    PROLONGED_EYE_CLOSURE_SECONDS: float = 2.0
    MULTIPLE_FACES_THRESHOLD_SECONDS: float = 1.5
    
    # Algorithm Thresholds
    EAR_THRESHOLD: float = 0.21  # Eye Aspect Ratio threshold for closed eyes
    YAW_THRESHOLD: float = 22.0   # Looking left/right angle threshold
    PITCH_THRESHOLD: float = 20.0 # Looking up/down angle threshold
    
    # Attention Scoring Weights (penalties per minute in fraction)
    DISTRACTION_WEIGHT: float = 25.0
    LOOKING_AWAY_WEIGHT: float = 15.0
    NO_FACE_WEIGHT: float = 20.0
    DROWSINESS_WEIGHT: float = 30.0
    MULTIPLE_FACE_WEIGHT: float = 20.0

    # Object Detection Settings
    OBJECT_CONFIDENCE_THRESHOLD: float = 0.35
    PHONE_PERSISTENCE_THRESHOLD_SECONDS: float = 5.0
    OBJECT_PROCESSING_FPS: int = 5
    ALERT_COOLDOWN_SECONDS: int = 10
    MAX_PHONE_VIOLATIONS: int = 3

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

settings = Settings()
