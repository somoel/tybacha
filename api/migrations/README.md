# Migraciones TiDB

`0001_initial.sql` contiene el esquema completo de la base de datos, incluyendo todas las tablas, índices, constraints y foreign keys.

## Aplicación

En una base de datos limpia, ejecutar únicamente:

```bash
0001_initial.sql
```

Luego ejecutar `npm --prefix api run seed` para crear permisos y administrador inicial.

## Notas

- Las credenciales reales de TiDB deben vivir en `api/.env`, que no se versiona.
- La tabla `profesional_cuidador` ya incluye el esquema final con soporte para la relación formal profesional ↔ cuidador (columnas `asignado_por`, `fecha_inicio`, `id_cuidador_activo`, etc.).
