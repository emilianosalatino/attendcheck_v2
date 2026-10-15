# Checador de Asistencia por QR

Sistema ligero para controlar asistencia en clases mediante QR. El maestro genera un QR con vigencia limitada, los alumnos lo escanean y registran su matrícula y nombre. El sistema detecta trampa si un mismo dispositivo intenta registrarse con varias matrículas.

## Stack

- **Next.js 16** (App Router, output: standalone) + TypeScript
- **Prisma ORM** con **libSQL adapter** (SQLite local o Turso en la nube)
- **Tailwind CSS 4** + **shadcn/ui**
- **qrcode.react** para generar QR
- **xlsx** (SheetJS) para exportar a Excel
- Middleware de cabeceras de seguridad

## ⚠️ IMPORTANTE — Versión con seguridad + Fases 1, 2 y 3

Esta versión incluye todo lo construido hasta ahora:

### Seguridad

- ✅ Auth del maestro (login con contraseña `TEACHER_PASSWORD`)
- ✅ Anti-trampa server-side (huella del dispositivo calculada por el servidor con SHA-256)

### Fase 1 — Captura del alumno

- ✅ Validación estricta de matrícula con formato **AASSFNNNN**
  - `AA` = año de ingreso (08-99)
  - `SS` = semestre de incorporación (2 dígitos)
  - `F` = letra F (aceptamos minúscula, se convierte a mayúscula)
  - `NNNN` = consecutivo (4 dígitos)
  
  ✅ 3 campos de nombre: Nombre(s) + Apellido paterno (obligatorios, min 2 chars) + Apellido materno (opcional)
  
  ### Fase 2 — Stats por sesión

- ✅ Botón "Stats" en cada sesión
- ✅ Modal con: Total, Limpias, Sospechosas, Esperados, % Asistencia
- ✅ Lista detallada de asistencias con nombres
- ✅ Exportar a Excel (XLSX) con 2 hojas: Resumen + Asistencias detalladas

### Fase 3 — Entidad "Materia" (Subject)

- ✅ Pestaña "Materias" en el dashboard
- ✅ Cada materia tiene color distintivo (se ve en badges de sesión)
- ✅ Al crear una sesión, opcionalmente se asigna a una materia
- ✅ Botón "Stats" por materia → modal con:
- - Total de sesiones de la materia
  - Alumnos únicos que asistieron
  - Total de asistencias
  - % asistencia promedio
  - Lista de alumnos con: matrícula, nombre, # asistencias, # sesiones totales, % individual, # sospechosas
- ✅ Exportar a Excel (XLSX) con 3 hojas: Resumen + Sesiones + Alumnos

## Deploy en Render.com + Turso (gratis para siempre)

Guía de cero a producción. ~20 min.

### Requisitos

- Cuenta en GitHub (gratuita)
- Cuenta en Turso (gratuita, login con GitHub)
- Cuenta en Render.com (gratuita, login con GitHub)

### Paso 1 — Subir el código a GitHub

1. Descomprime `checador-asistencia.zip` en tu computadora.
2. Crea un repo nuevo en GitHub: <https://github.com/new>
   - Nombre: `checador-asistencia` (o el que quieras)
   - **NO marques** "Add a README", "Add .gitignore", "Choose a license" (los archivos ya vienen en el ZIP)
   - Tipo: **Público** o **Privado** (funciona en ambos)
3. Sube todos los archivos del ZIP al repo (drag & drop en la página de GitHub).
4. Commit con el mensaje que quieras.

### Paso 2 — Crear la base de datos en Turso

1. Entra a <https://turso.tech>, login con GitHub.
2. **Create Database**:
   - Name: `checador`
   - Location: AWS US East (Virginia) o la más cercana
   - Type: SQLite
