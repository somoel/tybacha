import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { canCreateRole, type UserRole } from '../../../../domain/roles.js';
import { hashPassword, verifyPassword } from '../../../../infrastructure/auth/passwords.js';
import { createAccessToken, createRefreshToken, hashToken } from '../../../../infrastructure/auth/tokens.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { badRequest, forbidden, notFound, unauthorized } from '../../httpErrors.js';
import { requireAuth, requireRoles } from '../../requireAuth.js';
import { insertChangeAudit } from '../../../../infrastructure/db/audit.js';

const createUserSchema = z.object({
  correo: z.string().email(),
  contrasena: z.string().min(8),
  rol: z.enum(['administrador', 'profesional', 'cuidador']),
  nombres: z.string().min(1).max(120),
  apellidos: z.string().min(1).max(120),
  tipoDocumento: z.string().max(30).optional(),
  numeroDocumento: z.string().max(60).optional(),
  telefono: z.string().max(40).optional(),
  fechaNacimiento: z.string().date().optional(),
  genero: z.enum(['femenino', 'masculino']).optional(),
  direccion: z.string().max(255).optional(),
  ciudad: z.string().max(120).optional(),
});

const updateAdminUserSchema = z.object({
  correo: z.string().email().optional(),
  contrasena: z.string().min(8).optional(),
  estado: z.enum(['pendiente', 'activo', 'bloqueado', 'inactivo']).optional(),
  nombres: z.string().min(1).max(120).optional(),
  apellidos: z.string().min(1).max(120).optional(),
  tipoDocumento: z.string().max(30).optional(),
  numeroDocumento: z.string().max(60).optional(),
  telefono: z.string().max(40).optional(),
  fechaNacimiento: z.string().date().optional(),
  genero: z.enum(['femenino', 'masculino']).optional(),
  direccion: z.string().max(255).optional(),
  ciudad: z.string().max(120).optional(),
});

const updateProfessionalCaregiversSchema = z.object({
  caregiverIds: z.array(z.coerce.number().int().positive()).max(500),
});

interface MeRow extends RowDataPacket {
  id_usuario: number;
  correo: string;
  rol: UserRole;
  estado: string;
  id_profesional_supervisor: number | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  ciudad: string | null;
}

interface AdminUserRow extends RowDataPacket {
  id_usuario: number;
  correo: string;
  rol: UserRole;
  estado: string;
  nombres: string | null;
  apellidos: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  ciudad: string | null;
}

interface AdminCaregiverRow extends RowDataPacket {
  id_usuario: number;
  correo: string;
  estado: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  ciudad: string | null;
  cantidad_pacientes: number;
}

