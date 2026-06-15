import { env } from '../config/env.js';
import { PERMISSIONS } from '../domain/permissions.js';
import { hashPassword } from '../infrastructure/auth/passwords.js';
import { pool } from '../infrastructure/db/pool.js';

const rolePermissions: Record<string, string[]> = {
  administrador: Object.values(PERMISSIONS),
  profesional: [
    PERMISSIONS.olderAdultsCreate,
    PERMISSIONS.olderAdultsRead,
    PERMISSIONS.olderAdultsUpdate,
    PERMISSIONS.olderAdultsDeactivate,
    PERMISSIONS.caregiversAssign,
    PERMISSIONS.sftManage,
    PERMISSIONS.exercisePlansManage,
    PERMISSIONS.trackingManage,
    PERMISSIONS.notificationsManage,
    PERMISSIONS.reportsGenerate,
    PERMISSIONS.consentsManage,
  ],
  cuidador: [
    PERMISSIONS.olderAdultsCreate,
    PERMISSIONS.olderAdultsRead,
    PERMISSIONS.olderAdultsUpdate,
    PERMISSIONS.trackingManage,
    PERMISSIONS.notificationsManage,
  ],
};

const sftTests = [
  { nombre: 'Sentarse y levantarse de una silla', unidad: 'reps', orden: 1 },
  { nombre: 'Flexiones del brazo', unidad: 'reps', orden: 2 },
  { nombre: 'Caminar 6 minutos', unidad: 'metros', orden: 3 },
  { nombre: 'Marcha de dos minutos', unidad: 'pasos', orden: 4 },
  { nombre: 'Flexión del tronco en silla', unidad: 'cm', orden: 5 },
  { nombre: 'Juntar las manos tras la espalda', unidad: 'cm', orden: 6 },
  { nombre: 'Levantarse, caminar y volverse a sentar', unidad: 'segundos', orden: 7 },
];

async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const codigo of Object.values(PERMISSIONS)) {
      await connection.query(
        `insert into permiso (codigo, descripcion, modulo)
         values (:codigo, :descripcion, :modulo)
         on duplicate key update descripcion = values(descripcion), modulo = values(modulo)`,
        {
          codigo,
          descripcion: codigo,
          modulo: codigo.split('.')[0],
        },
      );
    }

    for (const [rol, permisos] of Object.entries(rolePermissions)) {
      for (const codigo of permisos) {
        await connection.query(
          `insert into permiso_rol (rol, id_permiso)
           select :rol, id_permiso from permiso where codigo = :codigo
           on duplicate key update rol = values(rol)`,
          { rol, codigo },
        );
      }
    }

    const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
    await connection.query(
      `insert into usuario (correo, contrasena_hash, rol, estado, correo_verificado)
       values (:correo, :passwordHash, 'administrador', 'activo', 1)
       on duplicate key update estado = 'activo', rol = 'administrador', contrasena_hash = values(contrasena_hash)`,
      {
        correo: env.SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
      },
    );

    await connection.query(
      `insert into perfil_usuario (id_usuario, nombres, apellidos)
       select id_usuario, :nombres, :apellidos from usuario where correo = :correo
       on duplicate key update nombres = values(nombres), apellidos = values(apellidos)`,
      {
        correo: env.SEED_ADMIN_EMAIL.toLowerCase(),
        nombres: env.SEED_ADMIN_NAMES,
        apellidos: env.SEED_ADMIN_LASTNAMES,
      },
    );

    await connection.query(
      `insert into bateria_sft (nombre, descripcion, version, estado)
       values ('Senior Fitness Test', 'Bateria funcional de Rikli & Jones para adultos mayores', '1.0', 'activa')
       on duplicate key update estado = 'activa', descripcion = values(descripcion)`,
    );

    for (const test of sftTests) {
      await connection.query(
        `insert into prueba_sft (id_bateria_sft, nombre, unidad_resultado, orden, activa)
         select id_bateria_sft, :nombre, :unidad, :orden, 1
         from bateria_sft
         where nombre = 'Senior Fitness Test' and version = '1.0'
         on duplicate key update nombre = values(nombre), unidad_resultado = values(unidad_resultado), activa = 1`,
        test,
      );
    }

    await connection.commit();
    console.log('Seeds aplicados correctamente');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

await main();
