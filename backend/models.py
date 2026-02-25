"""
models.py – SQLAlchemy ORM models for PolyIA.

Tables
------
Usuario  : application users (credentials + language level)
Leccion  : AI-generated lessons linked to a user
Mensaje  : chat messages exchanged with the local AI tutor
"""

import datetime
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------
class Usuario(Base):
    """Registered user account."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    nombre: Mapped[str] = mapped_column(
        String(100), nullable=False, default=""
    )
    # Stored as a bcrypt hash – never in plain text
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    nivel_idioma: Mapped[str] = mapped_column(
        String(50), nullable=False, default="principiante"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    lecciones: Mapped[list["Leccion"]] = relationship(
        "Leccion", back_populates="usuario", cascade="all, delete-orphan"
    )
    mensajes: Mapped[list["Mensaje"]] = relationship(
        "Mensaje", back_populates="usuario", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Leccion
# ---------------------------------------------------------------------------
class Leccion(Base):
    """AI-generated language lesson."""

    __tablename__ = "lecciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tema: Mapped[str] = mapped_column(String(255), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    proveedor_ia: Mapped[str] = mapped_column(
        String(50), nullable=False, default="openai"
    )  # openai | anthropic | google
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Foreign key → Usuario
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="lecciones")


# ---------------------------------------------------------------------------
# Mensaje
# ---------------------------------------------------------------------------
class Mensaje(Base):
    """Chat message exchanged between a user and the local AI tutor."""

    __tablename__ = "mensajes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    texto_usuario: Mapped[str] = mapped_column(Text, nullable=False)
    respuesta_ia: Mapped[str] = mapped_column(Text, nullable=True)
    correccion_ia: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Foreign key → Usuario
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="mensajes")
