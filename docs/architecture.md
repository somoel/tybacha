# Tybacha - arquitectura objetivo

## Objetivo

Reconstruir Tybacha como una aplicacion Expo Android/Web conectada a una API propia sobre TiDB, con autenticacion propia, permisos por rol, sincronizacion offline, push notifications, generacion IA, reportes PDF/XLSX y auditoria.

## Decision principal

La app movil no debe conectarse directo a TiDB. TiDB queda detras de una API backend. Esto evita exponer credenciales, centraliza permisos, permite auditoria consistente y hace viable push, reportes y sincronizacion.

## Capas recomendadas

Usaremos una arquitectura por capas con inspiracion de arquitectura limpia, sin hacerla pesada:

1. `domain`
   - Tipos y reglas puras del negocio.
   - Ejemplo: estados validos de plan, roles, reglas de asignacion de cuidador.

2. `application`
   - Casos de uso.
   - Ejemplo: `crearAdultoMayor`, `asignarCuidador`, `generarPlanIa`, `registrarResultadoSft`.

3. `infrastructure`
   - TiDB, JWT, hash de contrasenas, Gemini, Expo Push, PDF/XLSX.
   - No contiene reglas de UI.

4. `interfaces/http`
   - Rutas REST, validacion de entrada, traduccion HTTP.
   - Llama a casos de uso, no a SQL directamente.

5. `mobile`
   - Expo Router, componentes, stores y adaptadores API.
   - La app debe tratar al backend como fuente remota y SQLite como cache/sync local.

## Estructura propuesta

```txt
api/
  src/
    config/
    domain/
    application/
    infrastructure/
      db/
      auth/
      ai/
      push/
      reports/
    interfaces/
      http/
        modules/
          auth/
          users/
          older-adults/
          caregiver-assignments/
          sft/
          exercise-plans/
          tracking/
          notifications/
          reports/
          admin/
    shared/
  migrations/
  seeds/

app/
src/
  api/              # cliente HTTP de Expo
  features/         # modulos de UI por dominio
  storage/          # SQLite/offline
  stores/
```

## Manejo de `adulto_mayor`

En el esquema actual, `adulto_mayor` no es una cuenta de autenticacion. Es la ficha clinico-funcional de una persona mayor gestionada por usuarios autenticados.

Los usuarios autenticados viven en `usuario` y tienen roles:

- `administrador`
- `profesional`
- `cuidador`

El adulto mayor se gestiona asi:

- Un `profesional` crea adultos mayores y debe enlazarlos obligatoriamente a un cuidador.
- Un `cuidador` puede crear adultos mayores; en ese caso queda asignado como cuidador activo.
- La relacion profesional-cuidador vive en `profesional_cuidador`: un profesional puede tener muchos cuidadores y cada cuidador solo puede tener una asignacion activa.
- La relacion cuidador-adulto mayor vive en `asignacion_cuidador_adulto_mayor`.
- El profesional responsable vive en `adulto_mayor.id_profesional_responsable`.
- La trazabilidad de cambios se registra en `auditoria_cambio`.
- La consulta de datos sensibles se registra en `auditoria_acceso_dato`.

No recomiendo crear rol `adulto_mayor` ahora, porque el esquema, los flujos y el PDF se pueden cumplir tratandolo como entidad gestionada. Si mas adelante el adulto mayor debe iniciar sesion, lo mejor seria agregar una relacion opcional `adulto_mayor.id_usuario` y entonces ampliar el enum de `usuario.rol`.

## Cambios de esquema recomendados

El esquema entregado es una buena base. Recomiendo agregar:

```sql
create table foto_perfil_usuario
(
    id_usuario      bigint primary key,
    foto_binaria    mediumblob not null,
    tipo_mime       varchar(40) not null,
    tamano_bytes    int unsigned not null,
    ancho_pixeles   smallint unsigned null,
    alto_pixeles    smallint unsigned null,
    huella_sha256   char(64) null,
    creado_en       datetime(3) default CURRENT_TIMESTAMP(3) not null,
    actualizado_en  datetime(3) default CURRENT_TIMESTAMP(3) not null on update CURRENT_TIMESTAMP(3),
    constraint fk_foto_perfil_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);
```

Tambien recomiendo permitir `adulto_mayor.creado_por` y `actualizado_por` desde cuidadores, como ya permite el FK a `usuario`.

## API

La API sera REST inicialmente porque es mas simple para Expo, offline sync y pruebas:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `POST /admin/users`
- `GET /admin/users`
- `POST /older-adults`
- `GET /older-adults`
- `GET /older-adults/:id`
- `PATCH /older-adults/:id`
- `POST /older-adults/:id/photo`
- `POST /older-adults/:id/consents`
- `POST /older-adults/:id/sft-applications`
- `GET /older-adults/:id/sft-applications`
- `POST /exercise-plans/generate`
- `PATCH /exercise-plans/:id`
- `POST /tracking/exercise-records`
- `POST /push/tokens`
- `GET /notifications`
- `POST /reports/progress.pdf`
- `POST /reports/progress.xlsx`
- `POST /sync/operations`

## Offline

SQLite debe guardar datos operacionales y una cola local. Cada operacion offline recibe `id_local` UUID. Al sincronizar:

1. La app envia operaciones a `POST /sync/operations`.
2. El backend valida permisos y aplica cambios en TiDB.
3. El backend registra resultado en `operacion_sincronizacion`.
4. La app reemplaza IDs locales por IDs remotos cuando aplique.

## Seguridad

- Contrasenas con hash fuerte.
- Access token corto.
- Refresh token hash en `sesion_usuario`.
- Permisos calculados desde `permiso` y `permiso_rol`.
- Auditoria obligatoria para datos personales, clinicos, SFT, planes y reportes.
- Credenciales TiDB solo en `.env` del backend, nunca en la app Expo.
