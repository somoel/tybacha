import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { insertAccessAuditWithPool, insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { diaDeSemanaEnColombia, hoyEnColombia, toUtcIso } from '../../../../infrastructure/db/datetime.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
import { requireAuth, requireRoles } from '../../requireAuth.js';

const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_BYTES = 1 * 1024 * 1024;

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const genderSchema = z.enum(['femenino', 'masculino']);

const createOlderAdultSchema = z.object({
  nombres: z.string().min(1).max(120),
  apellidos: z.string().min(1).max(120),
  fechaNacimiento: z.string().date(),
  genero: genderSchema.default('masculino'),
  tipoDocumento: z.string().max(30).optional(),
  numeroDocumento: z.string().max(60).optional(),
  telefono: z.string().max(40).optional(),
  correoContacto: z.string().email().optional(),
  direccion: z.string().max(255).optional(),
  ciudad: z.string().max(120).optional(),
  nombreContactoEmergencia: z.string().max(160).optional(),
  telefonoContactoEmergencia: z.string().max(40).optional(),
  idCuidador: z.number().int().positive().optional(),
});

const updateOlderAdultSchema = createOlderAdultSchema.partial().extend({
  estado: z.enum(['activo', 'inactivo']).optional(),
  motivoInactivacion: z.string().max(255).optional(),
});

const listOlderAdultsQuerySchema = z.object({
  limit: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : undefined),
    z.number().int().positive().optional(),
  ),
  order: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value : undefined),
    z.enum(['alfabetico', 'recientes']).default('alfabetico'),
  ),
});

const summaryOlderAdultsQuerySchema = z.object({
  ids: z.preprocess(
    (value) => (Array.isArray(value) ? value.join(',') : value),
    z.string().optional(),
  ),
});

interface OlderAdultRow extends RowDataPacket {
  id_adulto_mayor: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  telefono: string | null;
  correo_contacto: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string;
  id_profesional_responsable: number | null;
  id_cuidador: number | null;
  cuidador_nombres: string | null;
  cuidador_apellidos: string | null;
  has_photo?: number | null;
}

interface PhotoRow extends RowDataPacket {
  foto_binaria: Buffer;
  tipo_mime: string;
  tamano_bytes: number;
}

interface OlderAdultSummaryRow extends RowDataPacket {
  id_adulto_mayor: number;
  battery_count: number | null;
  has_active_plan: number | null;
  today_total: number | null;
  today_completed: number | null;
  last_exercise_date: string | null;
  weekly_compliance: number | null;
}

function mapOlderAdult(row: OlderAdultRow) {
  return {
    idAdultoMayor: row.id_adulto_mayor,
    nombres: row.nombres,
    apellidos: row.apellidos,
    fechaNacimiento: row.fecha_nacimiento,
    genero: row.genero,
    tipoDocumento: row.tipo_documento,
    numeroDocumento: row.numero_documento,
    telefono: row.telefono,
    correoContacto: row.correo_contacto,
    direccion: row.direccion,
    ciudad: row.ciudad,
    estado: row.estado,
    idProfesionalResponsable: row.id_profesional_responsable,
    hasPhoto: Boolean(row.has_photo),
    cuidador: row.id_cuidador
      ? {
          idUsuario: row.id_cuidador,
          nombres: row.cuidador_nombres,
          apellidos: row.cuidador_apellidos,
        }
      : null,
  };
}

async function assertOlderAdultExists(idAdultoMayor: number): Promise<OlderAdultRow> {
  const [rows] = await pool.query<OlderAdultRow[]>(
    `select a.*,
            ac.id_cuidador,
            null as cuidador_nombres,
            null as cuidador_apellidos
     from adulto_mayor a
     left join asignacion_cuidador_adulto_mayor ac
       on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
     where a.id_adulto_mayor = :id
     limit 1`,
    { id: idAdultoMayor },
  );
  const row = rows[0];
  if (!row) throw notFound('Adulto mayor no encontrado');
  return row;
}

