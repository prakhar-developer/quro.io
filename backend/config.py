from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Quro AI Platform"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Security — must be set in .env for production
    SECRET_KEY: str = "changeme-set-a-strong-secret-in-env"

    # Groq Settings
    GROQ_API_KEY: str
    PRIMARY_MODEL: str = "llama-3.1-8b-instant"
    FALLBACK_MODEL: str = "llama-3.3-70b-versatile"

    # Qdrant Cloud Settings — required, no localhost default
    QDRANT_URL: str                          # Must be set in .env (cloud.qdrant.io)
    QDRANT_API_KEY: Optional[str] = None
    VECTOR_COLLECTION: str = "quro_documents"

    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"

    # Neon PostgreSQL — required, must be postgresql:// URL
    DATABASE_URL: str

    # Email Settings (Resend API)
    RESEND_API_KEY: Optional[str] = None

    # Frontend URL (used in emails)
    VITE_BACKEND_API: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # httpSMS Gateway Settings
    HTTPSMS_API_KEY: Optional[str] = None
    HTTPSMS_FROM_NUMBER: Optional[str] = None
    HTTPSMS_SERVER_URL: str = "https://api.httpsms.com"
    MAX_DAILY_SMS_LIMIT: int = 100

    # Embedding & Rerank Models
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    RERANK_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # OCR
    TESSERACT_CMD: str = "tesseract"

    # Limits
    MAX_FILE_SIZE_MB: int = 25
    SESSION_EXPIRY_HOURS: int = 2

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
