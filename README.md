# 🌐 PolyIA — Tutor Inteligente de Idiomas

Una aplicación Full-Stack para aprender idiomas con IA híbrida:

- **Lecciones y actividades** generadas por una API en la nube (OpenAI GPT, Anthropic Claude o Google Gemini).
- **Chat en tiempo real** con corrección gramatical ejecutado por un modelo de lenguaje local (SLM) vía Ollama.

---

## 🏗️ Stack Tecnológico

| Capa       | Tecnología                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 18 + Vite + Tailwind CSS + React Router v6     |
| Backend    | Python 3.11+ · FastAPI · SQLAlchemy · JWT auth       |
| Base de datos | PostgreSQL 16 (Docker)                            |
| IA en la nube | OpenAI GPT-4o-mini / Claude 3 Haiku / Gemini 1.5 Flash |
| IA local   | Ollama + Qwen 2.5 (3 B) — corre en tu máquina       |

---

## 📁 Estructura del Proyecto

```
PolyIA/
├── docker-compose.yml          # Levanta PostgreSQL
├── .gitignore
├── README.md
├── frontend/                   # React + Vite + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       ├── App.jsx             # Rutas protegidas
│       ├── context/
│       │   └── AuthContext.jsx # Auth global (JWT)
│       ├── services/
│       │   └── api.js          # Axios configurado
│       └── components/
│           ├── LoginForm.jsx   # Login + Registro
│           ├── Dashboard.jsx   # Panel principal + lecciones
│           └── ChatTutor.jsx   # Chat con tutor local
└── backend/                    # FastAPI
    ├── main.py                 # App, CORS, endpoints
    ├── database.py             # Conexión SQLAlchemy
    ├── models.py               # Tablas ORM
    ├── schemas.py              # Pydantic schemas
    ├── requirements.txt
    └── .env.example
```
---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos

- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para PostgreSQL)
- [Ollama](https://ollama.com/) *(opcional — para el chat local)*
- Al menos una API key de: [OpenAI](https://platform.openai.com/), [Anthropic](https://console.anthropic.com/) o [Google AI Studio](https://aistudio.google.com/)

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

> La base de datos queda disponible en `localhost:5432` con las credenciales por defecto `polyia / polyia_secret`.

---

### Windows — Iniciar (tras la instalación)

Si ya instalaste dependencias, creaste el `.env` y configuraste todo, estos son los comandos mínimos para arrancar la app en Windows (PowerShell). Ejecuta cada comando en terminales separadas cuando corresponda.

- Levantar la base de datos (si está apagada):

```powershell
cd C:\ruta\a\tu\repo\PolyIA   # o navega a la carpeta del proyecto
docker compose up -d
```

- Iniciar el backend (terminal separada):

```powershell
cd C:\ruta\a\tu\repo\PolyIA\backend
& ".venv\Scripts\Activate.ps1"    # activar venv
$env:PYTHONUTF8 = "1"
$env:PGCLIENTENCODING = "UTF8"
python -m uvicorn main:app --reload --port 8000
```

- Iniciar el frontend (otra terminal):

```powershell
cd C:\ruta\a\tu\repo\PolyIA\frontend
npm run dev
```

Accede a la aplicación en `http://localhost:5173` y a la API en `http://localhost:8000`.

Si necesitas detener todo rápidamente:

```powershell
docker compose down
# Ctrl+C en las terminales donde corren uvicorn y vite
```


### Paso 3 — Configurar y ejecutar el Backend

```bash
cd backend

# Crear y activar el entorno virtual
python -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate       # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar y editar las variables de entorno
cp .env.example .env
```

Edita `backend/.env` y rellena al menos una API key:

```env
DATABASE_URL=postgresql://polyia:polyia_secret@localhost:5432/polyia_db
SECRET_KEY=cambia-esto-por-una-cadena-aleatoria-larga

# Pon la(s) API key(s) de los proveedores que quieras usar:
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...
```

Iniciar el servidor:

```bash
uvicorn main:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000`.  
Documentación interactiva: `http://localhost:8000/docs`

---

### Paso 4 — Configurar y ejecutar el Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# (Opcional) Copiar variables de entorno
cp .env.example .env

# Iniciar en modo desarrollo
npm run dev
```

La aplicación estará disponible en **`http://localhost:5173`**.

---

### Paso 5 — (Opcional) Modelo local con Ollama

Para activar el chat con corrección gramatical usando el SLM local:

```bash
# Instalar Ollama desde https://ollama.com
ollama pull qwen2.5:3b   # descarga el modelo (~2 GB)
ollama serve             # inicia el servidor en localhost:11434
```

El backend detecta Ollama automáticamente. Si no está disponible, el endpoint `/api/chat/local` devuelve un mensaje indicando cómo activarlo.

---

## 🧪 Resumen de comandos

| Acción                        | Comando                                     |
| ----------------------------- | ------------------------------------------- |
| Levantar DB                   | `docker compose up -d`                      |
| Iniciar backend               | `uvicorn main:app --reload --port 8000`     |
| **Iniciar frontend**          | **`npm run dev`** (desde `/frontend`)       |
| Build de producción frontend  | `npm run build` (desde `/frontend`)         |
| Bajar DB                      | `docker compose down`                       |

---

## 📡 Endpoints de la API

| Método | Ruta                      | Descripción                                 | Auth requerida |
| ------ | ------------------------- | ------------------------------------------- | -------------- |
| POST   | `/api/auth/register`      | Registro de nuevo usuario                   | No             |
| POST   | `/api/auth/login`         | Login — devuelve JWT                        | No             |
| GET    | `/api/auth/me`            | Perfil del usuario autenticado              | ✅ JWT          |
| POST   | `/api/leccion/generar`    | Genera lección vía IA en la nube            | ✅ JWT          |
| GET    | `/api/leccion/lista`      | Lista lecciones del usuario                 | ✅ JWT          |
| POST   | `/api/chat/local`         | Chat con SLM local + corrección gramatical  | ✅ JWT          |
| GET    | `/health`                 | Health-check del servidor                   | No             |

---

## 🗄️ Schema de la Base de Datos (PostgreSQL)

Ejecuta este SQL directamente en tu instancia de PostgreSQL si prefieres crear las tablas manualmente en lugar de dejar que SQLAlchemy las cree automáticamente al iniciar el backend.

```sql
-- ============================================================
-- PolyIA – Database Schema
-- Compatible con PostgreSQL 14+
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabla: usuarios ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    nivel_idioma     VARCHAR(50)  NOT NULL DEFAULT 'principiante',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

-- ── Tabla: lecciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lecciones (
    id           SERIAL PRIMARY KEY,
    tema         VARCHAR(255) NOT NULL,
    contenido    TEXT         NOT NULL,
    proveedor_ia VARCHAR(50)  NOT NULL DEFAULT 'openai',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usuario_id   INTEGER      NOT NULL
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_lecciones_usuario ON lecciones (usuario_id);

-- ── Tabla: mensajes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes (
    id            SERIAL PRIMARY KEY,
    texto_usuario TEXT        NOT NULL,
    respuesta_ia  TEXT,
    correccion_ia TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id    INTEGER     NOT NULL
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_mensajes_usuario ON mensajes (usuario_id);
```

> **Nota:** Si arrancas el backend normalmente con `uvicorn main:app --reload`, SQLAlchemy ejecutará `CREATE TABLE IF NOT EXISTS` automáticamente, por lo que **no necesitas correr este SQL manualmente** a menos que quieras inspeccionar o pre-crear el esquema.

---

## 🔒 Variables de Entorno

### Backend (`backend/.env`)

| Variable                    | Descripción                                          | Ejemplo / Default                                         |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`              | Cadena de conexión PostgreSQL                        | `postgresql://polyia:polyia_secret@localhost:5432/polyia_db` |
| `SECRET_KEY`                | Secreto para firmar los JWT — **cámbialo**           | string aleatorio largo                                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token JWT                             | `60`                                                      |
| `ALLOWED_ORIGINS`           | Orígenes CORS permitidos (coma-separados)            | `http://localhost:5173`                                   |
| `OPENAI_API_KEY`            | API key de OpenAI                                    | `sk-...`                                                  |
| `OPENAI_MODEL`              | Modelo de OpenAI a usar                              | `gpt-4o-mini`                                             |
| `ANTHROPIC_API_KEY`         | API key de Anthropic (Claude)                        | `sk-ant-...`                                              |
| `ANTHROPIC_MODEL`           | Modelo de Anthropic a usar                           | `claude-3-haiku-20240307`                                 |
| `GOOGLE_API_KEY`            | API key de Google AI                                 | `AIza...`                                                 |
| `GOOGLE_MODEL`              | Modelo de Gemini a usar                              | `gemini-1.5-flash`                                        |
| `LOCAL_MODEL_URL`           | URL del servidor Ollama                              | `http://localhost:11434/api/generate`                     |
| `LOCAL_MODEL_NAME`          | Nombre del modelo Ollama                             | `qwen2.5:3b`                                              |

### Frontend (`frontend/.env`)

| Variable            | Descripción                                                   | Default |
| ------------------- | ------------------------------------------------------------- | ------- |
| `VITE_API_BASE_URL` | URL base del backend (vacío = Vite proxy en desarrollo)       | *(vacío)* |

---

## 🔮 Escalabilidad Futura

- **Alembic**: La carpeta `backend/` está lista para añadir migraciones con `alembic init alembic`.
- **Async FastAPI**: Cambia `create_engine` por `create_async_engine` + `asyncpg` para I/O completamente asíncrono.
- **Streaming**: Los endpoints de lección y chat pueden devolver `StreamingResponse` para mostrar la respuesta token por token.
- **Actividades/Cursos**: Añade nuevas tablas (`Curso`, `Actividad`) y endpoints siguiendo el mismo patrón de `Leccion`.
- **WebSockets**: El endpoint de chat puede migrar a WebSocket para latencia aún menor.
- **Redis**: Cachea las lecciones generadas para evitar llamadas repetidas a la API de la nube.
