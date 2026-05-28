import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { canCreateRole, type UserRole } from '../../../../domain/roles.js';
import { hashPassword } from '../../../../infrastructure/auth/passwords.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
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
  genero: z.enum(['femenino', 'masculino', 'otro', 'no_informa']).optional(),
  direccion: z.string().max(255).optional(),
  ciudad: z.string().max(120).optional(),
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
}
