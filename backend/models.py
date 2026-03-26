"""
models.py – SQLAlchemy ORM models for PolyIA.

Tables
------
Usuario      : application users
Leccion      : AI-generated interactive lessons
Mensaje      : chat messages exchanged with the local AI tutor
ProgresoNivel: tracks completed lessons per user / language / level
"""

import datetime
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
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
    foto_perfil: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )
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
    progresos: Mapped[list["ProgresoNivel"]] = relationship(
        "ProgresoNivel", back_populates="usuario", cascade="all, delete-orphan"
    )
    conversaciones: Mapped[list["Conversacion"]] = relationship(
        "Conversacion", back_populates="usuario", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Leccion
# ---------------------------------------------------------------------------
class Leccion(Base):
    """AI-generated interactive language lesson."""

    __tablename__ = "lecciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tema: Mapped[str] = mapped_column(String(255), nullable=False)
    # JSON string with the structured exercise data
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    idioma: Mapped[str] = mapped_column(String(50), nullable=False, default="ingles")
    nivel: Mapped[str] = mapped_column(String(10), nullable=False, default="A1")
    tipo_ejercicio: Mapped[str] = mapped_column(
        String(50), nullable=False, default="multiple_choice"
    )
    tema_categoria: Mapped[str] = mapped_column(
        String(100), nullable=False, default="vocabulario_tematico"
    )
    completada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    puntuacion: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # JSON string with the user's answers / results
    resultado_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    proveedor_ia: Mapped[str] = mapped_column(
        String(50), nullable=False, default="google"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="lecciones")


# ---------------------------------------------------------------------------
# ProgresoNivel – tracks completed lessons per user / language / level
# ---------------------------------------------------------------------------
class ProgresoNivel(Base):
    """Tracks how many lessons a user has completed at a given level."""

    __tablename__ = "progreso_nivel"
    __table_args__ = (
        UniqueConstraint("usuario_id", "idioma", "nivel", name="uq_progreso"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    idioma: Mapped[str] = mapped_column(String(50), nullable=False)
    nivel: Mapped[str] = mapped_column(String(10), nullable=False)
    completadas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # comma-separated list of completed topic categories
    temas_completados: Mapped[str] = mapped_column(Text, default="", nullable=False)

    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="progresos")


# ---------------------------------------------------------------------------
# Conversacion – groups chat messages
# ---------------------------------------------------------------------------
class Conversacion(Base):
    """A chat conversation between a user and the AI tutor."""

    __tablename__ = "conversaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False, default="Nueva conversación")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="conversaciones")
    mensajes: Mapped[list["Mensaje"]] = relationship(
        "Mensaje", back_populates="conversacion", cascade="all, delete-orphan",
        order_by="Mensaje.created_at"
    )


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

    # Foreign key → Conversacion (nullable for old messages)
    conversacion_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("conversaciones.id", ondelete="CASCADE"), nullable=True
    )
    conversacion: Mapped["Conversacion | None"] = relationship(
        "Conversacion", back_populates="mensajes"
    )
