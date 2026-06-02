import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';
import { sendPushToUser } from './expoPush.js';

interface NotificationResult {
  idNotificacion: number;
  estado: 'enviada' | 'fallida';
  error?: string;
}

export async function createAndSendPushNotification(input: {
  idUsuario: number;
  idAdultoMayor?: number | null;
  tipoNotificacion: string;
  titulo: string;
  mensaje: string;
  idAlertaProgramada?: number | null;
  extraData?: Record<string, unknown>;
}): Promise<NotificationResult> {
  const [result] = await pool.query<ResultSetHeader>(
    `insert into notificacion
      (id_alerta_programada, id_usuario_destinatario, id_adulto_mayor, tipo_notificacion,
       titulo, mensaje, canal, estado, enviada_en)
     values
      (:idAlertaProgramada, :idUsuario, :idAdultoMayor, :tipoNotificacion,
       :titulo, :mensaje, 'push', 'pendiente', current_timestamp(3))`,
    {
      idAlertaProgramada: input.idAlertaProgramada ?? null,
      idUsuario: input.idUsuario,
      idAdultoMayor: input.idAdultoMayor ?? null,
      tipoNotificacion: input.tipoNotificacion,
      titulo: input.titulo,
      mensaje: input.mensaje,
    },
  );

  const idNotificacion = result.insertId;

  try {
    await sendPushToUser({
      idUsuario: input.idUsuario,
      title: input.titulo,
      body: input.mensaje,
      data: {
        idNotificacion,
        idAdultoMayor: input.idAdultoMayor,
        ...input.extraData,
      },
    });

    await pool.query(
      `update notificacion set estado = 'enviada', enviada_en = current_timestamp(3)
       where id_notificacion = :id`,
      { id: idNotificacion },
    );

    return { idNotificacion, estado: 'enviada' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await pool.query(
      `update notificacion set estado = 'fallida', error_envio = :error
       where id_notificacion = :id`,
      { id: idNotificacion, error: errorMsg },
    );

    return { idNotificacion, estado: 'fallida', error: errorMsg };
  }
}

export async function sendPushToCaregivers(input: {
  idAdultoMayor: number;
  titulo: string;
  mensaje: string;
  tipoNotificacion?: string;
  idAlertaProgramada?: number | null;
  extraData?: Record<string, unknown>;
}): Promise<NotificationResult[]> {
  const [caregivers] = await pool.query<RowDataPacket[]>(
    `select id_cuidador
     from asignacion_cuidador_adulto_mayor
     where id_adulto_mayor = :idAdultoMayor and estado = 'activa'`,
    { idAdultoMayor: input.idAdultoMayor },
  );

  const results: NotificationResult[] = [];

  for (const caregiver of caregivers) {
    const result = await createAndSendPushNotification({
      idUsuario: caregiver.id_cuidador,
      idAdultoMayor: input.idAdultoMayor,
      tipoNotificacion: input.tipoNotificacion ?? 'sistema',
      titulo: input.titulo,
      mensaje: input.mensaje,
      idAlertaProgramada: input.idAlertaProgramada,
      extraData: input.extraData,
    });
    results.push(result);
  }

  return results;
}
