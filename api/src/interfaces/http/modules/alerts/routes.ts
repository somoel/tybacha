import type { FastifyInstance } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../../../../infrastructure/db/pool.js';
import { createAndSendPushNotification, sendPushToCaregivers } from '../../../../infrastructure/push/notifications.js';
import { badRequest, notFound } from '../../httpErrors.js';
import { requireAuth, requireRoles } from '../../requireAuth.js';
import { createAlertSchema, updateAlertSchema, alertStatusSchema } from './schemas.js';

interface AlertRow extends RowDataPacket {
  id_alerta_programada: number;
  id_adulto_mayor: number | null;
  id_plan_ejercicio: number | null;
  id_usuario_destinatario: number | null;
  tipo_alerta: string;
  titulo: string;
  mensaje: string;
  canal: string;
  fecha_programada: string | null;
  regla_programacion: string | null;
  condicion_disparo: string | null;
  estado: string;
  creada_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

function mapAlert(row: AlertRow) {
  return {
    idAlertaProgramada: row.id_alerta_programada,
    idAdultoMayor: row.id_adulto_mayor,
    idPlanEjercicio: row.id_plan_ejercicio,
    idUsuarioDestinatario: row.id_usuario_destinatario,
    tipoAlerta: row.tipo_alerta,
    titulo: row.titulo,
    mensaje: row.mensaje,
    canal: row.canal,
    fechaProgramada: row.fecha_programada,
    reglaProgramacion: row.regla_programacion ? JSON.parse(row.regla_programacion) : null,
    condicionDisparo: row.condicion_disparo ? JSON.parse(row.condicion_disparo) : null,
    estado: row.estado,
    creadaPor: row.creada_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export async function registerAlertRoutes(app: FastifyInstance): Promise<void> {
  app.post('/alerts', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request, reply) => {
    const actor = request.authUser!;
    const body = createAlertSchema.parse(request.body);

    if (!body.idAdultoMayor && !body.idUsuarioDestinatario) {
      throw badRequest('Se requiere idAdultoMayor o idUsuarioDestinatario');
    }

    const [result] = await pool.query(
      `insert into alerta_programada
        (id_adulto_mayor, id_plan_ejercicio, id_usuario_destinatario, tipo_alerta,
         titulo, mensaje, canal, fecha_programada, regla_programacion, condicion_disparo,
         estado, creada_por)
       values
        (:idAdultoMayor, :idPlanEjercicio, :idUsuarioDestinatario, :tipoAlerta,
         :titulo, :mensaje, :canal, :fechaProgramada, :reglaProgramacion, :condicionDisparo,
         'activa', :creadaPor)`,
      {
        idAdultoMayor: body.idAdultoMayor ?? null,
        idPlanEjercicio: body.idPlanEjercicio ?? null,
        idUsuarioDestinatario: body.idUsuarioDestinatario ?? null,
        tipoAlerta: body.tipoAlerta,
        titulo: body.titulo,
        mensaje: body.mensaje,
        canal: body.canal,
        fechaProgramada: body.fechaProgramada ?? null,
        reglaProgramacion: body.reglaProgramacion ? JSON.stringify(body.reglaProgramacion) : null,
        condicionDisparo: body.condicionDisparo ? JSON.stringify(body.condicionDisparo) : null,
        creadaPor: actor.idUsuario,
      },
    );

    const idAlertaProgramada = (result as { insertId: number }).insertId;

    if (body.canal === 'push' && !body.fechaProgramada) {
      if (body.idUsuarioDestinatario) {
        await createAndSendPushNotification({
          idUsuario: body.idUsuarioDestinatario,
          idAdultoMayor: body.idAdultoMayor,
          tipoNotificacion: body.tipoAlerta,
          titulo: body.titulo,
          mensaje: body.mensaje,
          idAlertaProgramada,
        }).catch(() => {});
      } else if (body.idAdultoMayor) {
        await sendPushToCaregivers({
          idAdultoMayor: body.idAdultoMayor,
          titulo: body.titulo,
          mensaje: body.mensaje,
          tipoNotificacion: body.tipoAlerta,
          idAlertaProgramada,
        }).catch(() => {});
      }
    }

    reply.status(201);
    return { idAlertaProgramada };
  });

  app.get('/alerts', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const query = z.object({
      idAdultoMayor: z.coerce.number().int().positive().optional(),
      tipoAlerta: z.string().optional(),
      estado: z.string().optional(),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);

    const conditions: string[] = ['a.creada_por = :actorId'];
    const params: Record<string, string | number> = { actorId: actor.idUsuario, limit: query.limit };

    if (query.idAdultoMayor) {
      conditions.push('a.id_adulto_mayor = :idAdultoMayor');
      params.idAdultoMayor = query.idAdultoMayor;
    }
    if (query.tipoAlerta) {
      conditions.push('a.tipo_alerta = :tipoAlerta');
      params.tipoAlerta = query.tipoAlerta;
    }
    if (query.estado) {
      conditions.push('a.estado = :estado');
      params.estado = query.estado;
    }

    const where = conditions.join(' and ');

    const [rows] = await pool.query<AlertRow[]>(
      `select a.id_alerta_programada, a.id_adulto_mayor, a.id_plan_ejercicio,
              a.id_usuario_destinatario, a.tipo_alerta, a.titulo, a.mensaje, a.canal,
              a.fecha_programada, a.regla_programacion, a.condicion_disparo, a.estado,
              a.creada_por, a.creado_en, a.actualizado_en
       from alerta_programada a
       where ${where}
       order by a.creado_en desc
       limit :limit`,
      params,
    );

    return rows.map(mapAlert);
  });

  app.get('/alerts/:id', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<AlertRow[]>(
      `select id_alerta_programada, id_adulto_mayor, id_plan_ejercicio,
              id_usuario_destinatario, tipo_alerta, titulo, mensaje, canal,
              fecha_programada, regla_programacion, condicion_disparo, estado,
              creada_por, creado_en, actualizado_en
       from alerta_programada
       where id_alerta_programada = :id and creada_por = :actorId
       limit 1`,
      { id: params.id, actorId: actor.idUsuario },
    );

    if (!rows[0]) throw notFound('Alerta no encontrada');
    return mapAlert(rows[0]);
  });

  app.patch('/alerts/:id', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = updateAlertSchema.parse(request.body);

    const [existing] = await pool.query<AlertRow[]>(
      `select id_alerta_programada from alerta_programada
       where id_alerta_programada = :id and creada_por = :actorId limit 1`,
      { id: params.id, actorId: actor.idUsuario },
    );
    if (!existing[0]) throw notFound('Alerta no encontrada');

    const updates: string[] = [];
    const values: Record<string, string | number | null> = { id: params.id };

    if (body.idAdultoMayor !== undefined) { updates.push('id_adulto_mayor = :idAdultoMayor'); values.idAdultoMayor = body.idAdultoMayor; }
    if (body.idPlanEjercicio !== undefined) { updates.push('id_plan_ejercicio = :idPlanEjercicio'); values.idPlanEjercicio = body.idPlanEjercicio; }
    if (body.idUsuarioDestinatario !== undefined) { updates.push('id_usuario_destinatario = :idUsuarioDestinatario'); values.idUsuarioDestinatario = body.idUsuarioDestinatario; }
    if (body.tipoAlerta !== undefined) { updates.push('tipo_alerta = :tipoAlerta'); values.tipoAlerta = body.tipoAlerta; }
    if (body.titulo !== undefined) { updates.push('titulo = :titulo'); values.titulo = body.titulo; }
    if (body.mensaje !== undefined) { updates.push('mensaje = :mensaje'); values.mensaje = body.mensaje; }
    if (body.canal !== undefined) { updates.push('canal = :canal'); values.canal = body.canal; }
    if (body.fechaProgramada !== undefined) { updates.push('fecha_programada = :fechaProgramada'); values.fechaProgramada = body.fechaProgramada; }
    if (body.reglaProgramacion !== undefined) { updates.push('regla_programacion = :reglaProgramacion'); values.reglaProgramacion = JSON.stringify(body.reglaProgramacion); }
    if (body.condicionDisparo !== undefined) { updates.push('condicion_disparo = :condicionDisparo'); values.condicionDisparo = JSON.stringify(body.condicionDisparo); }

    if (updates.length === 0) return { ok: true };

    await pool.query(
      `update alerta_programada set ${updates.join(', ')}, actualizado_en = current_timestamp(3)
       where id_alerta_programada = :id`,
      values,
    );

    return { ok: true };
  });

  app.patch('/alerts/:id/status', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = alertStatusSchema.parse(request.body);

    const [existing] = await pool.query<AlertRow[]>(
      `select id_alerta_programada from alerta_programada
       where id_alerta_programada = :id and creada_por = :actorId limit 1`,
      { id: params.id, actorId: actor.idUsuario },
    );
    if (!existing[0]) throw notFound('Alerta no encontrada');

    await pool.query(
      `update alerta_programada set estado = :estado, actualizado_en = current_timestamp(3)
       where id_alerta_programada = :id`,
      { id: params.id, estado: body.estado },
    );

    return { ok: true };
  });

  app.delete('/alerts/:id', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [existing] = await pool.query<AlertRow[]>(
      `select id_alerta_programada from alerta_programada
       where id_alerta_programada = :id and creada_por = :actorId limit 1`,
      { id: params.id, actorId: actor.idUsuario },
    );
    if (!existing[0]) throw notFound('Alerta no encontrada');

    await pool.query(
      `update alerta_programada set estado = 'cancelada', actualizado_en = current_timestamp(3)
       where id_alerta_programada = :id`,
      { id: params.id },
    );

    return { ok: true };
  });
}
