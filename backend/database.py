"""
database.py – SQLAlchemy synchronous engine and session factory.

Uses psycopg2 (synchronous driver). To upgrade to a fully async setup,
replace create_engine with create_async_engine and psycopg2 with asyncpg.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

# ---------------------------------------------------------------------------
# Connection URL
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://polyia:polyia_secret@localhost:5432/polyia_db",
)

# ---------------------------------------------------------------------------
# Engine & session
# ---------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # transparently reconnect on dropped connections
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Declarative base (shared by all ORM models)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


# ---------------------------------------------------------------------------
# Dependency – yields a DB session and guarantees cleanup
# ---------------------------------------------------------------------------
def get_db():
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
