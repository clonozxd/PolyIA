"""
database.py – SQLAlchemy synchronous engine and session factory.

Uses psycopg2 (synchronous driver). To upgrade to a fully async setup,
replace create_engine with create_async_engine and psycopg2 with asyncpg.
"""

import os
import sys

# ---------------------------------------------------------------------------
# Fix for psycopg2 UnicodeDecodeError on Windows when the system code-page
# is not UTF-8 (e.g. CP-850 / CP-1252 on Spanish Windows).  libpq builds an
# internal DSN that may include system strings encoded with the legacy
# code-page; forcing UTF-8 mode prevents the mismatch.
# ---------------------------------------------------------------------------
if sys.platform == "win32":
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PGCLIENTENCODING", "UTF8")

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

# ---------------------------------------------------------------------------
# Connection URL  (fallback keeps working if DATABASE_URL is set as a string)
# ---------------------------------------------------------------------------
_raw_url: str = os.getenv(
    "DATABASE_URL",
    "postgresql://polyia:polyia_secret@localhost:5432/polyia_db",
)

# Build a SQLAlchemy URL object so that psycopg2 receives individual keyword
# arguments (host, port, dbname, user, password) instead of a single DSN
# string.  This avoids the UnicodeDecodeError that libpq can trigger on
# Windows when it appends system-encoded paths to the DSN.
_sa_url = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("POSTGRES_USER", "polyia"),
    password=os.getenv("POSTGRES_PASSWORD", "polyia_secret"),
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", "5433")),
    database=os.getenv("POSTGRES_DB", "polyia_db"),
)

# ---------------------------------------------------------------------------
# Engine & session
# ---------------------------------------------------------------------------
engine = create_engine(
    _sa_url,
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
