"""
main.py – FastAPI application entry-point for PolyIA.

Endpoints
---------
POST /api/auth/register            – Create a new account
POST /api/auth/login               – Authenticate and receive a JWT
GET  /api/auth/me                  – Return the current user profile
POST /api/leccion/generar          – Generate a structured exercise via Google Gemini
POST /api/leccion/{id}/completar   – Mark a lesson as completed
GET  /api/leccion/lista            – List all lessons for the authenticated user
GET  /api/progreso/{idioma}        – Get level progress for a language
GET  /api/progreso                 – Get progress for all languages
POST /api/tts                      – Generate audio from text using edge-tts
POST /api/chat/local               – Chat with the local SLM tutor + grammar correction
"""

import hashlib
import io
import json
import os
import random
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Conversacion, Leccion, Mensaje, ProgresoNivel, Usuario
from schemas import (
    ChangePasswordRequest,
    ChatRequest,
    ChatResponse,
    CompletarLeccionRequest,
    ConversacionResponse,
    GenerarLeccionRequest,
    IDIOMAS_PERMITIDOS,
    LeccionResponse,
    LESSONS_TO_UNLOCK,
    LoginRequest,
    MensajeResponse,
    NIVELES_CEFR,
    NIVELES_JLPT,
    ProgresoResponse,
    RegisterRequest,
    TEMAS_CATEGORIAS,
    TIPOS_EJERCICIO,
    TokenResponse,
    TTSRequest,
    UpdateProfileRequest,
)

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Create DB tables on startup
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PolyIA API",
    description="Hybrid Language Tutor: cloud LLM for lessons, local SLM for chat.",
    version="2.0.0",
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
# Language / Level helpers
# ---------------------------------------------------------------------------

def _get_levels(idioma: str) -> list[str]:
    """Return the level progression for a given language."""
    if idioma == "japones":
        return NIVELES_JLPT
    return NIVELES_CEFR


def _get_current_level(db: Session, user_id: int, idioma: str) -> str:
    """Determine the highest unlocked level for a user in a language."""
    levels = _get_levels(idioma)
    for i, level in enumerate(levels):
        prog = (
            db.query(ProgresoNivel)
            .filter(
                ProgresoNivel.usuario_id == user_id,
                ProgresoNivel.idioma == idioma,
                ProgresoNivel.nivel == level,
            )
            .first()
        )
        if prog is None or prog.completadas < LESSONS_TO_UNLOCK:
            return level
    return levels[-1]


def _get_unlocked_levels(db: Session, user_id: int, idioma: str) -> list[str]:
    """Return the list of levels the user has access to."""
    levels = _get_levels(idioma)
    unlocked = [levels[0]]
    for i, level in enumerate(levels[:-1]):
        prog = (
            db.query(ProgresoNivel)
            .filter(
                ProgresoNivel.usuario_id == user_id,
                ProgresoNivel.idioma == idioma,
                ProgresoNivel.nivel == level,
            )
            .first()
        )
        if prog and prog.completadas >= LESSONS_TO_UNLOCK:
            unlocked.append(levels[i + 1])
        else:
            break
    return unlocked


IDIOMA_DISPLAY = {
    "espanol": "español",
    "ingles": "inglés",
    "japones": "japonés",
    "aleman": "alemán",
}

TEMA_DISPLAY = {
    "vocabulario_tematico": "Vocabulario Temático",
    "gramatica_practica": "Gramática Práctica",
    "comprension_auditiva": "Comprensión Auditiva",
    "expresion_oral": "Expresión Oral y Pronunciación",
    "lectura_escritura": "Lectura y Escritura",
    "cultura_modismos": "Cultura y Modismos",
}

TIPO_DISPLAY = {
    "matching": "Unir pares (Matching)",
    "syntax_sorting": "Ordenar la oración",
    "multiple_choice": "Opción múltiple",
    "categorization": "Categorización",
    "fill_blank": "Completar el hueco",
    "translation": "Traducción directa",
    "dictation": "Dictado",
    "flashcards": "Tarjetas giratorias (Flashcards)",
}