async function getAdminUserDetail(id: number) {
  const [userRows] = await pool.query<AdminUserRow[]>(
    `select u.id_usuario, u.correo, u.rol, u.estado,
            p.nombres, p.apellidos, p.tipo_documento, p.numero_documento,
            p.telefono, p.fecha_nacimiento, p.genero, p.direccion, p.ciudad
     from usuario u
     left join perfil_usuario p on p.id_usuario = u.id_usuario
     where u.id_usuario = :id
     limit 1`,
    { id },
  );
  const user = userRows[0];
  if (!user) throw notFound('Usuario no encontrado');

  const [caregiverRows] = await pool.query<AdminCaregiverRow[]>(
    `select u.id_usuario, u.correo, u.estado,
            p.nombres, p.apellidos, p.telefono, p.ciudad,
            coalesce(patient_stats.cantidad_pacientes, 0) as cantidad_pacientes
     from profesional_cuidador pc
     inner join usuario u on u.id_usuario = pc.id_cuidador and u.rol = 'cuidador'
     left join perfil_usuario p on p.id_usuario = u.id_usuario
     left join (
       select id_cuidador, count(distinct id_adulto_mayor) as cantidad_pacientes
       from asignacion_cuidador_adulto_mayor
       where estado = 'activa'
       group by id_cuidador
     ) patient_stats on patient_stats.id_cuidador = u.id_usuario
     where pc.id_profesional = :id and pc.estado = 'activa'
     order by p.apellidos, p.nombres, u.correo`,
    { id },
  );

  return {
    idUsuario: user.id_usuario,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
    nombres: user.nombres,
    apellidos: user.apellidos,
    tipoDocumento: user.tipo_documento,
    numeroDocumento: user.numero_documento,
    telefono: user.telefono,
    fechaNacimiento: user.fecha_nacimiento,
    genero: user.genero,
    direccion: user.direccion,
    ciudad: user.ciudad,
    cuidadores: caregiverRows.map((caregiver) => ({
      idUsuario: caregiver.id_usuario,
      correo: caregiver.correo,
      rol: 'cuidador' as const,
      estado: caregiver.estado,
      nombres: caregiver.nombres,
      apellidos: caregiver.apellidos,
      telefono: caregiver.telefono,
      ciudad: caregiver.ciudad,
      cantidadPacientes: caregiver.cantidad_pacientes,
    })),
  };
}

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: requireAuth(app) }, async (request) => {
    const userId = request.authUser?.idUsuario;
    const [rows] = await pool.query<MeRow[]>(
      `select u.id_usuario, u.correo, u.rol, u.estado,
              u.id_profesional_supervisor, p.nombres, p.apellidos, p.telefono, p.ciudad
       from usuario u
       left join perfil_usuario p on p.id_usuario = u.id_usuario
       where u.id_usuario = :userId
       limit 1`,
      { userId },
    );

    const row = rows[0];
    if (!row) throw notFound('Usuario no encontrado');

    return {
      idUsuario: row.id_usuario,
      correo: row.correo,
      rol: row.rol,
      estado: row.estado,
      perfil: {
        nombres: row.nombres,
        apellidos: row.apellidos,
        telefono: row.telefono,
        ciudad: row.ciudad,
      },
    };
  });

  const updateMeSchema = z.object({
    nombres: z.string().min(1).max(120).optional(),
    apellidos: z.string().min(1).max(120).optional(),
    telefono: z.string().max(40).optional(),
    ciudad: z.string().max(120).optional(),
  });

  app.put('/me', { preHandler: requireAuth(app) }, async (request) => {
    const userId = request.authUser!.idUsuario;
    const body = updateMeSchema.parse(request.body);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query<RowDataPacket[]>(
        `select p.nombres, p.apellidos, p.telefono, p.ciudad
         from perfil_usuario p
         where p.id_usuario = :userId
         limit 1`,
        { userId },
      );

      const existing = existingRows[0];

      if (existing) {
        await connection.query(
          `update perfil_usuario
           set nombres = coalesce(:nombres, nombres),
               apellidos = coalesce(:apellidos, apellidos),
               telefono = coalesce(:telefono, telefono),
               ciudad = coalesce(:ciudad, ciudad)
           where id_usuario = :userId`,
          {
            userId,
            nombres: body.nombres ?? null,
            apellidos: body.apellidos ?? null,
            telefono: body.telefono ?? null,
            ciudad: body.ciudad ?? null,
          },
        );
      } else {
        await connection.query(
          `insert into perfil_usuario (id_usuario, nombres, apellidos, telefono, ciudad)
           values (:userId, :nombres, :apellidos, :telefono, :ciudad)`,
          {
            userId,
            nombres: body.nombres ?? null,
            apellidos: body.apellidos ?? null,
            telefono: body.telefono ?? null,
            ciudad: body.ciudad ?? null,
          },
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'perfil_usuario',
        registroId: userId,
        accion: 'actualizar',
        anteriores: existing ?? {},
        nuevos: body,
        context: {
          userId,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();

      const [updatedRows] = await pool.query<MeRow[]>(
        `select u.id_usuario, u.correo, u.rol, u.estado,
                u.id_profesional_supervisor, p.nombres, p.apellidos, p.telefono, p.ciudad
         from usuario u
         left join perfil_usuario p on p.id_usuario = u.id_usuario
         where u.id_usuario = :userId
         limit 1`,
        { userId },
      );

      const row = updatedRows[0];
      if (!row) throw notFound('Usuario no encontrado');

      return {
        idUsuario: row.id_usuario,
        correo: row.correo,
        rol: row.rol,
        estado: row.estado,
        perfil: {
          nombres: row.nombres,
          apellidos: row.apellidos,
          telefono: row.telefono,
          ciudad: row.ciudad,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.get('/users/professionals', { preHandler: requireRoles(app, ['administrador']) }, async () => {
    const [rows] = await pool.query<MeRow[]>(
      `select u.id_usuario, u.correo, u.rol, u.estado,
              u.id_profesional_supervisor, p.nombres, p.apellidos, p.telefono, p.ciudad
       from usuario u
       left join perfil_usuario p on p.id_usuario = u.id_usuario
       where u.rol = 'profesional'
       order by p.apellidos, p.nombres, u.correo`,
    );

    return rows.map((row) => ({
      idUsuario: row.id_usuario,
      correo: row.correo,
      rol: row.rol,
      estado: row.estado,
      nombres: row.nombres,
      apellidos: row.apellidos,
      telefono: row.telefono,
      ciudad: row.ciudad,
    }));
  });

  app.get('/users/:id', { preHandler: requireRoles(app, ['administrador']) }, async (request) => {
    const id = z.coerce.number().int().positive().parse((request.params as { id: string }).id);
    return getAdminUserDetail(id);
  });

  app.put('/users/:id', { preHandler: requireRoles(app, ['administrador']) }, async (request) => {
    const id = z.coerce.number().int().positive().parse((request.params as { id: string }).id);
    const body = updateAdminUserSchema.parse(request.body);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [existingRows] = await connection.query<RowDataPacket[]>(
        `select u.id_usuario, u.rol, u.correo, u.estado,
                p.nombres, p.apellidos, p.tipo_documento, p.numero_documento,
                p.telefono, p.fecha_nacimiento, p.genero, p.direccion, p.ciudad
         from usuario u
         left join perfil_usuario p on p.id_usuario = u.id_usuario
         where u.id_usuario = :id limit 1`,
        { id },
      );
      const existing = existingRows[0] as (RowDataPacket & { rol: UserRole }) | undefined;
      if (!existing) throw notFound('Usuario no encontrado');
      if (!['profesional', 'cuidador'].includes(existing.rol)) {
        throw badRequest('Solo se pueden editar profesionales y cuidadores');
      }

      const userUpdates: string[] = [];
      const userParams: Record<string, string | number> = { id };
      if (body.correo !== undefined) {
        userUpdates.push('correo = :correo');
        userParams.correo = body.correo.toLowerCase();
      }
      if (body.estado !== undefined) {
        userUpdates.push('estado = :estado');
        userParams.estado = body.estado;
      }
      if (body.contrasena !== undefined) {
        userUpdates.push('contrasena_hash = :passwordHash');
        userParams.passwordHash = await hashPassword(body.contrasena);
      }
      if (userUpdates.length > 0) {
        await connection.query(`update usuario set ${userUpdates.join(', ')} where id_usuario = :id`, userParams);
      }

      const profileFields = [
        'nombres', 'apellidos', 'tipoDocumento', 'numeroDocumento', 'telefono',
        'fechaNacimiento', 'genero', 'direccion', 'ciudad',
      ] as const;
      const profileColumnMap: Record<(typeof profileFields)[number], string> = {
        nombres: 'nombres', apellidos: 'apellidos', tipoDocumento: 'tipo_documento',
        numeroDocumento: 'numero_documento', telefono: 'telefono', fechaNacimiento: 'fecha_nacimiento',
        genero: 'genero', direccion: 'direccion', ciudad: 'ciudad',
      };
      const providedProfileFields = profileFields.filter((field) => body[field] !== undefined);
      if (providedProfileFields.length > 0) {
        const [profileRows] = await connection.query<RowDataPacket[]>(
          'select id_usuario from perfil_usuario where id_usuario = :id limit 1', { id },
        );
        const profileParams = Object.fromEntries(providedProfileFields.map((field, index) => [`profile${index}`, body[field] ?? null]));
        if (profileRows[0]) {
          const updates = providedProfileFields.map((field, index) => `${profileColumnMap[field]} = :profile${index}`);
          await connection.query(`update perfil_usuario set ${updates.join(', ')} where id_usuario = :id`, { id, ...profileParams });
        } else {
          const columns = providedProfileFields.map((field) => profileColumnMap[field]);
          const values = providedProfileFields.map((_, index) => `:profile${index}`);
          await connection.query(
            `insert into perfil_usuario (id_usuario, ${columns.join(', ')}) values (:id, ${values.join(', ')})`,
            { id, ...profileParams },
          );
        }
      }

      await insertChangeAudit(connection, {
        tabla: 'usuario', registroId: id, accion: 'actualizar', anteriores: existing,
        nuevos: { ...body, ...(body.contrasena ? { contrasena: '***' } : {}) },
        context: { userId: request.authUser!.idUsuario, ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      });
      if (body.correo !== undefined || body.contrasena !== undefined || body.estado !== undefined) {
        await connection.query(
          `update sesion_usuario set revocada_en = current_timestamp(3)
           where id_usuario = :id and revocada_en is null`, { id },
        );
      }
      await connection.commit();
      return getAdminUserDetail(id);
    } catch (error) {
      await connection.rollback();
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw badRequest('El correo ya está en uso por otro usuario');
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  app.put('/users/:id/caregivers', { preHandler: requireRoles(app, ['administrador']) }, async (request) => {
    const id = z.coerce.number().int().positive().parse((request.params as { id: string }).id);
    const { caregiverIds } = updateProfessionalCaregiversSchema.parse(request.body);
    const uniqueCaregiverIds = [...new Set(caregiverIds)];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [professionalRows] = await connection.query<RowDataPacket[]>(
        `select id_usuario from usuario where id_usuario = :id and rol = 'profesional' limit 1`, { id },
      );
      if (!professionalRows[0]) throw notFound('Profesional no encontrado');
      const [currentRows] = await connection.query<RowDataPacket[]>(
        `select id_cuidador from profesional_cuidador where id_profesional = :id and estado = 'activa'`, { id },
      );
      const currentIds = currentRows.map((row) => Number(row.id_cuidador));
      const toRemove = currentIds.filter((caregiverId) => !uniqueCaregiverIds.includes(caregiverId));
      const toAdd = uniqueCaregiverIds.filter((caregiverId) => !currentIds.includes(caregiverId));

      if (uniqueCaregiverIds.length > 0) {
        const [caregiverRows] = await connection.query<RowDataPacket[]>(
          `select id_usuario from usuario where id_usuario in (:caregiverIds)
           and rol = 'cuidador' and estado <> 'inactivo'`, { caregiverIds: uniqueCaregiverIds },
        );
        if (caregiverRows.length !== uniqueCaregiverIds.length) {
          throw badRequest('Uno o más cuidadores no existen o no están disponibles');
        }
        const [assignedRows] = await connection.query<RowDataPacket[]>(
          `select id_cuidador from profesional_cuidador
           where id_cuidador in (:caregiverIds) and estado = 'activa' and id_profesional <> :id`,
          { caregiverIds: uniqueCaregiverIds, id },
        );
        if (assignedRows.length > 0) throw badRequest('Uno o más cuidadores ya están asignados a otro profesional');
      }

      if (toRemove.length > 0) {
        await connection.query(
          `update profesional_cuidador
           set estado = 'finalizada', fecha_fin = current_date(), motivo_finalizacion = 'Actualización administrativa', id_cuidador_activo = null
           where id_profesional = :id and id_cuidador in (:toRemove) and estado = 'activa'`, { id, toRemove },
        );
      }
      for (const caregiverId of toAdd) {
        await connection.query(
          `insert into profesional_cuidador
             (id_profesional, id_cuidador, asignado_por, estado, fecha_inicio, id_cuidador_activo)
           values (:id, :caregiverId, :assignedBy, 'activa', current_date(), :caregiverId)`,
          { id, caregiverId, assignedBy: request.authUser!.idUsuario },
        );
      }
      await insertChangeAudit(connection, {
        tabla: 'profesional_cuidador', registroId: id, accion: 'actualizar',
        anteriores: { caregiverIds: currentIds }, nuevos: { caregiverIds: uniqueCaregiverIds },
        context: { userId: request.authUser!.idUsuario, ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      });
      await connection.commit();
      return getAdminUserDetail(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.get('/users', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const roleFilter = actor.rol === 'administrador' ? ['profesional', 'cuidador'] : ['cuidador'];

    const [rows] = await pool.query<MeRow[]>(
      `select u.id_usuario, u.correo, u.rol, u.estado,
              u.id_profesional_supervisor, p.nombres, p.apellidos, p.telefono, p.ciudad
       from usuario u
       left join perfil_usuario p on p.id_usuario = u.id_usuario
       left join profesional_cuidador pc
         on pc.id_cuidador = u.id_usuario and pc.estado = 'activa'
       where u.rol in (:roles)
         and (:actorRol = 'administrador' or pc.id_profesional = :actorId)
       order by p.apellidos, p.nombres, u.correo`,
      { roles: roleFilter, actorRol: actor.rol, actorId: actor.idUsuario },
    );

    return rows.map((row) => ({
      idUsuario: row.id_usuario,
      correo: row.correo,
      rol: row.rol,
      estado: row.estado,
      nombres: row.nombres,
      apellidos: row.apellidos,
      telefono: row.telefono,
      ciudad: row.ciudad,
    }));
  });

  app.post('/users', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const body = createUserSchema.parse(request.body);

    if (!canCreateRole(actor.rol, body.rol)) {
      throw forbidden('No puede crear usuarios con ese rol');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const passwordHash = await hashPassword(body.contrasena);
      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into usuario
          (correo, contrasena_hash, rol, estado, correo_verificado, id_profesional_supervisor)
         values
          (:correo, :passwordHash, :rol, 'activo', 1, :supervisor)`,
        {
          correo: body.correo.toLowerCase(),
          passwordHash,
          rol: body.rol,
          supervisor: actor.rol === 'profesional' && body.rol === 'cuidador' ? actor.idUsuario : null,
        },
      );

      const idUsuario = insertResult.insertId;

      if (actor.rol === 'profesional' && body.rol === 'cuidador') {
        await connection.query(
          `insert into profesional_cuidador
            (id_profesional, id_cuidador, asignado_por, estado, fecha_inicio, id_cuidador_activo)
           values
            (:idProfesional, :idCuidador, :asignadoPor, 'activa', current_date(), :idCuidador)`,
          {
            idProfesional: actor.idUsuario,
            idCuidador: idUsuario,
            asignadoPor: actor.idUsuario,
          },
        );
      }

      await connection.query(
        `insert into perfil_usuario
          (id_usuario, nombres, apellidos, tipo_documento, numero_documento, telefono, fecha_nacimiento, genero, direccion, ciudad)
         values
          (:idUsuario, :nombres, :apellidos, :tipoDocumento, :numeroDocumento, :telefono, :fechaNacimiento, :genero, :direccion, :ciudad)`,
        {
          idUsuario,
          nombres: body.nombres,
          apellidos: body.apellidos,
          tipoDocumento: body.tipoDocumento ?? null,
          numeroDocumento: body.numeroDocumento ?? null,
          telefono: body.telefono ?? null,
          fechaNacimiento: body.fechaNacimiento ?? null,
          genero: body.genero ?? null,
          direccion: body.direccion ?? null,
          ciudad: body.ciudad ?? null,
        },
      );

      await connection.commit();

      return {
        idUsuario,
        correo: body.correo.toLowerCase(),
        rol: body.rol,
        estado: 'activo',
      };
    } catch (error) {
      await connection.rollback();
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw badRequest('Ya existe un usuario con esos datos');
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  const changeEmailSchema = z.object({
    nuevoCorreo: z.string().email(),
    contrasena: z.string().min(8),
  });

  app.put('/me/email', { preHandler: requireAuth(app) }, async (request) => {
    const userId = request.authUser!.idUsuario;
    const body = changeEmailSchema.parse(request.body);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_usuario, contrasena_hash
       from usuario
       where id_usuario = :userId
       limit 1`,
      { userId },
    );

    const userRow = rows[0] as { contrasena_hash: string } | undefined;
    if (!userRow) throw notFound('Usuario no encontrado');

    const valid = await verifyPassword(body.contrasena, userRow.contrasena_hash);
    if (!valid) throw unauthorized('Contraseña incorrecta');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `update usuario set correo = :nuevoCorreo where id_usuario = :userId`,
        { nuevoCorreo: body.nuevoCorreo.toLowerCase(), userId },
      );

      await insertChangeAudit(connection, {
        tabla: 'usuario',
        registroId: userId,
        accion: 'actualizar',
        anteriores: { correo: rows[0] },
        nuevos: { correo: body.nuevoCorreo.toLowerCase() },
        context: {
          userId,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.query(
        `update sesion_usuario set revocada_en = current_timestamp(3)
         where id_usuario = :userId and revocada_en is null`,
        { userId },
      );

      await connection.commit();

      const tokenUser = { idUsuario: userId, correo: body.nuevoCorreo.toLowerCase(), rol: request.authUser!.rol };
      const accessToken = await createAccessToken(tokenUser);
      const refreshToken = await createRefreshToken(tokenUser);

      return {
        accessToken,
        refreshToken,
        user: { idUsuario: userId, correo: body.nuevoCorreo.toLowerCase(), rol: request.authUser!.rol },
      };
    } catch (error) {
      await connection.rollback();
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw badRequest('El correo ya está en uso por otro usuario');
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  const changePasswordSchema = z.object({
    contrasenaActual: z.string().min(8),
    nuevaContrasena: z.string().min(8),
  });

  app.put('/me/password', { preHandler: requireAuth(app) }, async (request) => {
    const userId = request.authUser!.idUsuario;
    const body = changePasswordSchema.parse(request.body);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_usuario, contrasena_hash
       from usuario
       where id_usuario = :userId
       limit 1`,
      { userId },
    );

    const userRow = rows[0] as { contrasena_hash: string } | undefined;
    if (!userRow) throw notFound('Usuario no encontrado');

    const valid = await verifyPassword(body.contrasenaActual, userRow.contrasena_hash);
    if (!valid) throw unauthorized('Contraseña actual incorrecta');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const newHash = await hashPassword(body.nuevaContrasena);
      await connection.query(
        `update usuario set contrasena_hash = :newHash where id_usuario = :userId`,
        { newHash, userId },
      );

      await insertChangeAudit(connection, {
        tabla: 'usuario',
        registroId: userId,
        accion: 'actualizar',
        anteriores: {},
        nuevos: { contrasena: '***' },
        context: {
          userId,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.query(
        `update sesion_usuario set revocada_en = current_timestamp(3)
         where id_usuario = :userId and revocada_en is null`,
        { userId },
      );

      await connection.commit();

      return { message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
}
