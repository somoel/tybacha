import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { insertAccessAudit, insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

const consentSchema = z.object({
  tipoConsentimiento: z.enum(['tratamiento_datos', 'evaluacion_funcional', 'plan_ejercicio', 'investigacion', 'otro']),
  estado: z.enum(['vigente', 'revocado', 'vencido', 'pendiente']).default('vigente'),
  otorgadoPorNombre: z.string().max(160).optional(),
  otorgadoPorDocumento: z.string().max(60).optional(),
  fechaOtorgamiento: z.string().date().optional(),
  fechaVencimiento: z.string().date().optional(),
  observaciones: z.string().optional(),
});

interface AccessRow extends RowDataPacket {
  id_adulto_mayor: number;
}

interface ConsentRow extends RowDataPacket {
  id_consentimiento_adulto_mayor: number;
  id_adulto_mayor: number;
  tipo_consentimiento: string;
  estado: string;
  otorgado_por_nombre: string | null;
  otorgado_por_documento: string | null;
  fecha_otorgamiento: string | null;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  registrado_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

async function assertCanAccessOlderAdult(idAdultoMayor: number, actorId: number, role: string): Promise<void> {
  const [rows] = await pool.query<AccessRow[]>(
    `select a.id_adulto_mayor
     from adulto_mayor a
     left join asignacion_cuidador_adulto_mayor ac
       on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
     where a.id_adulto_mayor = :idAdultoMayor
       and (
         :role = 'administrador'
         or a.id_profesional_responsable = :actorId
         or ac.id_cuidador = :actorId
       )
     limit 1`,
    { idAdultoMayor, actorId, role },
  );

  if (!rows[0]) throw forbidden();
}

function mapConsent(row: ConsentRow) {
  return {
    idConsentimientoAdultoMayor: row.id_consentimiento_adulto_mayor,
    idAdultoMayor: row.id_adulto_mayor,
    tipoConsentimiento: row.tipo_consentimiento,
    estado: row.estado,
    otorgadoPorNombre: row.otorgado_por_nombre,
    otorgadoPorDocumento: row.otorgado_por_documento,
    fechaOtorgamiento: row.fecha_otorgamiento,
    fechaVencimiento: row.fecha_vencimiento,
    observaciones: row.observaciones,
    registradoPor: row.registrado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export async function registerConsentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/older-adults/:id/consents', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query<ConsentRow[]>(
        `select id_consentimiento_adulto_mayor, id_adulto_mayor, tipo_consentimiento, estado,
                otorgado_por_nombre, otorgado_por_documento, fecha_otorgamiento, fecha_vencimiento,
                observaciones, registrado_por, creado_en, actualizado_en
         from consentimiento_adulto_mayor
         where id_adulto_mayor = :idAdultoMayor
         order by tipo_consentimiento, actualizado_en desc`,
        { idAdultoMayor: params.id },
      );

      await insertAccessAudit(connection, {
        idUsuario: actor.idUsuario,
        idAdultoMayor: params.id,
        tipoDato: 'personal',
        accion: 'consultar',
        resultado: 'permitido',
        motivo: 'Consulta de consentimientos',
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      return rows.map(mapConsent);
    } finally {
      connection.release();
    }
  });

  app.get('/older-adults/:id/consents/status', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<ConsentRow[]>(
      `select id_consentimiento_adulto_mayor, id_adulto_mayor, tipo_consentimiento, estado,
              otorgado_por_nombre, otorgado_por_documento, fecha_otorgamiento, fecha_vencimiento,
              observaciones, registrado_por, creado_en, actualizado_en
       from consentimiento_adulto_mayor
       where id_adulto_mayor = :idAdultoMayor
         and estado = 'vigente'
         and (fecha_vencimiento is null or fecha_vencimiento >= current_date())
       order by actualizado_en desc`,
      { idAdultoMayor: params.id },
    );

    return {
      idAdultoMayor: params.id,
      tieneConsentimientoVigente: rows.length > 0,
      consentimientos: rows.map(mapConsent),
    };
  });

  app.post('/older-adults/:id/consents', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = consentSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores registran consentimientos');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into consentimiento_adulto_mayor
          (id_adulto_mayor, tipo_consentimiento, estado, otorgado_por_nombre, otorgado_por_documento,
           fecha_otorgamiento, fecha_vencimiento, observaciones, registrado_por)
         values
          (:idAdultoMayor, :tipoConsentimiento, :estado, :otorgadoPorNombre, :otorgadoPorDocumento,
           :fechaOtorgamiento, :fechaVencimiento, :observaciones, :registradoPor)`,
        {
          idAdultoMayor: params.id,
          tipoConsentimiento: body.tipoConsentimiento,
          estado: body.estado,
          otorgadoPorNombre: body.otorgadoPorNombre ?? null,
          otorgadoPorDocumento: body.otorgadoPorDocumento ?? null,
          fechaOtorgamiento: body.fechaOtorgamiento ?? null,
          fechaVencimiento: body.fechaVencimiento ?? null,
          observaciones: body.observaciones ?? null,
          registradoPor: actor.idUsuario,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'consentimiento_adulto_mayor',
        registroId: insertResult.insertId,
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
        idConsentimientoAdultoMayor: insertResult.insertId,
        idAdultoMayor: params.id,
        ...body,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.patch('/consents/:id/revoke', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = z.object({ observaciones: z.string().optional() }).parse(request.body ?? {});

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores revocan consentimientos');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query<ConsentRow[]>(
        `select id_consentimiento_adulto_mayor, id_adulto_mayor, tipo_consentimiento, estado,
                otorgado_por_nombre, otorgado_por_documento, fecha_otorgamiento, fecha_vencimiento,
                observaciones, registrado_por, creado_en, actualizado_en
         from consentimiento_adulto_mayor
         where id_consentimiento_adulto_mayor = :id
         limit 1`,
        { id: params.id },
      );

      const consent = rows[0];
      if (!consent) throw notFound('Consentimiento no encontrado');
      await assertCanAccessOlderAdult(consent.id_adulto_mayor, actor.idUsuario, actor.rol);

      await connection.query(
        `update consentimiento_adulto_mayor
         set estado = 'revocado',
             observaciones = coalesce(:observaciones, observaciones)
         where id_consentimiento_adulto_mayor = :id`,
        {
          id: params.id,
          observaciones: body.observaciones ?? null,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'consentimiento_adulto_mayor',
        registroId: params.id,
        accion: 'actualizar',
        anteriores: consent,
        nuevos: { estado: 'revocado', observaciones: body.observaciones },
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