# Map topic → compatible exercise types
TOPIC_EXERCISE_MAP: dict[str, list[str]] = {
    "vocabulario_tematico": ["matching", "flashcards", "multiple_choice", "categorization"],
    "gramatica_practica": ["fill_blank", "syntax_sorting", "multiple_choice", "categorization"],
    "comprension_auditiva": ["dictation", "multiple_choice", "fill_blank"],
    "expresion_oral": ["dictation", "translation", "flashcards"],
    "lectura_escritura": ["translation", "fill_blank", "syntax_sorting", "multiple_choice"],
    "cultura_modismos": ["flashcards", "matching", "multiple_choice", "fill_blank"],
}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado.",
        )
    user = Usuario(
        email=payload.email,
        hashed_password=_hash_password(payload.password),
        nombre=payload.nombre,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, usuario_id=user.id, nombre=user.nombre)


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user or not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )
    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, usuario_id=user.id, nombre=user.nombre)


@app.get("/api/auth/me")
def me(current_user: Usuario = Depends(_get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "foto_perfil": current_user.foto_perfil,
    }


@app.put("/api/auth/profile")
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Update the user's display name and/or profile picture."""
    if payload.nombre is not None:
        current_user.nombre = payload.nombre.strip()
    if payload.foto_perfil is not None:
        current_user.foto_perfil = payload.foto_perfil
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "foto_perfil": current_user.foto_perfil,
    }


@app.put("/api/auth/password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Change the user's password. Requires current password + confirmation."""
    if not _verify_password(payload.password_actual, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )
    if payload.password_nueva != payload.password_confirmacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña y la confirmación no coinciden.",
        )
    current_user.hashed_password = _hash_password(payload.password_nueva)
    db.commit()
    return {"message": "Contraseña actualizada correctamente."}


# ---------------------------------------------------------------------------
# Lesson generation – Google Gemini only
# ---------------------------------------------------------------------------

