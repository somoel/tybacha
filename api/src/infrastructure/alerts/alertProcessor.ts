import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';
import { sendPushToUser } from '../push/expoPush.js';

interface PendingAlertRow extends RowDataPacket {
  id_alerta_programada: number;
  id_adulto_mayor: number | null;
  id_usuario_destinatario: number | null;
  tipo_alerta: string;
  titulo: string;
  mensaje: string;
  canal: string;
  fecha_programada: string | null;
}

interface PatientRow extends RowDataPacket {
  id_adulto_mayor: number;
  id_profesional_responsable: number | null;
}

interface PlanPatientRow extends RowDataPacket {
  id_adulto_mayor: number;
  id_profesional_responsable: number | null;
  id_plan: number;
}

interface ExerciseComplianceRow extends RowDataPacket {
  total: number;
  completados: number;
  porcentaje: number;
  dias_sin_ejercicio: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface CheckRow extends RowDataPacket {
  exists: number;
}

async function createAndSendNotification(input: {
  idUsuario: number;
  idAdultoMayor: number | null;
  tipoNotificacion: string;
  titulo: string;
  mensaje: string;
  canal: string;
  idAlertaProgramada?: number;
}): Promise<void> {
  const [result] = await pool.query<ResultSetHeader>(
    `insert into notificacion
      (id_alerta_programada, id_usuario_destinatario, id_adulto_mayor, tipo_notificacion,
       titulo, mensaje, canal, estado, enviada_en)
     values
      (:idAlertaProgramada, :idUsuario, :idAdultoMayor, :tipoNotificacion,
       :titulo, :mensaje, :canal, 'pendiente', current_timestamp(3))`,
    {
      idAlertaProgramada: input.idAlertaProgramada ?? null,
      idUsuario: input.idUsuario,
      idAdultoMayor: input.idAdultoMayor ?? null,
      tipoNotificacion: input.tipoNotificacion,
      titulo: input.titulo,
      mensaje: input.mensaje,
      canal: input.canal,
    },
  );

  if (input.canal === 'push') {
    try {
      await sendPushToUser({
        idUsuario: input.idUsuario,
        title: input.titulo,
        body: input.mensaje,
        data: { idNotificacion: result.insertId, idAdultoMayor: input.idAdultoMayor },
      });

      await pool.query(
        `update notificacion set estado = 'enviada', enviada_en = current_timestamp(3)
         where id_notificacion = :id`,
        { id: result.insertId },
      );
    } catch (error) {
      await pool.query(
        `update notificacion set estado = 'fallida', error_envio = :error
         where id_notificacion = :id`,
        { id: result.insertId, error: error instanceof Error ? error.message : String(error) },
      );
    }
  } else {
    await pool.query(
      `update notificacion set estado = 'enviada', enviada_en = current_timestamp(3)
       where id_notificacion = :id`,
      { id: result.insertId },
    );
  }
}

export async function processPendingAlerts(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  const [alerts] = await pool.query<PendingAlertRow[]>(
    `select id_alerta_programada, id_adulto_mayor, id_usuario_destinatario,
            tipo_alerta, titulo, mensaje, canal, fecha_programada
     from alerta_programada
     where estado = 'activa'
       and fecha_programada is not null
       and fecha_programada <= current_timestamp(3)
     order by fecha_programada asc
     limit 50`,
  );

  for (const alert of alerts) {
    try {
      let targetUserId = alert.id_usuario_destinatario;

      if (!targetUserId && alert.id_adulto_mayor) {
        const [patients] = await pool.query<PatientRow[]>(
          `select id_profesional_responsable
           from adulto_mayor
           where id_adulto_mayor = :id limit 1`,
          { id: alert.id_adulto_mayor },
        );
        if (patients[0]?.id_profesional_responsable) {
          targetUserId = patients[0].id_profesional_responsable;
        }
      }

      if (!targetUserId) {
        errors++;
        continue;
      }

      await createAndSendNotification({
        idUsuario: targetUserId,
        idAdultoMayor: alert.id_adulto_mayor,
        tipoNotificacion: alert.tipo_alerta,
        titulo: alert.titulo,
        mensaje: alert.mensaje,
        canal: alert.canal,
        idAlertaProgramada: alert.id_alerta_programada,
      });

      await pool.query(
        `update alerta_programada
         set estado = 'finalizada', actualizado_en = current_timestamp(3)
         where id_alerta_programada = :id`,
        { id: alert.id_alerta_programada },
      );

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}

export async function processExerciseReminders(): Promise<{ sent: number }> {
  let sent = 0;

  const today = new Date().toISOString().slice(0, 10);

  const [patientsWithPlans] = await pool.query<PlanPatientRow[]>(
    `select am.id_adulto_mayor, am.id_profesional_responsable,
            pe.id_plan_ejercicio as id_plan
     from plan_ejercicio pe
     join adulto_mayor am on am.id_adulto_mayor = pe.id_adulto_mayor
     where pe.estado in ('asignado', 'activo')
       and not exists (
         select 1 from notificacion n
         where n.id_adulto_mayor = am.id_adulto_mayor
           and n.tipo_notificacion = 'recordatorio_ejercicio'
           and date(n.creado_en) = :today
       )
     limit 100`,
    { today },
  );

  for (const patient of patientsWithPlans) {
    if (!patient.id_profesional_responsable) continue;

    const [pendingExercises] = await pool.query<CountRow[]>(
      `select count(*) as total
       from ejercicio_plan ep
       join registro_ejercicio_plan rep
         on rep.id_ejercicio_plan = ep.id_ejercicio_plan
       where ep.id_plan_ejercicio = :idPlan
         and rep.fecha_programada = :today
         and rep.estado = 'pendiente'`,
      { idPlan: patient.id_plan, today },
    );

    if (pendingExercises[0]?.total > 0) {
      await createAndSendNotification({
        idUsuario: patient.id_profesional_responsable,
        idAdultoMayor: patient.id_adulto_mayor,
        tipoNotificacion: 'recordatorio_ejercicio',
        titulo: 'Recordatorio de ejercicios',
        mensaje: 'Hay ejercicios pendientes para hoy. Revisa el plan de ejercicios.',
        canal: 'push',
      });
      sent++;
    }
  }

  return { sent };
}

export async function processProgressAlerts(): Promise<{ alerts: number }> {
  let alerts = 0;

  const [patients] = await pool.query<PlanPatientRow[]>(
    `select am.id_adulto_mayor, am.id_profesional_responsable,
            pe.id_plan_ejercicio as id_plan
     from plan_ejercicio pe
     join adulto_mayor am on am.id_adulto_mayor = pe.id_adulto_mayor
     where pe.estado in ('asignado', 'activo')
     limit 100`,
  );

  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = today.toISOString().slice(0, 10);

  for (const patient of patients) {
    if (!patient.id_profesional_responsable) continue;

    const [compliance] = await pool.query<ExerciseComplianceRow[]>(
      `select count(*) as total,
              sum(case when estado = 'completado' then 1 else 0 end) as completados,
              CASE WHEN count(*) > 0
                THEN (sum(case when estado = 'completado' then 1 else 0 end) / count(*)) * 100
                ELSE 100
              END as porcentaje,
              DATEDIFF(:today, COALESCE(max(fecha_realizacion), :twoDaysAgo)) as dias_sin_ejercicio
       from registro_ejercicio_plan
       where id_adulto_mayor = :idAdultoMayor
         and fecha_programada between :weekStart and :weekEnd`,
      {
        idAdultoMayor: patient.id_adulto_mayor,
        today: weekEndStr,
        twoDaysAgo: twoDaysAgoStr,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
      },
    );

    const stats = compliance[0];
    if (!stats || stats.total === 0) continue;

    const [alreadyNotified] = await pool.query<CheckRow[]>(
      `select 1 as exists_flag from notificacion
       where id_adulto_mayor = :idAdultoMayor
         and tipo_notificacion = 'progreso'
         and date(creado_en) = :today
       limit 1`,
      { idAdultoMayor: patient.id_adulto_mayor, today: weekEndStr },
    );

    if (alreadyNotified.length > 0) continue;

    if (stats.porcentaje < 50) {
      await createAndSendNotification({
        idUsuario: patient.id_profesional_responsable,
        idAdultoMayor: patient.id_adulto_mayor,
        tipoNotificacion: 'progreso',
        titulo: 'Cumplimiento bajo',
        mensaje: `El cumplimiento del plan esta en ${Math.round(stats.porcentaje)}% esta semana. Considera revisar el plan.`,
        canal: 'push',
      });
      alerts++;
    }

    if (stats.dias_sin_ejercicio > 2) {
      await createAndSendNotification({
        idUsuario: patient.id_profesional_responsable,
        idAdultoMayor: patient.id_adulto_mayor,
        tipoNotificacion: 'progreso',
        titulo: 'Sin actividad reciente',
        mensaje: `Han pasado ${stats.dias_sin_ejercicio} dias sin registrar ejercicios.`,
        canal: 'push',
      });
      alerts++;
    }
  }

  return { alerts };
}
