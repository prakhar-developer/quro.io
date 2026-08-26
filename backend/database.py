from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings
import logging

logger = logging.getLogger("quro.database")

DATABASE_URL = settings.DATABASE_URL

# Enforce Neon PostgreSQL — reject any other DB at startup
if not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError(
        f"Invalid DATABASE_URL: only Neon PostgreSQL (postgresql://) is supported. "
        f"Got: {DATABASE_URL[:40]}..."
    )

# Industry-grade connection pool settings for Neon serverless PostgreSQL
# pool_pre_ping   : Validates connection health before use (detects stale connections)
# pool_recycle    : Recycles connections every 5 min — prevents Neon idle timeout cuts
# pool_size       : Persistent connections kept alive in the pool
# max_overflow    : Burst connections above pool_size allowed under heavy load
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_migrations(engine):
    """
    Lightweight, resilient automatic migration runner.
    Applies schema upgrades (adding OTP and admin columns) to existing tables
    on Neon PostgreSQL without data loss.
    """
    logger.info("Initializing automatic schema migration checks...")

    with engine.connect() as conn:
        columns_to_add = [
            ("is_admin",                        "BOOLEAN DEFAULT FALSE"),
            ("is_verified",                     "BOOLEAN DEFAULT FALSE"),
            ("verification_otp",                "VARCHAR"),
            ("verification_otp_expires_at",     "TIMESTAMP"),
            ("login_otp",                       "VARCHAR"),
            ("login_otp_expires_at",            "TIMESTAMP"),
            ("reset_password_otp",              "VARCHAR"),
            ("reset_password_otp_expires_at",   "TIMESTAMP"),
            ("google_id",                       "VARCHAR"),
            ("phone_number",                    "VARCHAR"),
            ("phone_otp",                       "VARCHAR"),
            ("phone_otp_expires_at",            "TIMESTAMP"),
        ]

        for column_name, column_type in columns_to_add:
            try:
                with conn.begin():
                    conn.execute(
                        text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type};")
                    )
                    logger.info(f"Migration: Added column '{column_name}' to users table.")
            except Exception:
                # Column already exists — safe to ignore
                pass

        # Make email and hashed_password nullable for phone-only accounts
        for col in ["email", "hashed_password"]:
            try:
                with conn.begin():
                    conn.execute(text(f"ALTER TABLE users ALTER COLUMN {col} DROP NOT NULL;"))
            except Exception:
                pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
