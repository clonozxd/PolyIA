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
    nivel_idioma: str
    usuario_id: int


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    nivel_idioma: str = Field(default="principiante")


# ---------------------------------------------------------------------------
# Lección
# ---------------------------------------------------------------------------
class GenerarLeccionRequest(BaseModel):
    tema: str = Field(min_length=2, max_length=200)
    nivel_idioma: str = Field(default="principiante")
    idioma_objetivo: str = Field(default="inglés")
    proveedor: str = Field(
        default="openai",
        description="Cloud provider: 'openai', 'anthropic' or 'google'",
    )


class LeccionResponse(BaseModel):
    id: int
    tema: str
    contenido: str
    proveedor_ia: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    mensaje: str = Field(min_length=1, max_length=2000)
    idioma_objetivo: str = Field(default="inglés")
    nivel_idioma: str = Field(default="principiante")


class ChatResponse(BaseModel):
    respuesta: str
    correccion: str | None = None
    mensaje_id: int | None = None
