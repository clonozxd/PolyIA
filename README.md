# 🌐 PolyIA — Tutor Inteligente de Idiomas

Una aplicación Full-Stack para aprender idiomas con IA híbrida:

- **Lecciones interactivas** generadas por Google Gemini con 8 tipos de ejercicios.
- **Chat en tiempo real** con corrección gramatical ejecutado por un modelo local (Qwen 3 8B) vía Ollama.
- **Sistema de niveles** CEFR (A1→C2) para Español/Inglés/Alemán y JLPT (N5→N1) para Japonés.
- **Text-to-Speech** con voces neuronales de Microsoft Edge (edge-tts) para dictados y pronunciación.
- **Modo oscuro / claro** con persistencia.

---

## 🏗️ Stack Tecnológico

| Capa          | Tecnología                                                |
| ------------- | --------------------------------------------------------- |
| Frontend      | React 18 + Vite + Tailwind CSS + React Router v6         |
| Backend       | Python 3.11+ · FastAPI · SQLAlchemy · JWT auth            |
| Base de datos | PostgreSQL 16 (Docker, puerto externo **5433**)           |
| IA en la nube | Google Gemini 2.0 Flash (generación de lecciones)         |
| IA local      | Ollama + **Qwen 3 (8B)** — chat tutor en tu máquina      |
| TTS           | edge-tts — voces neuronales de Microsoft Edge             |

---

## 🎮 Tipos de Ejercicios

| Tipo | Descripción |
|------|-------------|
| **Matching** | Unir pares de términos con definiciones/traducciones |
| **Syntax Sorting** | Ordenar palabras desordenadas para formar oraciones |
| **Multiple Choice** | Opción múltiple con explicación por pregunta |
| **Categorization** | Clasificar palabras en categorías arrastrándolas |
| **Fill in the Blank** | Completar el hueco con la palabra correcta |
| **Translation** | Traducir una frase completa al idioma objetivo |
| **Dictation** | Escuchar audio TTS y escribir lo que se escuchó |
| **Flashcards** | Tarjetas giratorias con sistema de autoevaluación |

---

## 📚 Temas y Categorías

1. **Vocabulario Temático** — Situaciones cotidianas, categorías de palabras, flashcards
2. **Gramática Práctica** — Estructuras, tiempos verbales, ejercicios de relleno
3. **Comprensión Auditiva** — Dictados, preguntas sobre audio, diálogos
4. **Expresión Oral** — Pronunciación, dictado, traducción de voz
5. **Lectura y Escritura** — Traducción, textos, ordenar oraciones
6. **Cultura y Modismos** — Frases hechas, flashcards, opción múltiple

---

## 🎯 Sistema de Progresión

- **Idiomas soportados**: Español 🇪🇸, Inglés 🇬🇧, Japonés 🇯🇵, Alemán 🇩🇪
- **Niveles**: CEFR (A1 → A2 → B1 → B2 → C1 → C2) para ES/EN/DE, JLPT (N5 → N4 → N3 → N2 → N1) para JP
- **Desbloqueo**: Se necesitan **10 lecciones completadas** en el nivel actual para desbloquear el siguiente
- **Temas**: El usuario debe completar al menos 1 ejercicio de cada categoría de tema
- **Ejercicios aleatorios**: El tipo de ejercicio se asigna aleatoriamente (según compatibilidad con el tema)

---

## 📁 Estructura del Proyecto

```
PolyIA/
├── docker-compose.yml          # Levanta PostgreSQL (puerto 5433)
├── .gitignore
├── README.md
├── frontend/                   # React + Vite + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js          # Proxy → backend :8001
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       ├── App.jsx             # Rutas protegidas
│       ├── context/
│       │   ├── AuthContext.jsx  # Auth global (JWT)
│       │   └── ThemeContext.jsx # Tema oscuro/claro
│       ├── services/
│       │   └── api.js          # Axios configurado
│       └── components/
│           ├── LoginForm.jsx    # Login + Registro
│           ├── Dashboard.jsx    # Panel + generación de lecciones
│           ├── LessonExercise.jsx # Renderer interactivo de ejercicios
│           └── ChatTutor.jsx    # Chat con tutor local
└── backend/                    # FastAPI
    ├── main.py                 # App, CORS, endpoints
    ├── database.py             # Conexión SQLAlchemy (psycopg v3)
    ├── models.py               # Tablas ORM
    ├── schemas.py              # Pydantic schemas
    ├── requirements.txt
    └── .env                    # Variables de entorno (no se sube a git)
```

---

## 🚀 Despliegue Local — Paso a Paso

### Prerrequisitos

| Herramienta | Versión mínima | Enlace |
|---|---|---|
| Node.js | 20+ | https://nodejs.org/ |
| Python | 3.11+ | https://www.python.org/ |
| Docker Desktop | cualquiera | https://www.docker.com/products/docker-desktop/ |
| Ollama | — | https://ollama.com/ |

