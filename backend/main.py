"""
main.py – FastAPI application entry-point for PolyIA.

Endpoints
---------
POST /api/auth/register  – Create a new account
POST /api/auth/login     – Authenticate and receive a JWT
GET  /api/auth/me        – Return the current user profile
POST /api/leccion/generar – Generate a lesson via a cloud LLM API
POST /api/chat/local     – Chat with the local SLM tutor + grammar correction
GET  /api/leccion/lista  – List all lessons for the authenticated user
"""

import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Leccion, Mensaje, Usuario
from schemas import (
    ChatRequest,
    ChatResponse,
    GenerarLeccionRequest,
    LeccionResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Create DB tables on startup (use Alembic migrations in production)
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PolyIA API",
    description="Hybrid Language Tutor: cloud LLM for lessons, local SLM for chat.",
    version="1.0.0",
)

ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------
SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Register a new user and return a JWT."""
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado.",
        )
    user = Usuario(
        email=payload.email,
        hashed_password=_hash_password(payload.password),
        nivel_idioma=payload.nivel_idioma,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        nivel_idioma=user.nivel_idioma,
        usuario_id=user.id,
    )


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a user and return a JWT."""
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user or not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )
    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        nivel_idioma=user.nivel_idioma,
        usuario_id=user.id,
    )


@app.get("/api/auth/me")
def me(current_user: Usuario = Depends(_get_current_user)):
    """Return the current user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nivel_idioma": current_user.nivel_idioma,
    }


# ---------------------------------------------------------------------------
# Lesson generation – cloud LLM (OpenAI / Anthropic / Google)
# ---------------------------------------------------------------------------

def _build_lesson_prompt(tema: str, nivel: str, idioma: str) -> str:
    return (
        f"Eres un profesor experto de idiomas. Crea una lección completa de {idioma} "
        f"para un estudiante de nivel '{nivel}' sobre el tema '{tema}'.\n\n"
        "La lección DEBE incluir:\n"
        "1. Introducción y objetivos\n"
        "2. Vocabulario clave (mínimo 10 palabras con traducción)\n"
        "3. Explicación gramatical con ejemplos\n"
        "4. Diálogos de ejemplo\n"
        "5. Actividades prácticas (ejercicios de relleno, traducción o conversación)\n\n"
        "Responde en español, pero usa el idioma objetivo en los ejemplos."
    )


async def _call_openai(prompt: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY no configurada.")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
            },
        )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


async def _call_anthropic(prompt: str) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada.")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


async def _call_google(prompt: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY no configurada.")
    model = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


@app.post("/api/leccion/generar", response_model=LeccionResponse)
async def generar_leccion(
    payload: GenerarLeccionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> LeccionResponse:
    """
    Generate a language lesson using the selected cloud LLM provider.

    Supported providers: 'openai', 'anthropic', 'google'.
    Set the corresponding API key in the .env file to activate each provider.
    """
    prompt = _build_lesson_prompt(
        payload.tema, payload.nivel_idioma, payload.idioma_objetivo
    )

    try:
        if payload.proveedor == "anthropic":
            contenido = await _call_anthropic(prompt)
        elif payload.proveedor == "google":
            contenido = await _call_google(prompt)
        else:
            contenido = await _call_openai(prompt)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error del proveedor de IA: {exc.response.text}",
        ) from exc

    leccion = Leccion(
        tema=payload.tema,
        contenido=contenido,
        proveedor_ia=payload.proveedor,
        usuario_id=current_user.id,
    )
    db.add(leccion)
    db.commit()
    db.refresh(leccion)
    return LeccionResponse.model_validate(leccion)


@app.get("/api/leccion/lista", response_model=list[LeccionResponse])
def listar_lecciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> list[LeccionResponse]:
    """Return all lessons for the authenticated user, newest first."""
    lecciones = (
        db.query(Leccion)
        .filter(Leccion.usuario_id == current_user.id)
        .order_by(Leccion.created_at.desc())
        .all()
    )
    return [LeccionResponse.model_validate(l) for l in lecciones]


# ---------------------------------------------------------------------------
# Local SLM chat – grammar correction and conversational feedback
# ---------------------------------------------------------------------------

LOCAL_MODEL_URL: str = os.getenv(
    "LOCAL_MODEL_URL", "http://localhost:11434/api/generate"
)
LOCAL_MODEL_NAME: str = os.getenv("LOCAL_MODEL_NAME", "qwen2.5:3b")


def _build_chat_prompt(mensaje: str, nivel: str, idioma: str) -> str:
    return (
        f"Eres un tutor de idiomas amigable y paciente. El estudiante aprende {idioma} "
        f"y tiene nivel '{nivel}'.\n\n"
        f"Mensaje del estudiante: \"{mensaje}\"\n\n"
        "Responde en DOS secciones usando exactamente este formato JSON (sin texto extra):\n"
        '{\n'
        '  "respuesta": "<tu respuesta natural al estudiante>",\n'
        '  "correccion": "<corrección gramatical si aplica, o null si el mensaje es correcto>"\n'
        '}'
    )


@app.post("/api/chat/local", response_model=ChatResponse)
async def chat_local(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> ChatResponse:
    """
    Send a message to the local SLM (via Ollama-compatible API).
    Returns the tutor's reply and an optional grammar correction.

    To use: run `ollama pull qwen2.5:3b` and set LOCAL_MODEL_NAME in .env.
    Falls back to a mock response if the local model is unavailable.
    """
    prompt = _build_chat_prompt(
        payload.mensaje, payload.nivel_idioma, payload.idioma_objetivo
    )

    respuesta_texto = ""
    correccion_texto = None

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                LOCAL_MODEL_URL,
                json={
                    "model": LOCAL_MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                },
            )
        resp.raise_for_status()
        raw = resp.json().get("response", "")

        # Extract the JSON block from the model output
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            respuesta_texto = parsed.get("respuesta", raw)
            correccion_texto = parsed.get("correccion") or None
        else:
            respuesta_texto = raw

    except (httpx.ConnectError, httpx.HTTPStatusError):
        # Graceful fallback when the local model is not running
        respuesta_texto = (
            "El modelo local no está disponible. "
            "Inicia Ollama con `ollama serve` y descarga el modelo con "
            f"`ollama pull {LOCAL_MODEL_NAME}`."
        )

    # Persist the message
    mensaje_db = Mensaje(
        texto_usuario=payload.mensaje,
        respuesta_ia=respuesta_texto,
        correccion_ia=correccion_texto,
        usuario_id=current_user.id,
    )
    db.add(mensaje_db)
    db.commit()
    db.refresh(mensaje_db)

    return ChatResponse(
        respuesta=respuesta_texto,
        correccion=correccion_texto,
        mensaje_id=mensaje_db.id,
    )


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