function assertActorAllowed(actor: { rol: string; idUsuario: number }, row: OlderAdultRow): void {
  const allowed =
    actor.rol === 'administrador' ||
    row.id_profesional_responsable === actor.idUsuario ||
    row.id_cuidador === actor.idUsuario;
  if (!allowed) throw forbidden();
}

async function assertCaregiverExists(idCuidador: number, idProfesional?: number): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `select u.id_usuario
     from usuario u
     left join profesional_cuidador pc
       on pc.id_cuidador = u.id_usuario
      and pc.estado = 'activa'
     where u.id_usuario = :idCuidador
       and u.rol = 'cuidador'
       and u.estado = 'activo'
       and (:idProfesional is null or pc.id_profesional = :idProfesional)
     limit 1`,
    { idCuidador, idProfesional: idProfesional ?? null },
  );
  if (!rows[0]) throw badRequest('El cuidador indicado no existe, no esta activo o no pertenece al profesional');
}

function buildOlderAdultScope(actor: { rol: string; idUsuario: number }): {
  where: string;
  params: Record<string, string | number>;
} {
  if (actor.rol === 'profesional') {
    return {
      where: 'where a.id_profesional_responsable = :actorId',
      params: { actorId: actor.idUsuario },
    };
  }

  if (actor.rol === 'cuidador') {
    return {
      where: `where exists (
        select 1 from asignacion_cuidador_adulto_mayor ac
        where ac.id_adulto_mayor = a.id_adulto_mayor
          and ac.id_cuidador = :actorId
          and ac.estado = 'activa'
      )`,
      params: { actorId: actor.idUsuario },
    };
  }

  return { where: '', params: {} };
}

function parseIdsParam(raw: string | undefined): number[] | undefined {
  if (!raw?.trim()) return undefined;
  const values = raw.split(',').map((value) => Number(value.trim()));
  if (values.some((value) => !Number.isInteger(value) || value <= 0)) return undefined;
  return values;
}

