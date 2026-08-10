# AGENTS.md

## Project overview

Tybacha is a React Native (Expo SDK 54) mobile app for evaluating and recording Senior Fitness Test (SFT) results in older adults. It uses Expo Router v6 (file-based routing), React Native Paper v5 (Material Design 3), Zustand v5 for state management with persistence, and Gemini/OpenRouter AI for exercise plan generation.

The repo contains two distinct codebases sharing one root:

| Directory | Stack | Purpose |
|-----------|-------|---------|
| Root (`app/`, `src/`) | Expo + React Native | The mobile application |
| `api/` | Fastify + TiDB (MySQL-compatible) | REST API (deployed to Vercel) |

## Developer commands

```bash
# Mobile app
npx expo start              # Dev server (Metro)
npx expo start --android    # Android
npx expo start --ios        # iOS
npm run lint                # Runs expo lint

# API (Fastify, separate working dir)
cd api && npm run dev       # Dev server with tsx watch
cd api && npm run build     # TypeScript compile
cd api && npm run seed      # Seed database

# ⚠️ DO NOT RUN
npm run reset-project       # Destructive: wipes app/, components/, hooks/, etc.
```

No test suite exists in the repository.

## TypeScript

Root `tsconfig.json` uses strict mode with path alias `@/*` → `./*`. The `api/` has its own `tsconfig.json` (ES2022, NodeNext modules).

Files excluded from root tsconfig and eslint:
- `api/**`
- `src/config/database.ts`, `src/lib/mysql.ts`, `src/lib/databaseTest.ts`, `src/lib/integrationTest.ts`
- `src/services/**/*MySQL.ts`

These are dead code — do not import or modify them.

## ESLint

Uses `eslint-config-expo/flat` (ESM config). Same ignore list as tsconfig excludes.

## Data layer

The app has a single data path:

```
Zustand stores → src/services/*Service.ts → src/api/*.ts → Fastify API (api/) → TiDB (MySQL)
```

- **Auth**: JWT-based. Login via `src/api/authApi.ts` → Fastify `/auth/login` + `/me`. Tokens stored in `expo-secure-store`.
- **Data services**: `src/services/batteryService.ts`, `patientService.ts` etc. import from `src/api/*.ts` modules.
- **API client**: `src/api/httpClient.ts` handles requests, auth headers, and 401 token refresh.

Offline mode uses SQLite (`expo-sqlite`) with a `synced` flag. Data syncs automatically when connectivity returns.

## Environment variables

**Root `.env`** (used by the mobile app):
- `EXPO_PUBLIC_OPENROUTER_API_KEY` – AI exercise plan generation (primary)
- `EXPO_PUBLIC_GEMINI_API_KEY` – Alternative AI provider
- `EXPO_PUBLIC_API_URL` – Backend API URL (Vercel deployment)

**`api/.env`** (used by the Fastify API):
- TiDB connection: `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`
- JWT secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- CORS origins locked to `https://tybacha.vercel.app` and `http://localhost:8081`

## Architecture notes

- **Entry flow**: `app/index.tsx` checks auth state from `useAuthStore` and redirects to `/(app)/home` or `/(auth)/login`.
- **Root layout** (`app/_layout.tsx`): loads Montserrat fonts, wraps in `PaperProvider` + `SafeAreaProvider`, initializes auth and offline listeners.
- **State management**: Zustand stores in `src/stores/` with `persist` middleware (AsyncStorage).
- **API client**: `src/api/httpClient.ts` handles HTTP requests to the Fastify API.
- **Gemini/OpenRouter**: AI integration in `src/lib/gemini.ts`.

## Key conventions

- Language: Spanish for UI text and most comments
- Date library: `date-fns`
- Form handling: `react-hook-form` with `zod` validation
- Charts: `react-native-gifted-charts`
- Icons: `lucide-react-native`
- Fonts: Montserrat via `@expo-google-fonts/montserrat`
- The `@/*` path alias maps to the repo root (e.g., `@/src/components/...`)

## CI/deploy

No CI workflows exist. Two manual Vercel deployments:

- **API**: Vercel project rooted at `api/`, configured by `api/vercel.json` → `@vercel/node` serverless function.
- **Expo Web**: Vercel project rooted at repo root. Build: `npx expo export --platform web`, output: `dist/`. Set `EXPO_PUBLIC_API_URL` in Vercel dashboard.

## Gotchas

- The `reset-project` script in `package.json` is destructive and will delete `app/`, `components/`, `hooks/`, `constants/`, and `scripts/`.
- The **caminata de 6 minutos** (`six_min_walk`) está oculta de la batería activa (no aparece en `SFT_TESTS`). No re-agregarla al flujo salvo petición explícita. Conservar `six_min_walk` en `shared/constants/normativeRanges.ts`, los mapas de `src/services/batteryService.ts`, el seed y los `ORDER_TO_TEST_TYPE` del API: las baterías históricas dependen de ellos. El export masivo XLSX omite el orden 3 (`sft/routes.ts`).
- MySQL-specific files (`*MySQL.ts`, `database.ts`, `mysql.ts`) are excluded from compilation—do not reference them.
- The `api/` directory is a completely separate Node.js project with its own `node_modules`, `package.json`, and TypeScript config. Run commands from within `api/`, not the root.
- `metro.config.js` adds `.wasm` asset extension and custom condition names for module resolution.
