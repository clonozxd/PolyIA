"""
schemas.py – Pydantic v2 request / response schemas for PolyIA.
"""

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario_id: int
    nombre: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    nombre: str = Field(min_length=1, max_length=100)


# ---------------------------------------------------------------------------
# Lección
# ---------------------------------------------------------------------------

# Allowed languages
IDIOMAS_PERMITIDOS = ["espanol", "ingles", "japones", "aleman"]

# CEFR levels for Spanish / English / German
NIVELES_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]

# JLPT levels for Japanese (N5 is easiest → N1 hardest)
NIVELES_JLPT = ["N5", "N4", "N3", "N2", "N1"]

# Topic categories
TEMAS_CATEGORIAS = [
    "vocabulario_tematico",
    "gramatica_practica",
    "comprension_auditiva",
    "expresion_oral",
    "lectura_escritura",
    "cultura_modismos",
]

# Exercise types (picked randomly by the backend)
TIPOS_EJERCICIO = [
    "matching",           # Unir pares
    "syntax_sorting",     # Ordenar la oración
    "multiple_choice",    # Opción múltiple
    "categorization",     # Categorización
    "fill_blank",         # Completar el hueco
    "translation",        # Traducción directa
    "dictation",          # Dictado
    "flashcards",         # Tarjetas giratorias
]

LESSONS_TO_UNLOCK = 10  # Lessons needed at current level to unlock next


class GenerarLeccionRequest(BaseModel):
    idioma: str = Field(description="Language: espanol, ingles, japones, aleman")
    tema_categoria: str = Field(description="Topic category")
    nivel: str | None = Field(
        default=None,
        description="Level (auto-detected if omitted). CEFR for ES/EN/DE, JLPT for JP.",
    )


class CompletarLeccionRequest(BaseModel):
    puntuacion: int = Field(ge=0, le=100)
    resultado_json: str = Field(default="{}")


class LeccionResponse(BaseModel):
    id: int
    tema: str
    contenido: str
    idioma: str
    nivel: str
    tipo_ejercicio: str
    tema_categoria: str
    completada: bool
    puntuacion: int
    proveedor_ia: str

    model_config = {"from_attributes": True}


class ProgresoResponse(BaseModel):
    idioma: str
    nivel_actual: str
    completadas: int
    necesarias: int
    temas_completados: list[str]
    niveles_desbloqueados: list[str]


class TTSRequest(BaseModel):
    texto: str = Field(min_length=1, max_length=1000)
    idioma: str = Field(default="ingles")


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class LeccionAdjunta(BaseModel):
    """Subset of lesson data the user can attach for the tutor to analyze."""
    tema: str = ""
    idioma: str = ""
    nivel: str = ""
    tipo_ejercicio: str = ""
    tema_categoria: str = ""
    puntuacion: int = 0
    contenido: str = ""
    resultado_json: str | None = None


class ChatRequest(BaseModel):
    mensaje: str = Field(min_length=1, max_length=4000)
    leccion_adjunta: LeccionAdjunta | None = None


class ChatResponse(BaseModel):
    respuesta: str
    mensaje_id: int | None = None