def _build_exercise_prompt(
    tipo: str, tema_cat: str, nivel: str, idioma: str
) -> str:
    """Build a detailed prompt that tells Gemini to produce structured JSON."""
    idioma_display = IDIOMA_DISPLAY.get(idioma, idioma)
    tema_display = TEMA_DISPLAY.get(tema_cat, tema_cat)
    tipo_display = TIPO_DISPLAY.get(tipo, tipo)

    base = (
        f"Eres un profesor experto de idiomas creando ejercicios interactivos para una app. "
        f"Genera UN ejercicio de tipo '{tipo_display}' para estudiantes de {idioma_display} "
        f"de nivel {nivel}, dentro de la categoría '{tema_display}'.\n\n"
    )

    json_schemas = {
        "matching": (
            "El ejercicio es de UNIR PARES. El usuario debe emparejar términos con definiciones/traducciones.\n"
            "Genera exactamente este JSON (8-10 pares):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "pares": [\n'
            '    {"termino": "...", "definicion": "..."},\n'
            '    ...\n'
            '  ]\n'
            '}\n'
            "```"
        ),
        "syntax_sorting": (
            "El ejercicio es de ORDENAR LA ORACIÓN. Se muestra una frase y el usuario arma la oración "
            "tocando bloques de palabras desordenadas.\n"
            "Genera exactamente este JSON (5-6 ejercicios):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "ejercicios": [\n'
            '    {\n'
            '      "frase_correcta": "...",\n'
            '      "palabras_desordenadas": ["...", "..."],\n'
            '      "traduccion": "..."\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ),
        "multiple_choice": (
            "El ejercicio es de OPCIÓN MÚLTIPLE. Cada pregunta tiene 4 opciones y una respuesta correcta.\n"
            "Genera exactamente este JSON (6-8 preguntas):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "preguntas": [\n'
            '    {\n'
            '      "pregunta": "...",\n'
            '      "opciones": ["A", "B", "C", "D"],\n'
            '      "respuesta_correcta": 0,\n'
            '      "explicacion": "..."\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```\n"
            "respuesta_correcta es el índice (0-3) de la opción correcta."
        ) if tema_cat != "comprension_auditiva" else (
            "El ejercicio es de COMPRENSIÓN AUDITIVA con opción múltiple. "
            "El usuario ESCUCHARÁ un audio (generado automáticamente) y deberá responder una pregunta sobre lo que escuchó.\n"
            "IMPORTANTE: El campo 'audio_texto' contiene la frase que se convertirá en audio. NO la muestres en 'pregunta'.\n"
            "El campo 'pregunta' debe ser SOLO la pregunta sobre el audio (ej: '¿Qué dice la persona?', '¿A dónde va?').\n\n"
            "Genera exactamente este JSON (6-8 preguntas):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "Escucha el audio y selecciona la respuesta correcta.",\n'
            '  "preguntas": [\n'
            '    {\n'
            '      "audio_texto": "The train arrives at six p.m.",\n'
            '      "pregunta": "¿A qué hora llega el tren?",\n'
            '      "opciones": ["6:00 a.m.", "7:00 p.m.", "6:00 p.m.", "12:00 p.m."],\n'
            '      "respuesta_correcta": 2,\n'
            '      "explicacion": "...\'six p.m.\' = 6:00 p.m."\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```\n"
            "respuesta_correcta es el índice (0-3) de la opción correcta.\n"
            "audio_texto debe ser una frase COMPLETA en el idioma objetivo, apropiada para el nivel.\n"
            "pregunta debe estar en español y NO revelar el contenido del audio."
        ),
        "categorization": (
            "El ejercicio es de CATEGORIZACIÓN. El usuario clasifica palabras arrastrándolas a categorías.\n"
            "Genera exactamente este JSON (2 categorías, 8-10 palabras):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "categorias": ["Categoría A", "Categoría B"],\n'
            '  "palabras": [\n'
            '    {"palabra": "...", "categoria": 0},\n'
            '    ...\n'
            '  ]\n'
            '}\n'
            "```\n"
            "categoria es el índice (0 o 1) de la categoría correcta."
        ),
        "fill_blank": (
            "El ejercicio es de COMPLETAR EL HUECO. Una oración con una o dos palabras faltantes que "
            "el usuario debe escribir.\n"
            "Genera exactamente este JSON (6-8 ejercicios):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "ejercicios": [\n'
            '    {\n'
            '      "oracion": "They _____ to the cinema yesterday",\n'
            '      "respuesta": "went",\n'
            '      "pista": "Past tense of go"\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ) if tema_cat != "comprension_auditiva" else (
            "El ejercicio es de COMPRENSIÓN AUDITIVA con completar huecos. "
            "El usuario ESCUCHARÁ un audio y deberá completar la palabra faltante.\n"
            "IMPORTANTE: 'audio_texto' es la frase COMPLETA que se convertirá en audio.\n"
            "'oracion' es la misma frase pero con _____ en la palabra que falta.\n\n"
            "Genera exactamente este JSON (6-8 ejercicios):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "Escucha el audio y completa la palabra que falta.",\n'
            '  "ejercicios": [\n'
            '    {\n'
            '      "audio_texto": "They went to the cinema yesterday",\n'
            '      "oracion": "They _____ to the cinema yesterday",\n'
            '      "respuesta": "went",\n'
            '      "pista": "Past tense of go"\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ),
        "translation": (
            "El ejercicio es de TRADUCCIÓN DIRECTA. Se muestra una frase en español y el usuario la "
            "traduce completamente.\n"
            "Genera exactamente este JSON (5-6 ejercicios):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "ejercicios": [\n'
            '    {\n'
            '      "texto_original": "...",\n'
            '      "traduccion_correcta": "...",\n'
            '      "traducciones_alternativas": ["..."]\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ),
        "dictation": (
            "El ejercicio es de DICTADO. Se reproducirá un audio y el usuario debe escribir lo que escucha.\n"
            "Genera exactamente este JSON (5-6 frases, nivel adecuado):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "ejercicios": [\n'
            '    {\n'
            '      "texto": "The weather is beautiful today",\n'
            '      "traduccion": "El clima está hermoso hoy"\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ),
        "flashcards": (
            "El ejercicio es de TARJETAS GIRATORIAS (Flashcards). El usuario ve un concepto e intenta "
            "recordar su significado antes de voltear la tarjeta.\n"
            "Genera exactamente este JSON (8-10 tarjetas):\n"
            "```json\n"
            '{\n'
            '  "instrucciones": "...",\n'
            '  "tarjetas": [\n'
            '    {\n'
            '      "frente": "...",\n'
            '      "reverso": "...",\n'
            '      "ejemplo": "..."\n'
            '    }\n'
            '  ]\n'
            '}\n'
            "```"
        ),
    }

    schema_hint = json_schemas.get(tipo, json_schemas["multiple_choice"])

    return (
        base
        + schema_hint
        + "\n\nIMPORTANTE:\n"
        "- Responde SOLAMENTE con el JSON, sin texto extra antes o después.\n"
        "- Todo el contenido del ejercicio debe ser apropiado para el nivel indicado.\n"
        f"- Los ejemplos y vocabulario deben ser de {idioma_display} nivel {nivel}.\n"
        "- Las instrucciones deben estar en español.\n"
    )


async def _call_google(prompt: str) -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY no configurada.")
    model = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")
    async with httpx.AsyncClient(timeout=90) as client:
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
    """Generate a structured interactive exercise via Google Gemini."""
    # Validate language
    if payload.idioma not in IDIOMAS_PERMITIDOS:
        raise HTTPException(400, f"Idioma no soportado. Opciones: {IDIOMAS_PERMITIDOS}")

    # Validate topic
    if payload.tema_categoria not in TEMAS_CATEGORIAS:
        raise HTTPException(400, f"Categoría no válida. Opciones: {TEMAS_CATEGORIAS}")

    # Determine level
    unlocked = _get_unlocked_levels(db, current_user.id, payload.idioma)
    if payload.nivel:
        all_levels = _get_levels(payload.idioma)
        if payload.nivel not in all_levels:
            raise HTTPException(400, f"Nivel no válido para {payload.idioma}. Opciones: {all_levels}")
        if payload.nivel not in unlocked:
            raise HTTPException(
                403,
                f"Nivel {payload.nivel} no desbloqueado. "
                f"Completa {LESSONS_TO_UNLOCK} lecciones del nivel anterior. "
                f"Niveles disponibles: {unlocked}",
            )
        nivel = payload.nivel
    else:
        nivel = _get_current_level(db, current_user.id, payload.idioma)

    # Pick a random exercise type compatible with the topic
    compatible_types = TOPIC_EXERCISE_MAP.get(payload.tema_categoria, TIPOS_EJERCICIO)
    tipo = random.choice(compatible_types)

    # Build prompt and call Gemini
    prompt = _build_exercise_prompt(tipo, payload.tema_categoria, nivel, payload.idioma)

    try:
        raw_content = await _call_google(prompt)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error del proveedor de IA: {exc.response.text}",
        ) from exc

    # Try to extract clean JSON from the response
    json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
    if json_match:
        contenido = json_match.group()
        try:
            json.loads(contenido)
        except json.JSONDecodeError:
            contenido = raw_content
    else:
        contenido = raw_content

    # For comprension_auditiva: generate and cache TTS audio files
    if payload.tema_categoria == "comprension_auditiva":
        try:
            contenido = await _postprocess_audio(contenido, payload.idioma, tipo)
        except Exception:
            pass  # If audio generation fails, keep the lesson without audio

    tema_display = TEMA_DISPLAY.get(payload.tema_categoria, payload.tema_categoria)
    tipo_display = TIPO_DISPLAY.get(tipo, tipo)
    tema_titulo = f"{tema_display} — {tipo_display} ({nivel})"

    leccion = Leccion(
        tema=tema_titulo,
        contenido=contenido,
        idioma=payload.idioma,
        nivel=nivel,
        tipo_ejercicio=tipo,
        tema_categoria=payload.tema_categoria,
        proveedor_ia="google",
        usuario_id=current_user.id,
    )
    db.add(leccion)
    db.commit()
    db.refresh(leccion)
    return LeccionResponse.model_validate(leccion)


@app.post("/api/leccion/{leccion_id}/completar", response_model=LeccionResponse)
def completar_leccion(
    leccion_id: int,
    payload: CompletarLeccionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> LeccionResponse:
    """Mark a lesson as completed and update progress."""
    leccion = (
        db.query(Leccion)
        .filter(Leccion.id == leccion_id, Leccion.usuario_id == current_user.id)
        .first()
    )
    if not leccion:
        raise HTTPException(404, "Lección no encontrada.")
    if leccion.completada:
        raise HTTPException(400, "La lección ya fue completada.")

    leccion.completada = True
    leccion.puntuacion = payload.puntuacion
    leccion.resultado_json = payload.resultado_json

    # Update progress tracking
    prog = (
        db.query(ProgresoNivel)
        .filter(
            ProgresoNivel.usuario_id == current_user.id,
            ProgresoNivel.idioma == leccion.idioma,
            ProgresoNivel.nivel == leccion.nivel,
        )
        .first()
    )
    if not prog:
        prog = ProgresoNivel(
            usuario_id=current_user.id,
            idioma=leccion.idioma,
            nivel=leccion.nivel,
            completadas=0,
            temas_completados="",
        )
        db.add(prog)

    prog.completadas += 1
    # Track topic completion
    existing_topics = set(t for t in prog.temas_completados.split(",") if t)
    existing_topics.add(leccion.tema_categoria)
    prog.temas_completados = ",".join(sorted(existing_topics))

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
# Progress endpoints
# ---------------------------------------------------------------------------

@app.get("/api/progreso/{idioma}", response_model=ProgresoResponse)
def obtener_progreso(
    idioma: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> ProgresoResponse:
    """Get the user's progress for a specific language."""
    if idioma not in IDIOMAS_PERMITIDOS:
        raise HTTPException(400, f"Idioma no soportado. Opciones: {IDIOMAS_PERMITIDOS}")

    nivel_actual = _get_current_level(db, current_user.id, idioma)
    unlocked = _get_unlocked_levels(db, current_user.id, idioma)

    prog = (
        db.query(ProgresoNivel)
        .filter(
            ProgresoNivel.usuario_id == current_user.id,
            ProgresoNivel.idioma == idioma,
            ProgresoNivel.nivel == nivel_actual,
        )
        .first()
    )

    completadas = prog.completadas if prog else 0
    temas = [t for t in (prog.temas_completados.split(",") if prog else []) if t]

    return ProgresoResponse(
        idioma=idioma,
        nivel_actual=nivel_actual,
        completadas=completadas,
        necesarias=LESSONS_TO_UNLOCK,
        temas_completados=temas,
        niveles_desbloqueados=unlocked,
    )


@app.get("/api/progreso", response_model=list[ProgresoResponse])
def obtener_todo_progreso(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> list[ProgresoResponse]:
    """Get progress for all languages."""
    result = []
    for idioma in IDIOMAS_PERMITIDOS:
        nivel_actual = _get_current_level(db, current_user.id, idioma)
        unlocked = _get_unlocked_levels(db, current_user.id, idioma)
        prog = (
            db.query(ProgresoNivel)
            .filter(
                ProgresoNivel.usuario_id == current_user.id,
                ProgresoNivel.idioma == idioma,
                ProgresoNivel.nivel == nivel_actual,
            )
            .first()
        )
        completadas = prog.completadas if prog else 0
        temas = [t for t in (prog.temas_completados.split(",") if prog else []) if t]
        result.append(ProgresoResponse(
            idioma=idioma,
            nivel_actual=nivel_actual,
            completadas=completadas,
            necesarias=LESSONS_TO_UNLOCK,
            temas_completados=temas,
            niveles_desbloqueados=unlocked,
        ))
    return result


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

IDIOMA_LABELS = {
    "espanol": "Español",
    "ingles": "Inglés",
    "japones": "Japonés",
    "aleman": "Alemán",
}

TEMA_LABELS = {
    "vocabulario_tematico": "Vocabulario Temático",
    "gramatica_practica": "Gramática Práctica",
    "comprension_auditiva": "Comprensión Auditiva",
    "expresion_oral": "Expresión Oral",
    "lectura_escritura": "Lectura y Escritura",
    "cultura_modismos": "Cultura y Modismos",
}

TIPO_LABELS = {
    "matching": "Unir pares",
    "syntax_sorting": "Ordenar oración",
    "multiple_choice": "Opción múltiple",
    "categorization": "Categorización",
    "fill_blank": "Completar hueco",
    "translation": "Traducción",
    "dictation": "Dictado",
    "flashcards": "Flashcards",
}


@app.get("/api/estadisticas")
def obtener_estadisticas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Return user statistics: weekly activity + global summary."""
    all_lessons = (
        db.query(Leccion)
        .filter(Leccion.usuario_id == current_user.id)
        .all()
    )
    completed_lessons = [l for l in all_lessons if l.completada]

    # ── Weekly activity (last 7 days) ──
    today = datetime.now(timezone.utc).date()
    week_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_lessons = [
            l for l in completed_lessons
            if l.created_at and l.created_at.date() == day
        ]
        week_data.append({
            "date": day.isoformat(),
            "day_name": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][day.weekday()],
            "count": len(day_lessons),
            "avg_score": (
                round(sum(l.puntuacion for l in day_lessons) / len(day_lessons))
                if day_lessons else 0
            ),
        })

    # ── Global summary ──
    total = len(all_lessons)
    total_completed = len(completed_lessons)
    avg_score = (
        round(sum(l.puntuacion for l in completed_lessons) / total_completed)
        if total_completed else 0
    )
    best_score = max((l.puntuacion for l in completed_lessons), default=0)

    # Per-language breakdown
    lang_stats = {}
    for l in all_lessons:
        lang = l.idioma
        if lang not in lang_stats:
            lang_stats[lang] = {"total": 0, "completed": 0, "sum_score": 0, "label": IDIOMA_LABELS.get(lang, lang)}
        lang_stats[lang]["total"] += 1
        if l.completada:
            lang_stats[lang]["completed"] += 1
            lang_stats[lang]["sum_score"] += l.puntuacion

    per_language = []
    for lang, s in lang_stats.items():
        per_language.append({
            "idioma": lang,
            "label": s["label"],
            "total": s["total"],
            "completed": s["completed"],
            "avg_score": round(s["sum_score"] / s["completed"]) if s["completed"] else 0,
        })
    per_language.sort(key=lambda x: x["completed"], reverse=True)

    # Favorite topic (most completed)
    topic_counts = {}
    for l in completed_lessons:
        cat = l.tema_categoria
        topic_counts[cat] = topic_counts.get(cat, 0) + 1
    favorite_topic = max(topic_counts, key=topic_counts.get) if topic_counts else None

    # Favorite exercise type
    type_counts = {}
    for l in completed_lessons:
        t = l.tipo_ejercicio
        type_counts[t] = type_counts.get(t, 0) + 1
    favorite_type = max(type_counts, key=type_counts.get) if type_counts else None

    # Per-topic breakdown
    per_topic = [
        {"topic": k, "label": TEMA_LABELS.get(k, k), "count": v}
        for k, v in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Per-type breakdown
    per_type = [
        {"type": k, "label": TIPO_LABELS.get(k, k), "count": v}
        for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "weekly_activity": week_data,
        "summary": {
            "total_lessons": total,
            "total_completed": total_completed,
            "pending": total - total_completed,
            "avg_score": avg_score,
            "best_score": best_score,
            "favorite_topic": TEMA_LABELS.get(favorite_topic, favorite_topic) if favorite_topic else None,
            "favorite_type": TIPO_LABELS.get(favorite_type, favorite_type) if favorite_type else None,
            "per_language": per_language,
            "per_topic": per_topic,
            "per_type": per_type,
        },
    }


# ---------------------------------------------------------------------------
# TTS – edge-tts
# ---------------------------------------------------------------------------

TTS_VOICES: dict[str, str] = {
    "espanol": "es-MX-DaliaNeural",
    "ingles": "en-US-AriaNeural",
    "japones": "ja-JP-NanamiNeural",
    "aleman": "de-DE-KatjaNeural",
}

# ---------------------------------------------------------------------------
# Audio cache for listening exercises
# ---------------------------------------------------------------------------

AUDIO_CACHE_DIR = Path(__file__).parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(exist_ok=True)


async def _generate_cached_audio(text: str, idioma: str) -> str:
    """Generate TTS audio and cache it. Returns the filename."""
    import edge_tts

    voice = TTS_VOICES.get(idioma, TTS_VOICES["ingles"])
    text_hash = hashlib.sha256(f"{text}:{voice}".encode()).hexdigest()[:16]
    filename = f"{text_hash}.mp3"
    filepath = AUDIO_CACHE_DIR / filename

    if filepath.exists():
        return filename

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(filepath))
    return filename


async def _postprocess_audio(contenido_json: str, idioma: str, tipo: str) -> str:
    """For comprension_auditiva lessons, generate audio files and inject URLs."""
    try:
        data = json.loads(contenido_json)
    except json.JSONDecodeError:
        return contenido_json

    if tipo == "multiple_choice":
        for pregunta in data.get("preguntas", []):
            audio_text = pregunta.get("audio_texto", "")
            if audio_text:
                fname = await _generate_cached_audio(audio_text, idioma)
                pregunta["audio_url"] = f"/api/audio/{fname}"
    elif tipo == "dictation":
        for ej in data.get("ejercicios", []):
            audio_text = ej.get("texto", "")
            if audio_text:
                fname = await _generate_cached_audio(audio_text, idioma)
                ej["audio_url"] = f"/api/audio/{fname}"
    elif tipo == "fill_blank":
        for ej in data.get("ejercicios", []):
            audio_text = ej.get("audio_texto", "")
            if audio_text:
                fname = await _generate_cached_audio(audio_text, idioma)
                ej["audio_url"] = f"/api/audio/{fname}"

    return json.dumps(data, ensure_ascii=False)


@app.get("/api/audio/{filename}")
def serve_audio(filename: str):
    """Serve a cached TTS audio file."""
    # Sanitize: only allow alphanumeric + dot + dash
    if not re.match(r"^[a-f0-9]+\.mp3$", filename):
        raise HTTPException(400, "Nombre de archivo inválido.")
    filepath = AUDIO_CACHE_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "Audio no encontrado.")
    return FileResponse(filepath, media_type="audio/mpeg")


@app.post("/api/tts")
async def text_to_speech(payload: TTSRequest):
    """Generate speech audio from text using edge-tts."""
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(503, "edge-tts no está instalado. Ejecuta: pip install edge-tts")

    voice = TTS_VOICES.get(payload.idioma, TTS_VOICES["ingles"])
    communicate = edge_tts.Communicate(payload.texto, voice)

    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )

# ---------------------------------------------------------------------------
# Local SLM chat – grammar correction and conversational feedback
# ---------------------------------------------------------------------------

LOCAL_MODEL_URL: str = os.getenv(
    "LOCAL_MODEL_URL", "http://localhost:11434/api/generate"
)
LOCAL_MODEL_NAME: str = os.getenv("LOCAL_MODEL_NAME", "qwen3:8b")

MAX_CONVERSATIONS = 5
CONTEXT_MESSAGES = 6  # last N messages sent as context to LLM


def _build_chat_prompt(
    mensaje: str,
    history: list[dict] | None = None,
    leccion_adjunta: dict | None = None,
) -> str:
    """Build a chat prompt with optional history and lesson attachment."""
    parts = []

    # System instruction
    if leccion_adjunta:
        parts.append(
            "Eres un tutor de idiomas experto, amigable y paciente. "
            "El estudiante acaba de completar una lección y te la adjunta para que la analices."
        )
    else:
        parts.append(
            "Eres un tutor de idiomas amigable, paciente y conversacional. "
            "Puedes ayudar con cualquier idioma que el estudiante quiera practicar. "
            "NO des correcciones gramaticales a menos que el estudiante te lo pida explícitamente. "
            "Simplemente conversa de forma natural y responde sus preguntas."
        )

    # Conversation history
    if history:
        parts.append("\n\n=== HISTORIAL DE CONVERSACIÓN ===")
        for h in history:
            parts.append(f"Estudiante: {h['user']}")
            if h.get('ai'):
                parts.append(f"Tutor: {h['ai']}")
        parts.append("=== FIN DEL HISTORIAL ===\n")

    # Lesson attachment
    if leccion_adjunta:
        parts.append(
            f"\n=== DATOS DE LA LECCIÓN ===\n"
            f"Idioma: {leccion_adjunta.get('idioma', '')}\n"
            f"Nivel: {leccion_adjunta.get('nivel', '')}\n"
            f"Tema: {leccion_adjunta.get('tema', '')}\n"
            f"Tipo de ejercicio: {leccion_adjunta.get('tipo_ejercicio', '')}\n"
            f"Puntuación: {leccion_adjunta.get('puntuacion', 0)}%\n"
            f"Contenido del ejercicio:\n{leccion_adjunta.get('contenido', '')}\n"
            f"Resultados del estudiante:\n{leccion_adjunta.get('resultado_json', '')}\n"
            f"=== FIN DE DATOS ===\n"
        )

    parts.append(f'\nMensaje del estudiante: "{mensaje}"\n')
    parts.append("Responde de forma clara y amigable en español (o en el idioma que el estudiante use).")

    return "\n".join(parts)


# ── Conversation CRUD ─────────────────────────────────────────────────

@app.get("/api/chat/conversaciones")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """List user's conversations (newest first, max 5)."""
    convos = (
        db.query(Conversacion)
        .filter(Conversacion.usuario_id == current_user.id)
        .order_by(Conversacion.updated_at.desc())
        .limit(MAX_CONVERSATIONS)
        .all()
    )
    result = []
    for c in convos:
        msg_count = (
            db.query(Mensaje)
            .filter(Mensaje.conversacion_id == c.id)
            .count()
        )
        result.append({
            "id": c.id,
            "titulo": c.titulo,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "updated_at": c.updated_at.isoformat() if c.updated_at else "",
            "message_count": msg_count,
        })
    return result


@app.post("/api/chat/conversacion")
def create_conversation(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Create a new conversation. Enforces max 5: auto-deletes oldest."""
    existing = (
        db.query(Conversacion)
        .filter(Conversacion.usuario_id == current_user.id)
        .order_by(Conversacion.updated_at.desc())
        .all()
    )
    # Delete oldest if at limit
    while len(existing) >= MAX_CONVERSATIONS:
        oldest = existing.pop()
        db.delete(oldest)
    db.flush()

    conv = Conversacion(
        titulo="Nueva conversación",
        usuario_id=current_user.id,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "titulo": conv.titulo,
        "created_at": conv.created_at.isoformat() if conv.created_at else "",
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else "",
        "message_count": 0,
    }


@app.get("/api/chat/conversacion/{conv_id}")
def get_conversation_messages(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Get all messages for a conversation."""
    conv = (
        db.query(Conversacion)
        .filter(Conversacion.id == conv_id, Conversacion.usuario_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    msgs = (
        db.query(Mensaje)
        .filter(Mensaje.conversacion_id == conv_id)
        .order_by(Mensaje.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "texto_usuario": m.texto_usuario,
            "respuesta_ia": m.respuesta_ia,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in msgs
    ]


@app.delete("/api/chat/conversacion/{conv_id}")
def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
):
    """Delete a conversation and its messages."""
    conv = (
        db.query(Conversacion)
        .filter(Conversacion.id == conv_id, Conversacion.usuario_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    db.delete(conv)
    db.commit()
    return {"message": "Conversación eliminada."}


# ── Chat with LLM ─────────────────────────────────────────────────────

@app.post("/api/chat/local", response_model=ChatResponse)
async def chat_local(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_get_current_user),
) -> ChatResponse:
    """
    Send a message to the local SLM (via Ollama).
    Messages are persisted to a conversation. History is sent as context.
    """
    # Resolve or create conversation
    conv = None
    if payload.conversacion_id:
        conv = (
            db.query(Conversacion)
            .filter(
                Conversacion.id == payload.conversacion_id,
                Conversacion.usuario_id == current_user.id,
            )
            .first()
        )
    if not conv:
        # Auto-create and enforce limit
        existing = (
            db.query(Conversacion)
            .filter(Conversacion.usuario_id == current_user.id)
            .order_by(Conversacion.updated_at.desc())
            .all()
        )
        while len(existing) >= MAX_CONVERSATIONS:
            oldest = existing.pop()
            db.delete(oldest)
        db.flush()
        conv = Conversacion(
            titulo=payload.mensaje[:80],
            usuario_id=current_user.id,
        )
        db.add(conv)
        db.flush()

    # Load recent history
    recent = (
        db.query(Mensaje)
        .filter(Mensaje.conversacion_id == conv.id)
        .order_by(Mensaje.created_at.desc())
        .limit(CONTEXT_MESSAGES)
        .all()
    )
    recent.reverse()
    history = [{"user": m.texto_usuario, "ai": m.respuesta_ia or ""} for m in recent]

    # Build prompt
    leccion_dict = payload.leccion_adjunta.model_dump() if payload.leccion_adjunta else None
    prompt = _build_chat_prompt(payload.mensaje, history, leccion_dict)

    respuesta_texto = ""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                LOCAL_MODEL_URL,
                json={
                    "model": LOCAL_MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                },
            )
        resp.raise_for_status()
        respuesta_texto = resp.json().get("response", "")
    except (httpx.ConnectError, httpx.HTTPStatusError):
        respuesta_texto = (
            "El modelo local no está disponible. "
            "Inicia Ollama con `ollama serve` y descarga el modelo con "
            f"`ollama pull {LOCAL_MODEL_NAME}`."
        )

    # Save message
    mensaje_db = Mensaje(
        texto_usuario=payload.mensaje,
        respuesta_ia=respuesta_texto,
        usuario_id=current_user.id,
        conversacion_id=conv.id,
    )
    db.add(mensaje_db)

    # Update conversation title from first message
    msg_count = db.query(Mensaje).filter(Mensaje.conversacion_id == conv.id).count()
    if msg_count == 0:
        conv.titulo = payload.mensaje[:80]

    db.commit()
    db.refresh(mensaje_db)

    return ChatResponse(
        respuesta=respuesta_texto,
        mensaje_id=mensaje_db.id,
        conversacion_id=conv.id,
    )


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
