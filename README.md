# Tybacha

Aplicación móvil para profesionales en educación física y cuidadores que evalúan y registran pruebas físicas funcionales (Senior Fitness Test - SFT de Rikli & Jones, 2001) en adultos mayores.

## 📱 Características

- **Autenticación** con JWT (profesional y cuidador)
- **Registro y gestión de pacientes** con datos demográficos y patologías
- **Batería completa SFT** (6 pruebas) con cronómetros y contadores interactivos
- **Resultados gráficos** con comparativas usando react-native-gifted-charts
- **Plan de ejercicios con IA** generado por OpenRouter
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
| expo-sqlite | v14+ |
| OpenRouter | Space Bunny Alpha + MiMo V2.5 |
| react-native-gifted-charts | Latest |

## 🚀 Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repositorio>
cd tybacha
npm install
```

### 2. Configurar variables de entorno

En la raíz del proyecto, configura la URL de la API:

```env
EXPO_PUBLIC_API_URL=https://tu-api.vercel.app
```

La generación de planes se configura en `api/.env`:

```env
OPENROUTER_API_KEY=tu_clave_openrouter
OPENROUTER_PRIMARY_MODEL=stealth/space-bunny-alpha
OPENROUTER_FALLBACK_MODEL=xiaomi/mimo-v2.5
OPENROUTER_REQUEST_TIMEOUT_MS=25000
```

La clave de OpenRouter debe permanecer únicamente en la API, nunca en una variable `EXPO_PUBLIC_*`.

### 3. Ejecutar la app

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
│   ├── lib/                 # Clientes SQLite, Gemini
│   ├── services/            # Lógica de negocio
│   ├── stores/              # Estado global (Zustand)
│   └── types/               # Tipos TypeScript
```

## 📋 Pruebas SFT Incluidas

| # | Prueba | Medida | Modo |
|---|--------|--------|------|
| 1 | Sentarse/levantarse silla | Repeticiones (30s) | Countdown + Counter |
| 2 | Flexión de codo | Repeticiones (30s) | Countdown + Counter |
| 3 | Marcha estacionaria | Pasos (2 min) | Countdown + Counter |
| 4 | Sentado y extenderse | cm (±) | Input manual |
| 5 | Rascarse la espalda | cm (±) | Input manual |
| 6 | 8-Foot Up-and-Go | Segundos | Stopwatch |

> La **caminata de 6 minutos** se ocultó del flujo de la batería en la app; la resistencia aeróbica se cubre con la marcha de dos minutos (alternativa oficial del SFT). El tipo `six_min_walk` y su fila en el seed se conservan en el backend para no romper el historial de baterías ya registradas.

## 🔒 Roles y Permisos

- **Profesional**: CRUD pacientes, crear baterías, generar planes IA, asignar cuidadores
- **Cuidador**: Ver pacientes asignados, registrar ejercicios, desasociarse

## 📡 Modo Offline

La app detecta automáticamente la conectividad. Cuando no hay conexión:
- Los datos se guardan en SQLite local
- Se muestra un banner amarillo "Sin conexión"
- Al recuperar conexión, se sincronizan automáticamente con el backend
