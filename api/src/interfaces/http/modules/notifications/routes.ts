import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../../../../infrastructure/db/pool.js';
import { requireAuth } from '../../requireAuth.js';

const registerTokenSchema = z.object({
  tokenExpo: z.string().min(1).max(255),
  plataforma: z.enum(['android', 'web']),
  dispositivo: z.string().max(120).optional(),
});

const markReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

interface NotificationRow extends RowDataPacket {
  id_notificacion: number;
  id_alerta_programada: number | null;
  id_usuario_destinatario: number;
  id_adulto_mayor: number | null;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  canal: string;
  estado: string;
  enviada_en: string | null;
  recibida_en: string | null;
  leida_en: string | null;
  error_envio: string | null;
  creado_en: string;
}

function mapNotification(row: NotificationRow) {
  return {
    idNotificacion: row.id_notificacion,
    idAlertaProgramada: row.id_alerta_programada,
    idUsuarioDestinatario: row.id_usuario_destinatario,
    idAdultoMayor: row.id_adulto_mayor,
    tipoNotificacion: row.tipo_notificacion,
    titulo: row.titulo,
    mensaje: row.mensaje,
    canal: row.canal,
    estado: row.estado,
    enviadaEn: row.enviada_en,
    recibidaEn: row.recibida_en,
    leidaEn: row.leida_en,
    errorEnvio: row.error_envio,
    creadoEn: row.creado_en,
  };
}

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/push/tokens', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = registerTokenSchema.parse(request.body);

    const [result] = await pool.query<ResultSetHeader>(
      `insert into token_push_dispositivo
        (id_usuario, token_expo, plataforma, dispositivo, activo)
       values
        (:idUsuario, :tokenExpo, :plataforma, :dispositivo, 1)
       on duplicate key update
        id_usuario = values(id_usuario),
        plataforma = values(plataforma),
        dispositivo = values(dispositivo),
        activo = 1`,
      {
        idUsuario: actor.idUsuario,
        tokenExpo: body.tokenExpo,
        plataforma: body.plataforma,
        dispositivo: body.dispositivo ?? null,
      },
    );

    return { ok: true, affectedRows: result.affectedRows };
  });

  app.get('/notifications', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const query = z.object({
      unreadOnly: z.coerce.boolean().default(false),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);

    const [rows] = await pool.query<NotificationRow[]>(
      `select id_notificacion, id_alerta_programada, id_usuario_destinatario, id_adulto_mayor,
              tipo_notificacion, titulo, mensaje, canal, estado, enviada_en, recibida_en,
              leida_en, error_envio, creado_en
       from notificacion
       where id_usuario_destinatario = :idUsuario
         and (:unreadOnly = false or leida_en is null)
       order by creado_en desc
       limit :limit`,
      {
        idUsuario: actor.idUsuario,
        unreadOnly: query.unreadOnly,
        limit: query.limit,
      },
    );

    return rows.map(mapNotification);
  });

  app.patch('/notifications/read', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = markReadSchema.parse(request.body);

    await pool.query(
      `update notificacion
       set estado = 'leida', leida_en = coalesce(leida_en, current_timestamp(3))
       where id_usuario_destinatario = :idUsuario
         and id_notificacion in (:ids)`,
      {
        idUsuario: actor.idUsuario,
        ids: body.ids,
      },
    );

    return { ok: true };
  });
}

