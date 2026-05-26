# Despliegue en Vercel

Esta guia cubre el despliegue de la API Tybacha en Vercel y la configuracion de la app Expo Web para consumirla.

## 1. Preparar TiDB

1. Ejecuta el DDL base de TiDB.
2. Ejecuta las migraciones complementarias:

```bash
api/migrations/0002_foto_perfil_usuario.sql
api/migrations/0003_profesional_cuidador.sql
```

3. Configura las variables de entorno de la API.
4. Ejecuta seeds una vez:

```bash
npm --prefix api install
npm --prefix api run seed
```

## 2. Variables de entorno en Vercel

En el proyecto de Vercel de la API, agrega:

```env
NODE_ENV=production
TIDB_HOST=...
TIDB_PORT=4000
TIDB_USER=...
TIDB_PASSWORD=...
TIDB_DATABASE=tybacha
TIDB_SSL=true
JWT_ACCESS_SECRET=un-secreto-largo-y-unico
JWT_REFRESH_SECRET=otro-secreto-largo-y-unico
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
SEED_ADMIN_EMAIL=admin@tu-dominio.com
SEED_ADMIN_PASSWORD=una-contrasena-segura
SEED_ADMIN_NAMES=Administrador
SEED_ADMIN_LASTNAMES=Tybacha
```

No uses los secretos locales en produccion. Rota cualquier credencial compartida durante desarrollo.

## 3. Desplegar API

Desde la carpeta `api`:

```bash
npm install
npm run build
vercel
```

Para produccion:

```bash
vercel --prod
```

Configuracion esperada:

- Root Directory: `api`
- Build Command: `npm run build`
- Output: no aplica, usa `api/vercel.json`
- Serverless entry: `dist/vercel.js`

## 4. Verificar API desplegada

```bash
curl https://TU_API.vercel.app/health
curl https://TU_API.vercel.app/health/db
```

Ambos deben responder:

```json
{"ok":true}
```

## 5. Configurar Expo Web/App

En el proyecto Expo, define:

```env
EXPO_PUBLIC_API_URL=https://TU_API.vercel.app
```

Para desarrollo local:

```env
EXPO_PUBLIC_API_URL=http://localhost:4001
```

## 6. Desplegar Expo Web en Vercel

Puedes crear un segundo proyecto Vercel para la web.

Configuracion recomendada:

- Root Directory: raiz del repo
- Build Command: `npx expo export --platform web`
- Output Directory: `dist`

Variables:

```env
EXPO_PUBLIC_API_URL=https://TU_API.vercel.app
```

Despliegue:

```bash
npm install
npx expo export --platform web
vercel --prod
```

## 7. Checklist post-despliegue

- `GET /health` responde.
- `GET /health/db` conecta a TiDB.
- `POST /auth/login` funciona con el admin seed.
- La app carga login.
- El login redirige a Inicio.
- Admin puede crear profesionales.
- Profesional puede crear cuidadores.
- Profesional/cuidador puede crear adultos mayores segun reglas.
- SFT registra resultados.
- Plan IA genera exactamente 5 ejercicios.
- Seguimiento crea progreso.
- Reportes PDF/XLSX descargan.
- Auditoria registra accesos y cambios.