3. Entra a la base de datos creada → copia la **URL** (algo como `libsql://checador-xxxxx.aws-us-east-1.turso.io`)
4. Ve a **Settings → Authentication Tokens → Create Token** → nombre `checador-prod` → copia el token
5. Anota estos dos valores:
   - **DATABASE_URL** = `libsql://checador-xxxxx.turso.io`
   - **DATABASE_AUTH_TOKEN** = `tu-token-largo`

> El schema (tablas) se aplicará AUTOMÁTICAMENTE en el build de Render. No necesitas tocar SQL manualmente.

### Paso 3 — Crear Web Service en Render

1. Entra a <https://dashboard.render.com> → **New +** → **Web Service**

2. **Connect a repository** → selecciona tu repo `checador-asistencia`

3. Completa:
   
   - **Name**: `checador-asistencia` (será tu subdominio en Render)
   - **Language**: Node (se detecta solo)
   - **Region**: la más cercana a tu escuela
   - **Branch**: `main`
   - **Runtime**: Node.js (default)
   - **Build Command** (copia y pega tal cual):
     
     ```
     npm install && npm run db:generate && npm run db:init && npm run build
     ```
   - **Start Command** (copia y pega tal cual):
     
     ```
     npm run start
     ```
   - **Instance Type**: **Free** (suficiente para uso educativo)

4. Baja hasta **Environment Variables** y agrega **3 variables**:
   
   | Key                   | Value                                                          |
   | --------------------- | -------------------------------------------------------------- |
   | `DATABASE_URL`        | `libsql://checador-xxxxx.turso.io` (tu URL de Turso)           |
   | `DATABASE_AUTH_TOKEN` | tu token de Turso                                              |
   | `TEACHER_PASSWORD`    | contraseña del maestro, mínimo 6 caracteres (elíge una fuerte) |
   
   > ⚠️ NO agregues `NODE_ENV` ni `HOSTNAME` — ya están baked en el código.

5. **Create Web Service**. Render tarda 3-5 min en el primer deploy.

### Paso 4 — Verificar

1. Cuando veas `==> Your service is live 🎉` en el log, abre tu URL:
   `https://checador-asistencia.onrender.com`
2. Render free tarda ~50s en despertar la primera vez. Sé paciente.
3. Debe cargar la **pantalla de login del maestro**.
4. Escribe tu `TEACHER_PASSWORD` → verás el dashboard.
5. Crea una materia → crea una sesión con esa materia → mira el QR → copia el enlace del QR en otra pestaña → registra una matrícula → vuelve al dashboard → presiona "Stats" → debe aparecer el modal con las estadísticas y botón de Excel. ✓

## Cómo usarlo

### Como maestro

1. Abre la URL de tu app (sin parámetros en la URL).
2. **Pantalla de login**: escribe tu `TEACHER_PASSWORD`.
3. Verás el dashboard con 2 pestañas: **Sesiones** y **Materias**.

#### Pestaña Materias

1. Crea materias con nombre + color (ej. "Cálculo Diferencial - Grupo A", color verde).
2. Cada materia tendrá un badge de color en las sesiones.
3. Botones por materia: Stats (ver estadísticas globales), Editar, Borrar.

#### Pestaña Sesiones

1. **Nombre de la sesión** (ej. "Sesión del 15 oct - Repaso parcial").
2. **Materia (opcional)**: selecciona una materia del dropdown.
3. **Alumnos esperados**: cuántos alumnos se espera que asistan (para calcular %).
4. **Vigencia (min)**: minutos de validez del QR (default 15).
5. Presiona **Generar QR** → muestra el QR a tus alumnos.
6. Por cada sesión: botones **Ver QR**, **Lista** (lista de asistencia), **Stats** (estadísticas + Excel), **Cerrar/Abrir**, **Borrar**.

### Como alumno

