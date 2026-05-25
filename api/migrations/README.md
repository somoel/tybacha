# Migraciones TiDB

El esquema base actual es el DDL entregado para TiDB. Este directorio contiene migraciones complementarias recomendadas para cerrar brechas funcionales del PDF.

Orden sugerido:

1. Aplicar el DDL base completo de TiDB.
2. Aplicar `0002_foto_perfil_usuario.sql`.
3. Ejecutar `npm --prefix api run seed` para crear permisos y administrador inicial.

Las credenciales reales de TiDB deben vivir en `api/.env`, que no se versiona.

