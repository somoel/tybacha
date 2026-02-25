# Tybachá

Aplicación móvil para profesionales en educación física y cuidadores que evalúan y registran pruebas físicas funcionales (Senior Fitness Test - SFT de Rikli & Jones, 2001) en adultos mayores.

## 📱 Características

- **Autenticación** con Supabase Auth (profesional y cuidador)
- **Registro y gestión de pacientes** con datos demográficos y patologías
- **Batería completa SFT** (7 pruebas) con cronómetros y contadores interactivos
- **Resultados gráficos** con comparativas usando react-native-gifted-charts
- **Plan de ejercicios con IA** generado por Gemini 2.0 Flash
- **Modo offline** con SQLite local y sincronización automática
- **Asignación de cuidadores** con control de acceso por roles
- **Material Design 3** con tema teal-cyan y fuente Montserrat

## 🛠 Stack Tecnológico

| Tecnología | Versión |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81 |
| TypeScript | Strict mode |
| Expo Router | v6 (file-based) |
| React Native Paper | v5 (MD3) |
| Zustand | v5 + persist |
| Supabase | v2 |
| expo-sqlite | v14+ |
| Gemini AI | 2.0 Flash |
| react-native-gifted-charts | Latest |

## 🚀 Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repositorio>
cd tybacha
npm install
```

### 2. Configurar variables de entorno

Editar el archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=tu_clave_api_gemini
```

### 3. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_initial.sql`
3. En **Authentication > Settings**, habilitar el proveedor de email/password
4. Copiar la URL y anon key a tu archivo `.env`

### 4. Obtener API Key de Gemini

1. Ir a [Google AI Studio](https://aistudio.google.com/apikey)
2. Crear una API key
3. Copiarla en `EXPO_PUBLIC_GEMINI_API_KEY` del `.env`

### 5. Ejecutar la app

```bash
# Iniciar el servidor de desarrollo
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios
```

## 📁 Estructura del Proyecto

```
tybacha/
├── app/                    # Pantallas (Expo Router file-based)
│   ├── _layout.tsx          # Root: PaperProvider + fonts + auth
│   ├── index.tsx            # Redirect según sesión
│   ├── (auth)/login.tsx     # Login
│   └── (app)/               # App autenticada (5 tabs)
│       ├── home/            # Dashboard
│       ├── patients/        # CRUD pacientes + baterías
│       ├── tests/           # Pruebas SFT activas
│       ├── results/         # Resultados + planes IA
│       └── profile/         # Perfil + sync + logout
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── constants/           # Tema MD3, definiciones SFT
│   ├── hooks/               # useAuth, useOffline, etc.
│   ├── lib/                 # Clientes Supabase, SQLite, Gemini
│   ├── services/            # Lógica de negocio
│   ├── stores/              # Estado global (Zustand)
│   └── types/               # Tipos TypeScript
└── supabase/migrations/     # SQL de migración
```

## 📋 Pruebas SFT Incluidas

| # | Prueba | Medida | Modo |
|---|--------|--------|------|
| 1 | Sentarse/levantarse silla | Repeticiones (30s) | Countdown + Counter |
| 2 | Flexión de codo | Repeticiones (30s) | Countdown + Counter |
| 3 | Caminata 6 minutos | Metros | Countdown + Input |
| 4 | Marcha estacionaria | Pasos (2 min) | Countdown + Counter |
| 5 | Sentado y extenderse | cm (±) | Input manual |
| 6 | Rascarse la espalda | cm (±) | Input manual |
| 7 | 8-Foot Up-and-Go | Segundos | Stopwatch |

## 🔒 Roles y Permisos

- **Profesional**: CRUD pacientes, crear baterías, generar planes IA, asignar cuidadores
- **Cuidador**: Ver pacientes asignados, registrar ejercicios, desasociarse

## 📡 Modo Offline

La app detecta automáticamente la conectividad. Cuando no hay conexión:
- Los datos se guardan en SQLite local
- Se muestra un banner amarillo "Sin conexión"
- Al recuperar conexión, se sincronizan automáticamente con Supabase