1. Escanea el QR con la cámara del celular (o abre el enlace directo).
2. Se abre la página de registro con el nombre de la clase y un contador de tiempo.
3. Escribe tu(s) nombre(s) (mínimo 2 caracteres).
4. Escribe tu apellido paterno (mínimo 2 caracteres).
5. (Opcional) Escribe tu apellido materno.
6. Escribe tu matrícula con formato AASSFNNNN. La F puede ser minúscula.
7. Presiona **Registrar asistencia**.
8. Si todo sale bien, verás un mensaje de éxito con tu nombre completo.
9. Si intentas registrar dos veces la misma matrícula → se rechaza.
10. Si intentas registrar con otra matrícula desde el mismo dispositivo → queda marcado como **sospechoso**.

## Medidas anti-trampa

Las **direcciones MAC no son accesibles desde el navegador** por seguridad. En su lugar, este sistema usa varias capas:

1. **Token de un solo uso** — el QR lleva un token aleatorio de 32 caracteres hex (128 bits).
2. **Ventana de tiempo** — el QR caduca a los X minutos definidos (default 15).
3. **Matrícula única por sesión** — restricción en la base de datos.
4. **Huella SERVER-SIDE** — SHA-256 de (User-Agent + Accept-Language + sec-ch-ua + IP). El servidor calcula esta huella, no confía en el cliente.
5. **Auth del maestro** — todos los endpoints sensibles requieren password.

## ⚠️ Sobre el "sleep" en Render Free

El plan free de Render **duerme tras 15 minutos sin actividad**. La primera vez que abres la URL tarda ~50s en despertar.

**Recomendación**: tú (maestro) abre la URL primero para que despierte, y **después** genera el QR.

## Backup de datos

- **En Turso**: backups automáticos. Puedes exportar desde el dashboard si quieres una copia local.

## Actualizar la app cuando cambies código

Solo `git push` a tu repo. Render detecta el cambio y redespliega en 2-3 min.

## Scripts disponibles

```bash
npm run dev          # Desarrollo local con SQLite
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Verificar calidad de código
npm run db:generate  # Regenerar Prisma Client
npm run db:init      # Aplicar schema SQL a la DB (idempotente: crea tablas + ALTER TABLEs para migrar)
npm run db:push      # Alternativa a db:init, SOLO para SQLite local (falla con Turso)
npm run db:reset     # Borrar y recrear la base de datos (¡borra datos!)
```

## Instalación local (con SQLite)

```bash
cd checador-asistencia
npm install
cat > .env <<EOF
DATABASE_URL="file:./db/custom.db"
TEACHER_PASSWORD="tu_password_local"
EOF
mkdir -p db
npm run db:generate
npm run db:init
npm run dev
```

Abrir <http://localhost:3000>. Te pedirá la password de maestro.

## Variables de entorno

| Variable              | Dónde                         | Para qué                                                                            |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Render env, .env local        | URL de Turso (`libsql://...`) o SQLite local (`file:./db/custom.db`)                |
| `DATABASE_AUTH_TOKEN` | Render env                    | Token de Turso (vacío para SQLite local)                                            |
| `TEACHER_PASSWORD`    | Render env, .env local        | Contraseña para acceder al dashboard del maestro (mínimo 6 chars)                   |
| `TRACKING_SECRET`     | Render env (opcional)         | Secreto para firmar cookies de tracking. Si no se setea, deriva de TEACHER_PASSWORD |
| `NODE_ENV`            | (auto-set por Render/Next.js) | No la setees manualmente — rompe el build                                           |
| `HOSTNAME`            | (auto-set en start script)    | No la setees — el código ya la fuerza a `0.0.0.0`                                   |

## Formato de matrícula: `AASSFNNNN`

| Letra  | Significado                                               | Valores válidos         |
| ------ | --------------------------------------------------------- | ----------------------- |
| `AA`   | Año de ingreso                                            | 08-99 (ej: 17 = 2017)   |
| `SS`   | Semestre de incorporación                                 | 2 dígitos (01, 02, ...) |
| `F`    | Letra F (mayúscula o minúscula, se convierte a mayúscula) | `F`                     |
| `NNNN` | Consecutivo                                               | 4 dígitos (0001-9999)   |

## Licencia

Código libre para uso educativo.