Necesitas una API key de [Google AI Studio](https://aistudio.google.com/) para la generación de lecciones.

---

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/clonozxd/PolyIA.git
cd PolyIA
```

---

### Paso 2 — Levantar la base de datos (PostgreSQL con Docker)

```bash
docker compose up -d
```

> El contenedor `polyia_db` mapea el puerto **5433** del host al 5432 interno.
> Credenciales por defecto: `polyia / polyia_secret` — base de datos: `polyia_db`.

---

### Paso 3 — Configurar y ejecutar el Backend

#### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install "psycopg[binary]"      # necesario en Windows
```

#### macOS / Linux

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Crear el archivo `.env`

Crea `backend/.env` con este contenido:

```env
# PostgreSQL
DATABASE_URL=postgresql://polyia:polyia_secret@localhost:5433/polyia_db
POSTGRES_DB=polyia_db
POSTGRES_PORT=5433

# JWT
SECRET_KEY=cambia-esto-por-una-cadena-aleatoria-larga
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Google Gemini (generación de lecciones)
GOOGLE_API_KEY=tu-api-key-de-google
GOOGLE_MODEL=gemini-2.0-flash

# Ollama (chat tutor local)
LOCAL_MODEL_URL=http://localhost:11434/api/generate
LOCAL_MODEL_NAME=qwen3:8b
```

#### Iniciar el backend

```bash
uvicorn main:app --reload --port 8001
```

> **Importante:** El backend corre en el puerto **8001**. El proxy de Vite ya apunta ahí.

La API estará en `http://localhost:8001` y la documentación interactiva en `http://localhost:8001/docs`.

---

### Paso 4 — Configurar y ejecutar el Frontend

```bash
cd ../frontend
npm install
npm run dev
```

La aplicación estará en **`http://localhost:5173`**.

---

### Paso 5 — Modelo local con Ollama

```bash
ollama pull qwen3:8b    # descarga ~5 GB
ollama serve            # servidor en localhost:11434
```

El backend detecta Ollama automáticamente. Si no está disponible, `/api/chat/local` indicará cómo activarlo.

---

## ⚡ Inicio Rápido (si ya tienes todo instalado)

Abre **3 terminales** y ejecuta:

```powershell
# Terminal 1 — Base de datos
docker compose up -d

# Terminal 2 — Backend
cd backend
.\.venv\Scripts\Activate.ps1          # Windows
# source .venv/bin/activate           # macOS/Linux
uvicorn main:app --reload --port 8001

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Abre **http://localhost:5173** en tu navegador. Listo.

Para detener todo:

```powershell
docker compose down
# Ctrl+C en las terminales de backend y frontend
```

---

## 📡 Endpoints de la API

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registro (`email`, `password`, `nombre`) | No |
| POST | `/api/auth/login` | Login — devuelve JWT | No |
| GET | `/api/auth/me` | Perfil del usuario autenticado | JWT |
| POST | `/api/leccion/generar` | Genera lección interactiva vía Gemini | JWT |
| POST | `/api/leccion/{id}/completar` | Marca lección como completada | JWT |
| GET | `/api/leccion/lista` | Lista lecciones del usuario | JWT |
| GET | `/api/progreso/{idioma}` | Progreso por idioma | JWT |
| GET | `/api/progreso` | Progreso de todos los idiomas | JWT |
| POST | `/api/tts` | Text-to-Speech (edge-tts) | No |
| POST | `/api/chat/local` | Chat con SLM local + corrección | JWT |
| GET | `/health` | Health-check del servidor | No |

---

## 🗄️ Schema de la Base de Datos

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    nombre           VARCHAR(100) NOT NULL DEFAULT '',
    hashed_password  VARCHAR(255) NOT NULL,
    nivel_idioma     VARCHAR(50)  NOT NULL DEFAULT 'principiante',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecciones (
    id              SERIAL PRIMARY KEY,
    tema            VARCHAR(255) NOT NULL,
    contenido       TEXT         NOT NULL,
    idioma          VARCHAR(50)  NOT NULL DEFAULT 'ingles',
    nivel           VARCHAR(10)  NOT NULL DEFAULT 'A1',
    tipo_ejercicio  VARCHAR(50)  NOT NULL DEFAULT 'multiple_choice',
    tema_categoria  VARCHAR(100) NOT NULL DEFAULT 'vocabulario_tematico',
    completada      BOOLEAN      NOT NULL DEFAULT FALSE,
    puntuacion      INTEGER      NOT NULL DEFAULT 0,
    resultado_json  TEXT,
    proveedor_ia    VARCHAR(50)  NOT NULL DEFAULT 'google',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usuario_id      INTEGER      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progreso_nivel (
    id                 SERIAL PRIMARY KEY,
    idioma             VARCHAR(50)  NOT NULL,
    nivel              VARCHAR(10)  NOT NULL,
    completadas        INTEGER      NOT NULL DEFAULT 0,
    temas_completados  TEXT         NOT NULL DEFAULT '',
    usuario_id         INTEGER      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    UNIQUE (usuario_id, idioma, nivel)
);

CREATE TABLE IF NOT EXISTS mensajes (
    id            SERIAL PRIMARY KEY,
    texto_usuario TEXT        NOT NULL,
    respuesta_ia  TEXT,
    correccion_ia TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id    INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE
);
```

---

## 🔒 Variables de Entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo / Default |
|----------|-------------|-------------------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://polyia:polyia_secret@localhost:5433/polyia_db` |
| `SECRET_KEY` | Secreto para firmar JWT — **cámbialo** | string aleatorio largo |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token JWT | `60` |
| `ALLOWED_ORIGINS` | Orígenes CORS (coma-separados) | `http://localhost:5173` |
| `GOOGLE_API_KEY` | API key de Google AI | `AIza...` |
| `GOOGLE_MODEL` | Modelo de Gemini | `gemini-2.0-flash` |
| `LOCAL_MODEL_URL` | URL del servidor Ollama | `http://localhost:11434/api/generate` |
| `LOCAL_MODEL_NAME` | Modelo Ollama | `qwen3:8b` |

### Frontend (`frontend/.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | URL del backend (vacío = usa proxy Vite) | `""` |