export async function registerOlderAdultRoutes(app: FastifyInstance): Promise<void> {
  app.get('/older-adults', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const query = listOlderAdultsQuerySchema.parse(request.query);

    const scope = buildOlderAdultScope(actor);
    const params: Record<string, string | number> = { ...scope.params };
    if (query.limit !== undefined) params.limit = query.limit;

    const orderBy = query.order === 'recientes'
      ? 'a.creado_en desc, a.id_adulto_mayor desc'
      : 'a.apellidos, a.nombres';

    const [rows] = await pool.query<OlderAdultRow[]>(
      `select a.*,
              ac.id_cuidador,
              pc.nombres as cuidador_nombres,
              pc.apellidos as cuidador_apellidos,
              (select 1 from foto_perfil_adulto_mayor fp where fp.id_adulto_mayor = a.id_adulto_mayor limit 1) as has_photo
       from adulto_mayor a
       left join asignacion_cuidador_adulto_mayor ac
         on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
       left join perfil_usuario pc on pc.id_usuario = ac.id_cuidador
       ${scope.where}
       order by ${orderBy}
       ${query.limit !== undefined ? 'limit :limit' : ''}`,
      params,
    );

    return rows.map(mapOlderAdult);
  });

  app.get('/older-adults/summary', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const query = summaryOlderAdultsQuerySchema.parse(request.query);
    const ids = parseIdsParam(query.ids);

    const scope = buildOlderAdultScope(actor);
    const params: Record<string, string | number | number[]> = {
      ...scope.params,
      diaHoy: WEEKDAY_KEYS[diaDeSemanaEnColombia()],
      hoyColombia: hoyEnColombia(),
    };
    if (ids) params.ids = ids;

    let where = scope.where;
    if (ids) {
      where = where
        ? `${where} and a.id_adulto_mayor in (:ids)`
        : 'where a.id_adulto_mayor in (:ids)';
    }

    const [rows] = await pool.query<OlderAdultSummaryRow[]>(
      `select a.id_adulto_mayor,
              coalesce((select count(*) from aplicacion_sft aps
                where aps.id_adulto_mayor = a.id_adulto_mayor and aps.estado = 'finalizada'), 0) as battery_count,
              (select 1 from plan_ejercicio pe
                where pe.id_adulto_mayor = a.id_adulto_mayor
                  and pe.estado not in ('borrador', 'finalizado', 'cancelado')
                limit 1) as has_active_plan,
              coalesce((select count(*) from ejercicio_plan ep
                join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
                where pe.id_adulto_mayor = a.id_adulto_mayor
                  and pe.estado not in ('borrador', 'finalizado', 'cancelado')
                  and ep.activo = 1 and ep.dia_semana = :diaHoy), 0) as today_total,
              coalesce((select count(*) from registro_ejercicio_plan rep
                join ejercicio_plan ep on ep.id_ejercicio_plan = rep.id_ejercicio_plan
                join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
                where pe.id_adulto_mayor = a.id_adulto_mayor
                  and pe.estado not in ('borrador', 'finalizado', 'cancelado')
                  and ep.activo = 1 and ep.dia_semana = :diaHoy
                  and rep.fecha_programada = :hoyColombia and rep.estado = 'completado'), 0) as today_completed,
              (select max(rep.fecha_realizacion) from registro_ejercicio_plan rep
                where rep.id_adulto_mayor = a.id_adulto_mayor and rep.estado = 'completado') as last_exercise_date,
              coalesce((select est.porcentaje_cumplimiento from estadistica_progreso est
                where est.id_adulto_mayor = a.id_adulto_mayor
                order by est.fecha_inicio desc, est.calculado_en desc limit 1), 0) as weekly_compliance
       from adulto_mayor a
       ${where}
       order by a.creado_en desc, a.id_adulto_mayor desc`,
      params,
    );

    return {
      totalAdultos: rows.length,
      conPlanActivo: rows.filter((row) => Boolean(row.has_active_plan)).length,
      items: rows.map((row) => ({
        idAdultoMayor: row.id_adulto_mayor,
        batteryCount: row.battery_count ?? 0,
        hasActivePlan: Boolean(row.has_active_plan),
        todayTotal: row.today_total ?? 0,
        todayCompleted: row.today_completed ?? 0,
        weeklyCompliance: row.weekly_compliance ?? 0,
        lastExerciseDate: toUtcIso(row.last_exercise_date),
      })),
    };
  });

  app.get('/older-adults/:id', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<OlderAdultRow[]>(
      `select a.*,
              ac.id_cuidador,
              pc.nombres as cuidador_nombres,
              pc.apellidos as cuidador_apellidos
       from adulto_mayor a
       left join asignacion_cuidador_adulto_mayor ac
         on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
       left join perfil_usuario pc on pc.id_usuario = ac.id_cuidador
       where a.id_adulto_mayor = :id
       limit 1`,
      { id: params.id },
    );

    const row = rows[0];
    if (!row) throw notFound('Adulto mayor no encontrado');

    const allowed =
      actor.rol === 'administrador' ||
      row.id_profesional_responsable === actor.idUsuario ||
      row.id_cuidador === actor.idUsuario;

    if (!allowed) {
      await insertAccessAuditWithPool(() => pool.getConnection(), {
        idUsuario: actor.idUsuario,
        idAdultoMayor: params.id,
        tipoDato: 'personal',
        accion: 'consultar',
        resultado: 'denegado',
        motivo: 'Consulta de ficha adulto mayor no autorizada',
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });
      throw forbidden();
    }

    await insertAccessAuditWithPool(() => pool.getConnection(), {
      idUsuario: actor.idUsuario,
      idAdultoMayor: params.id,
      tipoDato: 'personal',
      accion: 'consultar',
      resultado: 'permitido',
      motivo: 'Consulta de ficha adulto mayor',
      context: {
        userId: actor.idUsuario,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    const adult = mapOlderAdult(row);

    const [photoRows] = await pool.query<PhotoRow[]>(
      `select foto_binaria, tipo_mime, tamano_bytes
       from foto_perfil_adulto_mayor
       where id_adulto_mayor = :id
       limit 1`,
      { id: params.id },
    );

    const photo = photoRows[0];
    return {
      ...adult,
      photoData: photo
        ? `data:${photo.tipo_mime};base64,${photo.foto_binaria.toString('base64')}`
        : null,
    };
  });

  app.post('/older-adults', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = createOlderAdultSchema.parse(request.body);

    if (actor.rol === 'administrador') {
      throw forbidden('El administrador no crea adultos mayores directamente');
    }

    const idCuidador = actor.rol === 'cuidador' ? actor.idUsuario : (body.idCuidador ?? null);
    if (idCuidador) {
      await assertCaregiverExists(idCuidador, actor.rol === 'profesional' ? actor.idUsuario : undefined);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into adulto_mayor
          (nombres, apellidos, fecha_nacimiento, genero, tipo_documento, numero_documento,
           telefono, correo_contacto, direccion, ciudad, nombre_contacto_emergencia,
           telefono_contacto_emergencia, id_profesional_responsable, creado_por, actualizado_por)
         values
          (:nombres, :apellidos, :fechaNacimiento, :genero, :tipoDocumento, :numeroDocumento,
           :telefono, :correoContacto, :direccion, :ciudad, :nombreContactoEmergencia,
           :telefonoContactoEmergencia, :profesional, :creadoPor, :actualizadoPor)`,
        {
          nombres: body.nombres,
          apellidos: body.apellidos,
          fechaNacimiento: body.fechaNacimiento,
          genero: body.genero,
          tipoDocumento: body.tipoDocumento ?? null,
          numeroDocumento: body.numeroDocumento ?? null,
          telefono: body.telefono ?? null,
          correoContacto: body.correoContacto ?? null,
          direccion: body.direccion ?? null,
          ciudad: body.ciudad ?? null,
          nombreContactoEmergencia: body.nombreContactoEmergencia ?? null,
          telefonoContactoEmergencia: body.telefonoContactoEmergencia ?? null,
          profesional: actor.rol === 'profesional' ? actor.idUsuario : null,
          creadoPor: actor.idUsuario,
          actualizadoPor: actor.idUsuario,
        },
      );

      const idAdultoMayor = insertResult.insertId;
      if (idCuidador) {
        await connection.query(
          `insert into asignacion_cuidador_adulto_mayor
            (id_adulto_mayor, id_cuidador, asignado_por, fecha_inicio)
           values
            (:idAdultoMayor, :idCuidador, :asignadoPor, :hoy)`,
          {
            idAdultoMayor,
            idCuidador,
            asignadoPor: actor.idUsuario,
            hoy: hoyEnColombia(),
          },
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'adulto_mayor',
        registroId: idAdultoMayor,
        accion: 'crear',
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();

      return {
        idAdultoMayor,
        ...body,
        idCuidador: idCuidador ?? undefined,
        estado: 'activo',
      };
    } catch (error) {
      await connection.rollback();
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw badRequest('Ya existe un adulto mayor con ese documento o asignacion duplicada');
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  app.patch('/older-adults/:id', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = updateOlderAdultSchema.parse(request.body);

    if (actor.rol === 'cuidador' && body.estado === 'inactivo') {
      throw forbidden('El cuidador no puede inactivar adultos mayores');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query<OlderAdultRow[]>(
        `select a.*,
                ac.id_cuidador,
                null as cuidador_nombres,
                null as cuidador_apellidos
         from adulto_mayor a
         left join asignacion_cuidador_adulto_mayor ac
           on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
         where a.id_adulto_mayor = :id
         limit 1`,
        { id: params.id },
      );

      const existing = existingRows[0];
      if (!existing) throw notFound('Adulto mayor no encontrado');

      const allowed =
        actor.rol === 'administrador' ||
        existing.id_profesional_responsable === actor.idUsuario ||
        existing.id_cuidador === actor.idUsuario;
      if (!allowed) throw forbidden();

      await connection.query(
        `update adulto_mayor
         set nombres = coalesce(:nombres, nombres),
             apellidos = coalesce(:apellidos, apellidos),
             fecha_nacimiento = coalesce(:fechaNacimiento, fecha_nacimiento),
             genero = coalesce(:genero, genero),
             tipo_documento = coalesce(:tipoDocumento, tipo_documento),
             numero_documento = coalesce(:numeroDocumento, numero_documento),
             telefono = coalesce(:telefono, telefono),
             correo_contacto = coalesce(:correoContacto, correo_contacto),
             direccion = coalesce(:direccion, direccion),
             ciudad = coalesce(:ciudad, ciudad),
             nombre_contacto_emergencia = coalesce(:nombreContactoEmergencia, nombre_contacto_emergencia),
             telefono_contacto_emergencia = coalesce(:telefonoContactoEmergencia, telefono_contacto_emergencia),
             estado = coalesce(:estado, estado),
             motivo_inactivacion = case when :estado = 'inactivo' then :motivoInactivacion else motivo_inactivacion end,
             inactivado_en = case when :estado = 'inactivo' then current_timestamp(3) else inactivado_en end,
             actualizado_por = :actualizadoPor
         where id_adulto_mayor = :id`,
        {
          id: params.id,
          nombres: body.nombres ?? null,
          apellidos: body.apellidos ?? null,
          fechaNacimiento: body.fechaNacimiento ?? null,
          genero: body.genero ?? null,
          tipoDocumento: body.tipoDocumento ?? null,
          numeroDocumento: body.numeroDocumento ?? null,
          telefono: body.telefono ?? null,
          correoContacto: body.correoContacto ?? null,
          direccion: body.direccion ?? null,
          ciudad: body.ciudad ?? null,
          nombreContactoEmergencia: body.nombreContactoEmergencia ?? null,
          telefonoContactoEmergencia: body.telefonoContactoEmergencia ?? null,
          estado: body.estado ?? null,
          motivoInactivacion: body.motivoInactivacion ?? null,
          actualizadoPor: actor.idUsuario,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'adulto_mayor',
        registroId: params.id,
        accion: body.estado === 'inactivo' ? 'inactivar' : 'actualizar',
        anteriores: existing,
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { ok: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.post('/older-adults/:id/photo', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const row = await assertOlderAdultExists(params.id);
    assertActorAllowed(actor, row);

    const file = await request.file();
    if (!file) throw badRequest('No se envio ningun archivo');

    const mimetype = file.mimetype;
    if (!ALLOWED_PHOTO_MIMES.has(mimetype)) {
      throw badRequest('Formato de imagen no soportado. Use JPG, PNG o WebP');
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of file.file) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_PHOTO_BYTES) {
        throw badRequest('La imagen supera el limite de 1 MB');
      }
      chunks.push(chunk);
    }
    const fotoBuffer = Buffer.concat(chunks);

    await pool.query(
      `insert into foto_perfil_adulto_mayor
         (id_adulto_mayor, foto_binaria, tipo_mime, tamano_bytes, creada_por)
       values
         (:idAdultoMayor, :fotoBinaria, :tipoMime, :tamanoBytes, :creadoPor)
       on duplicate key update
         foto_binaria = values(foto_binaria),
         tipo_mime = values(tipo_mime),
         tamano_bytes = values(tamano_bytes),
         creada_por = values(creada_por),
         actualizado_en = current_timestamp(3)`,
      {
        idAdultoMayor: params.id,
        fotoBinaria: fotoBuffer,
        tipoMime: mimetype,
        tamanoBytes: totalBytes,
        creadoPor: actor.idUsuario,
      },
    );

    reply.code(201);
    return { ok: true };
  });

  app.get('/older-adults/:id/photo', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const row = await assertOlderAdultExists(params.id);
    assertActorAllowed(actor, row);

    const [photoRows] = await pool.query<PhotoRow[]>(
      `select foto_binaria, tipo_mime
       from foto_perfil_adulto_mayor
       where id_adulto_mayor = :id
       limit 1`,
      { id: params.id },
    );

    const photo = photoRows[0];
    if (!photo) throw notFound('Foto de perfil no encontrada');

    reply.header('Content-Type', photo.tipo_mime);
    reply.header('Cache-Control', 'private, max-age=86400');
    return reply.send(photo.foto_binaria);
  });

  app.delete('/older-adults/:id/photo', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const row = await assertOlderAdultExists(params.id);
    assertActorAllowed(actor, row);

    const [result] = await pool.query<ResultSetHeader>(
      `delete from foto_perfil_adulto_mayor where id_adulto_mayor = :id`,
      { id: params.id },
    );

    if (result.affectedRows === 0) throw notFound('Foto de perfil no encontrada');

    return { ok: true };
  });

  app.get('/older-adults/photos', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const scope = buildOlderAdultScope(actor);

    interface PhotoBatchRow extends RowDataPacket {
      id_adulto_mayor: number;
      foto_binaria: Buffer | null;
      tipo_mime: string | null;
    }

    const [rows] = await pool.query<PhotoBatchRow[]>(
      `select a.id_adulto_mayor,
              fp.foto_binaria,
              fp.tipo_mime
       from adulto_mayor a
       inner join foto_perfil_adulto_mayor fp on fp.id_adulto_mayor = a.id_adulto_mayor
       ${scope.where}
       order by a.id_adulto_mayor`,
      scope.params,
    );

    const photos: Record<string, string> = {};
    for (const row of rows) {
      if (row.foto_binaria && row.tipo_mime) {
        photos[String(row.id_adulto_mayor)] =
          `data:${row.tipo_mime};base64,${row.foto_binaria.toString('base64')}`;
      }
    }

    return photos;
  });

  // ── Caregiver assignment ──────────────────────────────────────────

  const transferProfessionalSchema = z.object({
    correoProfesional: z.string().trim().email(),
  });

  app.patch('/older-adults/:id/professional', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = transferProfessionalSchema.parse(request.body);
    const correoProfesional = body.correoProfesional.toLowerCase();

    console.log('[transfer-professional] solicitud recibida', {
      adulto: params.id,
      correoProfesional,
      actor: actor.idUsuario,
      rol: actor.rol,
    });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await assertOlderAdultExists(params.id);
      if (actor.rol === 'profesional' && existing.id_profesional_responsable !== actor.idUsuario) {
        throw forbidden();
      }

      const [professionalRows] = await connection.query<RowDataPacket[]>(
        `select id_usuario
         from usuario
         where correo = :correo and rol = 'profesional' and estado = 'activo'
         limit 1`,
        { correo: correoProfesional },
      );
      const target = professionalRows[0] as { id_usuario: number } | undefined;
      if (!target) throw notFound('No existe un profesional activo con ese correo');
      if (target.id_usuario === existing.id_profesional_responsable) {
        throw badRequest('El adulto mayor ya esta asignado a ese profesional');
      }

      await connection.query(
        `update adulto_mayor
         set id_profesional_responsable = :idProfesional,
             actualizado_por = :actualizadoPor
         where id_adulto_mayor = :idAdultoMayor`,
        {
          idProfesional: target.id_usuario,
          actualizadoPor: actor.idUsuario,
          idAdultoMayor: params.id,
        },
      );

      await connection.query(
        `update asignacion_cuidador_adulto_mayor
         set estado = 'finalizada', fecha_fin = :hoy, motivo_finalizacion = 'Transferencia de profesional'
         where id_adulto_mayor = :idAdultoMayor and estado = 'activa'`,
        { idAdultoMayor: params.id, hoy: hoyEnColombia() },
      );

      await insertChangeAudit(connection, {
        tabla: 'adulto_mayor',
        registroId: params.id,
        accion: 'actualizar',
        anteriores: {
          id_profesional_responsable: existing.id_profesional_responsable,
          id_cuidador: existing.id_cuidador,
        },
        nuevos: {
          id_profesional_responsable: target.id_usuario,
          cuidador_desasignado: existing.id_cuidador,
        },
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();

      console.log(
        `[transfer-professional] adulto=${params.id} profesional anterior=${existing.id_profesional_responsable} ` +
        `profesional nuevo=${target.id_usuario} cuidador desasignado=${existing.id_cuidador} ` +
        `actor=${actor.idUsuario} (${actor.rol})`,
      );

      return { ok: true };
    } catch (error) {
      await connection.rollback();
      console.error('[transfer-professional] transferencia fallida', {
        adulto: params.id,
        actor: actor.idUsuario,
        error,
      });
      throw error;
    } finally {
      connection.release();
    }
  });

  const assignCaregiverSchema = z.object({
    idCuidador: z.number().int().positive().nullable(),
  });

  app.patch('/older-adults/:id/caregiver', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = assignCaregiverSchema.parse(request.body);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await assertOlderAdultExists(params.id);
      assertActorAllowed(actor, existing);

      // Finalize current active assignment if any
      const [currentAssignment] = await connection.query<RowDataPacket[]>(
        `select id_asignacion_cuidador_adulto_mayor
         from asignacion_cuidador_adulto_mayor
         where id_adulto_mayor = :idAdultoMayor and estado = 'activa'
         limit 1`,
        { idAdultoMayor: params.id },
      );

      if (currentAssignment[0]) {
        await connection.query(
          `update asignacion_cuidador_adulto_mayor
           set estado = 'finalizada', fecha_fin = :hoy, motivo_finalizacion = 'Reasignacion'
           where id_asignacion_cuidador_adulto_mayor = :id`,
          { id: currentAssignment[0].id_asignacion_cuidador_adulto_mayor, hoy: hoyEnColombia() },
        );
      }

      // Create new assignment if idCuidador is provided
      if (body.idCuidador) {
        await assertCaregiverExists(body.idCuidador, actor.rol === 'profesional' ? actor.idUsuario : undefined);
        await connection.query(
          `insert into asignacion_cuidador_adulto_mayor
            (id_adulto_mayor, id_cuidador, asignado_por, fecha_inicio)
           values
            (:idAdultoMayor, :idCuidador, :asignadoPor, :hoy)`,
          {
            idAdultoMayor: params.id,
            idCuidador: body.idCuidador,
            asignadoPor: actor.idUsuario,
            hoy: hoyEnColombia(),
          },
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'asignacion_cuidador_adulto_mayor',
        registroId: params.id,
        accion: body.idCuidador ? 'actualizar' : 'inactivar',
        anteriores: { id_cuidador_anterior: existing.id_cuidador },
        nuevos: { id_cuidador_nuevo: body.idCuidador },
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { ok: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.delete('/older-adults/:id/caregiver', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await assertOlderAdultExists(params.id);
      assertActorAllowed(actor, existing);

      const [result] = await connection.query<ResultSetHeader>(
        `update asignacion_cuidador_adulto_mayor
         set estado = 'finalizada', fecha_fin = :hoy, motivo_finalizacion = 'Desasignacion'
         where id_adulto_mayor = :idAdultoMayor and estado = 'activa'`,
        { idAdultoMayor: params.id, hoy: hoyEnColombia() },
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        throw notFound('No hay cuidador asignado a este adulto mayor');
      }

      await insertChangeAudit(connection, {
        tabla: 'asignacion_cuidador_adulto_mayor',
        registroId: params.id,
        accion: 'inactivar',
        anteriores: { id_cuidador: existing.id_cuidador },
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { ok: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
}
