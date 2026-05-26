# Migraciones TiDB

El esquema base actual es el DDL entregado para TiDB. Este directorio contiene migraciones complementarias recomendadas para cerrar brechas funcionales del PDF.

Orden sugerido:

1. Aplicar el DDL base completo de TiDB.
2. Aplicar `0002_foto_perfil_usuario.sql`.
3. Aplicar `0003_profesional_cuidador.sql`.
4. Ejecutar `npm --prefix api run seed` para crear permisos y administrador inicial.

`0003_profesional_cuidador.sql` formaliza la relacion profesional-cuidador:
un profesional puede tener muchos cuidadores y un cuidador solo puede tener una
asignacion activa. La migracion backfillea las relaciones existentes desde
`usuario.id_profesional_supervisor` cuando apuntan a un usuario con rol
`profesional`.

Las credenciales reales de TiDB deben vivir en `api/.env`, que no se versiona.
