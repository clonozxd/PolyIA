# 🌐 PolyIA — Tutor Inteligente de Idiomas

Una aplicación Full-Stack para aprender idiomas con IA híbrida:

- **Lecciones y actividades** generadas por una API en la nube (OpenAI GPT, Anthropic Claude o Google Gemini).
- **Chat en tiempo real** con corrección gramatical ejecutado por un modelo de lenguaje local (SLM) vía Ollama.

---

## 🏗️ Stack Tecnológico

| Capa          | Tecnología                                                |
| ------------- | --------------------------------------------------------- |
| Frontend      | React 18 + Vite + Tailwind CSS + React Router v6         |
| Backend       | Python 3.11+ · FastAPI · SQLAlchemy · JWT auth            |
| Base de datos | PostgreSQL 16 (Docker, puerto externo **5433**)           |
| IA en la nube | OpenAI GPT-4o-mini / Claude 3 Haiku / Gemini Flash       |
| IA local      | Ollama + Qwen 2.5 (3 B) — corre en tu máquina            |

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
│       │   └── AuthContext.jsx # Auth global (JWT)
│       ├── services/
│       │   └── api.js          # Axios configurado
│       └── components/
│           ├── LoginForm.jsx   # Login + Registro (email, contraseña, nombre)
│           ├── Dashboard.jsx   # Panel principal + lecciones
│           └── ChatTutor.jsx   # Chat con tutor local
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
| Ollama *(opcional)* | — | https://ollama.com/ |

Necesitas al menos **una** API key de: [OpenAI](https://platform.openai.com/), [Anthropic](https://console.anthropic.com/) o [Google AI Studio](https://aistudio.google.com/).

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

Verifica que el contenedor esté corriendo:

```bash
docker compose ps
```

> El contenedor `polyia_db` mapea el puerto **5433** del host al 5432 interno.
> Credenciales por defecto: `polyia / polyia_secret` — base de datos: `polyia_db`.

---

### Paso 3 — Configurar y ejecutar el Backend

#### macOS / Linux

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install "psycopg[binary]"      # necesario en Windows
```

#### Crear el archivo `.env`

Crea `backend/.env` con este contenido (ajusta tus API keys):

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

# Cloud LLM — rellena al menos una
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-haiku-20240307

GOOGLE_API_KEY=
GOOGLE_MODEL=gemini-3-flash-preview

# Ollama (opcional)
LOCAL_MODEL_URL=http://localhost:11434/api/generate
LOCAL_MODEL_NAME=qwen2.5:3b
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

La aplicación estará en **`http://localhost:5173`**. El proxy de Vite redirige las peticiones `/api/*` al backend en `:8001`.

---

### Paso 5 — (Opcional) Modelo local con Ollama

```bash
ollama pull qwen2.5:3b   # descarga ~2 GB
ollama serve             # servidor en localhost:11434
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

## 🧪 Resumen de comandos

| Acción                       | Comando                                        |
| ---------------------------- | ---------------------------------------------- |
| Levantar DB                  | `docker compose up -d`                         |
| Iniciar backend              | `uvicorn main:app --reload --port 8001`        |
| Iniciar frontend             | `npm run dev` (desde `frontend/`)              |
| Build de producción frontend | `npm run build` (desde `frontend/`)            |
| Bajar DB                     | `docker compose down`                          |

---

## 📡 Endpoints de la API

| Método | Ruta                   | Descripción                                | Auth |
| ------ | ---------------------- | ------------------------------------------ | ---- |
| POST   | `/api/auth/register`   | Registro (`email`, `password`, `nombre`)   | No   |
| POST   | `/api/auth/login`      | Login — devuelve JWT                       | No   |
| GET    | `/api/auth/me`         | Perfil del usuario autenticado             | JWT  |
| POST   | `/api/leccion/generar` | Genera lección vía IA en la nube           | JWT  |
| GET    | `/api/leccion/lista`   | Lista lecciones del usuario                | JWT  |
| POST   | `/api/chat/local`      | Chat con SLM local + corrección gramatical | JWT  |
| GET    | `/health`              | Health-check del servidor                  | No   |

---

## 🗄️ Schema de la Base de Datos

SQLAlchemy crea las tablas automáticamente al iniciar el backend. Si prefieres crearlas manualmente:

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
    id           SERIAL PRIMARY KEY,
    tema         VARCHAR(255) NOT NULL,
    contenido    TEXT         NOT NULL,
    proveedor_ia VARCHAR(50)  NOT NULL DEFAULT 'openai',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usuario_id   INTEGER      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE
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

| Variable                      | Descripción                             | Ejemplo / Default                                            |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                | Conexión PostgreSQL                     | `postgresql://polyia:polyia_secret@localhost:5433/polyia_db`  |
| `SECRET_KEY`                  | Secreto para firmar JWT — **cámbialo**  | string aleatorio largo                                       |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token JWT                  | `60`                                                         |
| `ALLOWED_ORIGINS`             | Orígenes CORS (coma-separados)          | `http://localhost:5173`                                      |
| `OPENAI_API_KEY`              | API key de OpenAI                       | `sk-...`                                                     |
| `ANTHROPIC_API_KEY`           | API key de Anthropic                    | `sk-ant-...`                                                 |
| `GOOGLE_API_KEY`              | API key de Google AI                    | `AIza...`                                                    |
| `LOCAL_MODEL_URL`             | URL del servidor Ollama                 | `http://localhost:11434/api/generate`                        |
| `LOCAL_MODEL_NAME`            | Modelo Ollama                           | `qwen2.5:3b`                                                |

### Frontend (`frontend/.env`)

| Variable            | Descripción                                             | Default   |
| ------------------- | ------------------------------------------------------- | --------- |
| `VITE_API_BASE_URL` | URL base del backend (vacío = usa Vite proxy)           | *(vacío)* |

---

## 🔮 Escalabilidad Futura

- **Alembic** para migraciones de BD (`alembic init alembic`).
- **Async FastAPI** con `create_async_engine` + `asyncpg`.
- **Streaming** de respuestas con `StreamingResponse`.
- **WebSockets** para el chat en tiempo real.
- **Redis** para caché de lecciones generadas.
- **Múltiples idiomas** — el campo `nivel_idioma` se selecciona por lección/chat, no en el registro.

---

## 🐛 Notas para Windows

| Problema | Solución |
|---|---|
| `UnicodeDecodeError` con `psycopg2` | Se usa `psycopg` v3 en lugar de `psycopg2`. Instalar con `pip install "psycopg[binary]"`. |
| Puerto 5432 ocupado por PostgreSQL local | Docker mapea al puerto **5433** (`docker-compose.yml`). |
| Puerto 8000 con procesos fantasma | El backend usa el puerto **8001** por defecto. |
| `bcrypt` error con `passlib` | `bcrypt` está fijado a `4.0.1` en `requirements.txt`. |
