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
| Frontend      | React 18 + Vite 5 + Tailwind CSS 3 + React Router v6     |
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

## 🚀 Guía para Levantar el Proyecto desde Cero (Paso a Paso)

> 🧒 **Nota:** Esta guía está escrita para principiantes. Si nunca has programado o es tu primera vez usando estas herramientas, ¡no te preocupes! Sigue cada paso tal cual y todo funcionará.

---

### 📋 Paso 0 — Instalar todo lo necesario

Antes de tocar el proyecto, necesitas instalar **5 programas** en tu computadora. Piensa en ellos como las "herramientas" de tu caja de herramientas: sin ellas no puedes construir nada.

#### 1. 🟢 Git (para descargar el código)

Git es un programa que te permite descargar (clonar) proyectos desde internet.

| | |
|---|---|
| **¿Qué es?** | Un programa para descargar y versionar código |
| **Descárgalo de aquí** | 👉 [https://git-scm.com/downloads](https://git-scm.com/downloads) |
| **Versión** | Cualquier versión reciente sirve |

**Cómo instalarlo:**
1. Entra al enlace de arriba y haz clic en **"Download for Windows"**.
2. Abre el archivo `.exe` descargado.
3. Dale **"Next"** a todo (deja las opciones por defecto) y al final **"Install"**.
4. Cuando termine, abre **PowerShell** (búscalo en el menú de Windows) y escribe:
   ```powershell
   git --version
   ```
   Si ves algo como `git version 2.44.0`, ¡está listo! ✅

---

#### 2. 🟢 Node.js (para el frontend / la pantalla de la app)

Node.js es lo que necesitas para que la parte visual de la aplicación funcione.

| | |
|---|---|
| **¿Qué es?** | Un entorno para ejecutar JavaScript fuera del navegador |
| **Descárgalo de aquí** | 👉 [https://nodejs.org/](https://nodejs.org/) |
| **Versión requerida** | **20 o superior** (descarga la versión **LTS**, es la más estable) |

**Cómo instalarlo:**
1. Entra al enlace y haz clic en el botón verde grande que diga **"LTS"**.
2. Abre el archivo `.msi` descargado.
3. Dale **"Next"** a todo y **"Install"**.
4. Reinicia PowerShell y verifica:
   ```powershell
   node --version
   ```
   Debe mostrar algo como `v20.xx.x` o `v22.xx.x`. ✅
   ```powershell
   npm --version
   ```
   Debe mostrar algo como `10.x.x`. ✅

> ⚠️ **Importante:** Si la versión de Node es menor a 20 (por ejemplo `v18.x.x`), debes desinstalarla e instalar la versión 20 o superior.

---

#### 3. 🐍 Python (para el backend / el cerebro de la app)

Python es el lenguaje que usa el servidor (backend) de la aplicación.

| | |
|---|---|
| **¿Qué es?** | Un lenguaje de programación muy popular |
| **Descárgalo de aquí** | 👉 [https://www.python.org/downloads/](https://www.python.org/downloads/) |
| **Versión requerida** | **3.11 o superior** |

**Cómo instalarlo:**
1. Entra al enlace y haz clic en **"Download Python 3.1x.x"**.
2. **MUY IMPORTANTE:** En la primera pantalla del instalador, **marca la casilla que dice "Add Python to PATH"** ☑️. Si no marcas esto, los comandos de Python no funcionarán.
3. Haz clic en **"Install Now"**.
4. Verifica en PowerShell:
   ```powershell
   python --version
   ```
   Debe mostrar algo como `Python 3.12.x` o `Python 3.13.x`. ✅

---

#### 4. 🐳 Docker Desktop (para la base de datos)

Docker es como una "máquina virtual ligera" que nos permite correr la base de datos PostgreSQL sin tener que instalarla directamente en tu computadora.

| | |
|---|---|
| **¿Qué es?** | Una app que corre programas aislados en "contenedores" |
| **Descárgalo de aquí** | 👉 [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) |
| **Versión** | Cualquier versión reciente sirve |

**Cómo instalarlo:**
1. Entra al enlace y haz clic en **"Download for Windows"**.
2. Abre el instalador y sigue los pasos.
3. Cuando termine, **reinicia tu computadora** si te lo pide.
4. Abre Docker Desktop desde el menú de Windows. Espera a que el ícono de la ballena en la barra de tareas deje de moverse (eso significa que ya está listo).
5. Verifica en PowerShell:
   ```powershell
   docker --version
   ```
   Debe mostrar algo como `Docker version 27.x.x`. ✅

> 💡 **Tip:** Docker Desktop debe estar **abierto y corriendo** cada vez que quieras usar la base de datos. Si cierras Docker Desktop, la base de datos se apaga.

---

#### 5. 🦙 Ollama (para el chat con IA local — opcional)

Ollama es un programa que corre modelos de inteligencia artificial directamente en tu computadora, sin internet. Lo usamos para el chat tutor.

| | |
|---|---|
| **¿Qué es?** | Un programa para correr modelos de IA en tu PC |
| **Descárgalo de aquí** | 👉 [https://ollama.com/](https://ollama.com/) |
| **Versión** | Cualquier versión reciente |

**Cómo instalarlo:**
1. Entra al enlace y haz clic en **"Download"**.
2. Abre el instalador y sigue los pasos.
3. Verifica en PowerShell:
   ```powershell
   ollama --version
   ```
   Debe mostrar algo como `ollama version 0.x.x`. ✅

> 📝 **Nota:** Este paso es **opcional**. La app funciona sin Ollama, pero el chat con el tutor de IA local no estará disponible.

---

#### 6. 🔑 API Key de Google (para generar lecciones)

Las lecciones se generan usando inteligencia artificial de Google (Gemini). Para eso necesitas una "llave" gratuita.

1. Ve a 👉 [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Inicia sesión con tu cuenta de Google.
3. Haz clic en **"Create API Key"**.
4. **Copia la clave** que aparece (es un texto largo que empieza con `AIza...`). Guárdala en un lugar seguro, la necesitarás en el Paso 3.

---

### 🏁 Paso 1 — Descargar (clonar) el proyecto

Ahora que tienes todo instalado, vamos a descargar el código del proyecto.

1. Abre **PowerShell**.
2. Navega a la carpeta donde quieras guardar el proyecto. Por ejemplo, si quieres guardarlo en el Escritorio:
   ```powershell
   cd ~/Desktop
   ```
3. Ejecuta este comando para descargar el proyecto:
   ```powershell
   git clone https://github.com/clonozxd/PolyIA.git
   ```
4. Entra a la carpeta del proyecto:
   ```powershell
   cd PolyIA
   ```

¡Listo! Ya tienes todo el código en tu computadora. 🎉

---

### 🗄️ Paso 2 — Encender la base de datos (PostgreSQL con Docker)

La base de datos es donde se guardan los usuarios, las lecciones y el progreso. Necesitamos encenderla antes que todo lo demás.

1. **Asegúrate de que Docker Desktop esté abierto y corriendo** (la ballena en la barra de tareas debe estar quieta).
2. En PowerShell (dentro de la carpeta `PolyIA`), ejecuta:
   ```powershell
   docker compose up -d
   ```

   > **¿Qué hace este comando?**
   > - `docker compose` = lee el archivo `docker-compose.yml` que tiene las instrucciones.
   > - `up` = "enciende" el contenedor.
   > - `-d` = lo corre en segundo plano (no se queda pegado en la terminal).

3. Espera unos segundos. Para verificar que la base de datos está corriendo:
   ```powershell
   docker ps
   ```
   Debes ver algo como:
   ```
   CONTAINER ID   IMAGE               STATUS         PORTS                    NAMES
   abc123...      postgres:16-alpine   Up 10 seconds  0.0.0.0:5433->5432/tcp   polyia_db
   ```
   Si ves `polyia_db` en la lista con status `Up`, ¡la base de datos está funcionando! ✅

> 📌 **Datos de la base de datos** (por si los necesitas):
> - **Puerto:** 5433
> - **Usuario:** polyia
> - **Contraseña:** polyia_secret
> - **Nombre de la base:** polyia_db

---

### ⚙️ Paso 3 — Configurar y encender el Backend (el servidor)

El backend es el "cerebro" de la aplicación. Recibe las peticiones del frontend, habla con la IA, y guarda cosas en la base de datos.

#### 3.1 — Crear el entorno virtual de Python

Un "entorno virtual" es como una burbuja aislada donde instalamos las dependencias del proyecto sin afectar el resto de tu computadora.

```powershell
cd backend
python -m venv .venv
```

> **¿Qué hace esto?**
> - `python -m venv .venv` = crea una carpeta `.venv` con un Python aislado dentro.

#### 3.2 — Activar el entorno virtual

```powershell
.\.venv\Scripts\Activate.ps1
```

> ⚠️ **¿Te sale un error en rojo?** Si PowerShell te dice algo como _"la ejecución de scripts está deshabilitada"_, ejecuta este comando **una sola vez** y vuelve a intentar:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> Luego intenta de nuevo:
> ```powershell
> .\.venv\Scripts\Activate.ps1
> ```

Sabrás que funcionó si ves `(.venv)` al inicio de tu línea de comandos, así:
```
(.venv) PS C:\Users\tu-usuario\Desktop\PolyIA\backend>
```

#### 3.3 — Instalar las dependencias

```powershell
pip install -r requirements.txt
```

Esto descarga e instala todas las librerías que el backend necesita. Puede tardar un par de minutos.

> 💡 Si ves algún error con `psycopg2`, ejecuta adicionalmente:
> ```powershell
> pip install "psycopg[binary]"
> ```

#### 3.4 — Crear el archivo de configuración (.env)

El backend necesita un archivo llamado `.env` con las claves y configuraciones. **Este archivo no viene incluido en el repositorio por seguridad**, así que debes crearlo tú.

1. Dentro de la carpeta `backend`, crea un archivo llamado `.env` (puedes usar el Bloc de Notas o VS Code).
2. Pega este contenido dentro:

```env
# Conexión a PostgreSQL (la base de datos del Paso 2)
DATABASE_URL=postgresql://polyia:polyia_secret@localhost:5433/polyia_db
POSTGRES_DB=polyia_db
POSTGRES_PORT=5433

# JWT (seguridad para los logins)
SECRET_KEY=escribe-aqui-una-cadena-larga-y-aleatoria-inventada-por-ti
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS (permisos para el frontend)
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Google Gemini (generación de lecciones con IA)
GOOGLE_API_KEY=PEGA-AQUI-TU-API-KEY-DE-GOOGLE
GOOGLE_MODEL=gemini-2.0-flash

# Ollama (chat tutor local)
LOCAL_MODEL_URL=http://localhost:11434/api/generate
LOCAL_MODEL_NAME=qwen3:8b
```

3. **Reemplaza** `PEGA-AQUI-TU-API-KEY-DE-GOOGLE` con la API Key que obtuviste en el Paso 0.6.
4. **Reemplaza** `escribe-aqui-una-cadena-larga-y-aleatoria-inventada-por-ti` con algo como `mi-clave-super-secreta-123456789-abcdef` (lo que quieras, cuanto más largo y raro mejor).
5. Guarda el archivo.

#### 3.5 — Encender el backend

```powershell
uvicorn main:app --reload --port 8001
```

> **¿Qué hace este comando?**
> - `uvicorn` = el servidor web para Python.
> - `main:app` = "busca el archivo `main.py` y usa el objeto `app`".
> - `--reload` = si cambias el código, el servidor se reinicia solo.
> - `--port 8001` = escucha en el puerto 8001.

Si todo sale bien, verás algo como:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Started reloader process
```

✅ ¡El backend está corriendo! Puedes verificarlo abriendo en tu navegador: [http://localhost:8001/docs](http://localhost:8001/docs)

> ⚡ **No cierres esta terminal.** El backend se queda corriendo aquí. Para el siguiente paso, abre **una nueva ventana de PowerShell**.

---

### 🎨 Paso 4 — Configurar y encender el Frontend (la pantalla)

El frontend es lo que ves: botones, formularios, las lecciones, el chat. Necesita su propia terminal.

1. **Abre una nueva ventana de PowerShell** (no cierres la del backend).
2. Navega hasta la carpeta del frontend:
   ```powershell
   cd ~/Desktop/PolyIA/frontend
   ```
   > (Ajusta la ruta si clonaste el proyecto en otro lugar)

3. Instala las dependencias del frontend:
   ```powershell
   npm install
   ```
   Esto descargará todos los paquetes que React necesita. Puede tardar un par de minutos la primera vez.

4. Enciende el servidor de desarrollo:
   ```powershell
   npm run dev
   ```

Si todo sale bien, verás algo como:
```
  VITE v5.3.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

✅ ¡El frontend está corriendo! Abre tu navegador y ve a: **[http://localhost:5173](http://localhost:5173)**

> ⚡ **No cierres esta terminal tampoco.** Si la cierras, la pantalla dejará de funcionar.

---

### 🦙 Paso 5 — Descargar y encender el modelo de IA local (Ollama)

Este paso es **opcional** pero necesario si quieres usar el **Chat Tutor** (la función de chatear con una IA que te corrige la gramática).

1. **Abre una tercera ventana de PowerShell**.
2. Descarga el modelo (esto se hace **una sola vez**, pesa aproximadamente 5 GB):
   ```powershell
   ollama pull qwen3:8b
   ```
   Espera a que termine la descarga (puede tardar varios minutos dependiendo de tu internet).

3. Inicia el servidor de Ollama:
   ```powershell
   ollama serve
   ```
   > 💡 En muchos casos, Ollama ya se inicia automáticamente al instalarse. Si al ejecutar `ollama serve` te dice que ya está corriendo, ¡perfecto! No necesitas hacer nada más.

✅ ¡El modelo de IA local está listo! El chat tutor ahora funcionará.

---

## ✅ ¡Todo listo! Resumen de lo que debe estar corriendo

Si seguiste todos los pasos, deberías tener **3 cosas corriendo al mismo tiempo**:

| # | Qué es | Dónde corre | Cómo verificar |
|---|--------|-------------|----------------|
| 1 | 🗄️ **Base de datos** (PostgreSQL) | Docker Desktop | `docker ps` → debe mostrar `polyia_db` |
| 2 | ⚙️ **Backend** (FastAPI) | Terminal 1 | Abrir [http://localhost:8001/docs](http://localhost:8001/docs) |
| 3 | 🎨 **Frontend** (React + Vite) | Terminal 2 | Abrir [http://localhost:5173](http://localhost:5173) |
| 4 | 🦙 **Ollama** (opcional) | Terminal 3 o automático | `ollama list` → debe mostrar `qwen3:8b` |

---

## ⚡ Inicio Rápido (para las siguientes veces)

Cuando ya tienes todo instalado y configurado, solo necesitas hacer esto cada vez que quieras usar la app:

1. **Abre Docker Desktop** (espera a que cargue).
2. **Abre 3 terminales de PowerShell** y ejecuta en cada una:

```powershell
# Terminal 1 — Base de datos
cd ~/Desktop/PolyIA
docker compose up -d

# Terminal 2 — Backend
cd ~/Desktop/PolyIA/backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8001

# Terminal 3 — Frontend
cd ~/Desktop/PolyIA/frontend
npm run dev
```

3. Abre **[http://localhost:5173](http://localhost:5173)** en tu navegador. ¡Listo! 🎉

### Para apagar todo:

```powershell
# Presiona Ctrl+C en las terminales del backend y frontend para detenerlos
# Luego en cualquier terminal:
cd ~/Desktop/PolyIA
docker compose down
```

---

## 🆘 Problemas Comunes y Soluciones

### ❌ "docker: command not found" o "docker compose: command not found"
- **Docker Desktop no está instalado** o no está corriendo.
- Abre Docker Desktop y espera a que cargue completamente (ballena quieta en la barra de tareas).

### ❌ "python: command not found"
- Python no se instaló correctamente o no está en el PATH.
- Reinstala Python y **asegúrate de marcar "Add Python to PATH"** durante la instalación.

### ❌ "node: command not found" o "npm: command not found"
- Node.js no se instaló correctamente.
- Reinstala Node.js desde [https://nodejs.org/](https://nodejs.org/) (versión LTS).

### ❌ Error de PowerShell: "la ejecución de scripts está deshabilitada"
- Ejecuta una sola vez:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

### ❌ El backend no se conecta a la base de datos
- Verifica que Docker Desktop esté corriendo y que el contenedor esté activo:
  ```powershell
  docker ps
  ```
- Si no aparece `polyia_db`, levántalo de nuevo:
  ```powershell
  cd ~/Desktop/PolyIA
  docker compose up -d
  ```

### ❌ Las lecciones no se generan / "Error con Gemini"
- Verifica que pusiste tu API Key correctamente en el archivo `backend/.env`.
- Asegúrate de que la key es válida visitando [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### ❌ El chat tutor dice que Ollama no está disponible
- Asegúrate de haber descargado el modelo: `ollama pull qwen3:8b`
- Verifica que Ollama esté corriendo: `ollama list` (debe mostrar `qwen3:8b`).
- Si no corre, ejecútalo manualmente: `ollama serve`

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
