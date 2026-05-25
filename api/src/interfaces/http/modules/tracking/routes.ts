import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { sendPushToUser } from '../../../../infrastructure/push/expoPush.js';
import { forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

const exerciseRecordSchema = z.object({
  idEjercicioPlan: z.number().int().positive(),
  idAdultoMayor: z.number().int().positive(),
  fechaProgramada: z.string().date(),
  fechaRealizacion: z.string().datetime().optional(),
  estado: z.enum(['pendiente', 'completado', 'omitido', 'parcial']).default('completado'),
  duracionRealSegundos: z.number().int().positive().optional(),
  repeticionesRealizadas: z.number().int().positive().optional(),
  esfuerzoPercibido: z.number().int().min(0).max(10).optional(),
  dolorReportado: z.number().int().min(0).max(10).optional(),
  comentario: z.string().optional(),
});

const activityRecordSchema = z.object({
  idAdultoMayor: z.number().int().positive(),
  idPlanEjercicio: z.number().int().positive().optional(),
  fechaActividad: z.string().date(),
  resumen: z.string().optional(),
  nivelEnergia: z.enum(['bajo', 'medio', 'alto', 'no_registrado']).default('no_registrado'),
  observaciones: z.string().optional(),
});

interface AccessRow extends RowDataPacket {
  id_adulto_mayor: number;
}

interface ExercisePlanLookupRow extends RowDataPacket {
  id_plan_ejercicio: number;
  id_adulto_mayor: number;
}

interface ActivityRow extends RowDataPacket {
  id_registro_actividad_diaria: number;
}

interface ExerciseRecordRow extends RowDataPacket {
  id_registro_ejercicio_plan: number;
  id_ejercicio_plan: number;
  id_adulto_mayor: number;
  id_registro_actividad_diaria: number | null;
  fecha_programada: string;
  fecha_realizacion: string | null;
  estado: string;
  duracion_real_segundos: number | null;
  repeticiones_realizadas: number | null;
  esfuerzo_percibido: number | null;
  dolor_reportado: number | null;
  comentario: string | null;
}

interface ComplianceRow extends RowDataPacket {
  ejercicios_programados: number;
  ejercicios_completados: number;
  ejercicios_omitidos: number;
  ejercicios_parciales: number;
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

async function getExercisePlanLink(idEjercicioPlan: number): Promise<ExercisePlanLookupRow> {
  const [rows] = await pool.query<ExercisePlanLookupRow[]>(
    `select ep.id_plan_ejercicio, pe.id_adulto_mayor
     from ejercicio_plan ep
     join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
     where ep.id_ejercicio_plan = :idEjercicioPlan and ep.activo = 1
     limit 1`,
    { idEjercicioPlan },
  );

  const row = rows[0];
  if (!row) throw notFound('Ejercicio del plan no encontrado');
  return row;
}

async function upsertDailyActivity(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  input: {
    idAdultoMayor: number;
    idPlanEjercicio: number | null;
    fechaActividad: string;
    registradoPor: number;
    resumen?: string | null;
    nivelEnergia?: string | null;
    observaciones?: string | null;
  },
): Promise<number> {
  const [existingRows] = await connection.query<ActivityRow[]>(
    `select id_registro_actividad_diaria
     from registro_actividad_diaria
     where id_adulto_mayor = :idAdultoMayor
       and fecha_actividad = :fechaActividad
       and (
         (id_plan_ejercicio is null and :idPlanEjercicio is null)
         or id_plan_ejercicio = :idPlanEjercicio
       )
     limit 1`,
    input,
  );

  const existing = existingRows[0];
  if (existing) {
    await connection.query(
      `update registro_actividad_diaria
       set resumen = coalesce(:resumen, resumen),
           nivel_energia = coalesce(:nivelEnergia, nivel_energia),
           observaciones = coalesce(:observaciones, observaciones),
           registrado_por = :registradoPor
       where id_registro_actividad_diaria = :id`,
      {
        id: existing.id_registro_actividad_diaria,
        resumen: input.resumen ?? null,
        nivelEnergia: input.nivelEnergia ?? null,
        observaciones: input.observaciones ?? null,
        registradoPor: input.registradoPor,
      },
    );
    return existing.id_registro_actividad_diaria;
  }

  const [insertResult] = await connection.query<ResultSetHeader>(
    `insert into registro_actividad_diaria
      (id_adulto_mayor, id_plan_ejercicio, fecha_actividad, resumen, nivel_energia, observaciones, registrado_por)
     values
      (:idAdultoMayor, :idPlanEjercicio, :fechaActividad, :resumen, :nivelEnergia, :observaciones, :registradoPor)`,
    {
      idAdultoMayor: input.idAdultoMayor,
      idPlanEjercicio: input.idPlanEjercicio,
      fechaActividad: input.fechaActividad,
      resumen: input.resumen ?? null,
      nivelEnergia: input.nivelEnergia ?? 'no_registrado',
      observaciones: input.observaciones ?? null,
      registradoPor: input.registradoPor,
    },
  );

  return insertResult.insertId;
}

function mapExerciseRecord(row: ExerciseRecordRow) {
  return {
    idRegistroEjercicioPlan: row.id_registro_ejercicio_plan,
    idEjercicioPlan: row.id_ejercicio_plan,
    idAdultoMayor: row.id_adulto_mayor,
    idRegistroActividadDiaria: row.id_registro_actividad_diaria,
    fechaProgramada: row.fecha_programada,
    fechaRealizacion: row.fecha_realizacion,
    estado: row.estado,
    duracionRealSegundos: row.duracion_real_segundos,
    repeticionesRealizadas: row.repeticiones_realizadas,
    esfuerzoPercibido: row.esfuerzo_percibido,
    dolorReportado: row.dolor_reportado,
    comentario: row.comentario,
  };
}

function notificationTextForStatus(status: string) {
  if (status === 'completado') {
    return {
      title: 'Ejercicio completado',
      body: 'Se registro un ejercicio completado en el plan.',
    };
  }
  if (status === 'omitido') {
    return {
      title: 'Ejercicio omitido',
      body: 'Se registro un ejercicio omitido en el plan.',
    };
  }
  return {
    title: 'Seguimiento actualizado',
    body: 'Se actualizo el seguimiento de un ejercicio.',
  };
}

async function createAndSendTrackingNotification(input: {
  idUsuario: number;
  idAdultoMayor: number;
  estado: string;
  idRegistroEjercicioPlan: number;
}): Promise<void> {
  const text = notificationTextForStatus(input.estado);

  const [result] = await pool.query<ResultSetHeader>(
    `insert into notificacion
      (id_usuario_destinatario, id_adulto_mayor, tipo_notificacion, titulo, mensaje, canal, estado, enviada_en)
     values
      (:idUsuario, :idAdultoMayor, 'cumplimiento', :titulo, :mensaje, 'push', 'pendiente', current_timestamp(3))`,
    {
      idUsuario: input.idUsuario,
      idAdultoMayor: input.idAdultoMayor,
      titulo: text.title,
      mensaje: text.body,
    },
  );

  try {
    await sendPushToUser({
      idUsuario: input.idUsuario,
      title: text.title,
      body: text.body,
      data: {
        idNotificacion: result.insertId,
        idAdultoMayor: input.idAdultoMayor,
        idRegistroEjercicioPlan: input.idRegistroEjercicioPlan,
      },
    });

    await pool.query(
      `update notificacion
       set estado = 'enviada', enviada_en = current_timestamp(3)
       where id_notificacion = :idNotificacion`,
      { idNotificacion: result.insertId },
    );
  } catch (error) {
    await pool.query(
      `update notificacion
       set estado = 'fallida', error_envio = :error
       where id_notificacion = :idNotificacion`,
      {
        idNotificacion: result.insertId,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

async function recalculateWeeklyStats(connection: Awaited<ReturnType<typeof pool.getConnection>>, input: {
  idAdultoMayor: number;
  idPlanEjercicio: number;
  fecha: string;
}): Promise<void> {
  await connection.query(
    `set @week_start := date_sub(:fecha, interval weekday(:fecha) day)`,
    { fecha: input.fecha },
  );
  await connection.query(
    `set @week_end := date_add(@week_start, interval 6 day)`,
  );

  const [rows] = await connection.query<ComplianceRow[]>(
    `select count(*) as ejercicios_programados,
            sum(case when estado = 'completado' then 1 else 0 end) as ejercicios_completados,
            sum(case when estado = 'omitido' then 1 else 0 end) as ejercicios_omitidos,
            sum(case when estado = 'parcial' then 1 else 0 end) as ejercicios_parciales
     from registro_ejercicio_plan
     where id_adulto_mayor = :idAdultoMayor
       and fecha_programada between @week_start and @week_end`,
    { idAdultoMayor: input.idAdultoMayor },
  );

  const stats = rows[0] ?? {
    ejercicios_programados: 0,
    ejercicios_completados: 0,
    ejercicios_omitidos: 0,
    ejercicios_parciales: 0,
  };

  const completed = Number(stats.ejercicios_completados ?? 0);
  const programmed = Number(stats.ejercicios_programados ?? 0);
  const percentage = programmed > 0 ? (completed / programmed) * 100 : 0;

  await connection.query(
    `insert into estadistica_progreso
      (id_adulto_mayor, id_plan_ejercicio, tipo_periodo, fecha_inicio, fecha_fin,
       ejercicios_programados, ejercicios_completados, ejercicios_omitidos, porcentaje_cumplimiento, datos_metricas)
     values
      (:idAdultoMayor, :idPlanEjercicio, 'semana', @week_start, @week_end,
       :programmed, :completed, :omitted, :percentage, :metrics)
     on duplicate key update
       ejercicios_programados = values(ejercicios_programados),
       ejercicios_completados = values(ejercicios_completados),
       ejercicios_omitidos = values(ejercicios_omitidos),
       porcentaje_cumplimiento = values(porcentaje_cumplimiento),
       datos_metricas = values(datos_metricas),
       calculado_en = current_timestamp(3)`,
    {
      idAdultoMayor: input.idAdultoMayor,
      idPlanEjercicio: input.idPlanEjercicio,
      programmed,
      completed,
      omitted: Number(stats.ejercicios_omitidos ?? 0),
      percentage,
      metrics: JSON.stringify({
        parciales: Number(stats.ejercicios_parciales ?? 0),
      }),
    },
  );
}

export async function registerTrackingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tracking/activity-records', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = activityRecordSchema.parse(request.body);
    await assertCanAccessOlderAdult(body.idAdultoMayor, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const idRegistroActividadDiaria = await upsertDailyActivity(connection, {
        idAdultoMayor: body.idAdultoMayor,
        idPlanEjercicio: body.idPlanEjercicio ?? null,
        fechaActividad: body.fechaActividad,
        registradoPor: actor.idUsuario,
        resumen: body.resumen ?? null,
        nivelEnergia: body.nivelEnergia,
        observaciones: body.observaciones ?? null,
      });

      await insertChangeAudit(connection, {
        tabla: 'registro_actividad_diaria',
        registroId: idRegistroActividadDiaria,
        accion: 'crear',
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { idRegistroActividadDiaria };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.post('/tracking/exercise-records', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = exerciseRecordSchema.parse(request.body);
    const link = await getExercisePlanLink(body.idEjercicioPlan);

    if (link.id_adulto_mayor !== body.idAdultoMayor) {
      throw forbidden('El ejercicio no pertenece al adulto mayor indicado');
    }

    await assertCanAccessOlderAdult(body.idAdultoMayor, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const idRegistroActividadDiaria = await upsertDailyActivity(connection, {
        idAdultoMayor: body.idAdultoMayor,
        idPlanEjercicio: link.id_plan_ejercicio,
        fechaActividad: body.fechaProgramada,
        registradoPor: actor.idUsuario,
      });

      await connection.query(
        `insert into registro_ejercicio_plan
          (id_ejercicio_plan, id_adulto_mayor, id_registro_actividad_diaria, fecha_programada,
           fecha_realizacion, estado, duracion_real_segundos, repeticiones_realizadas,
           esfuerzo_percibido, dolor_reportado, comentario, registrado_por)
         values
          (:idEjercicioPlan, :idAdultoMayor, :idRegistroActividadDiaria, :fechaProgramada,
           :fechaRealizacion, :estado, :duracionRealSegundos, :repeticionesRealizadas,
           :esfuerzoPercibido, :dolorReportado, :comentario, :registradoPor)
         on duplicate key update
           id_registro_actividad_diaria = values(id_registro_actividad_diaria),
           fecha_realizacion = values(fecha_realizacion),
           estado = values(estado),
           duracion_real_segundos = values(duracion_real_segundos),
           repeticiones_realizadas = values(repeticiones_realizadas),
           esfuerzo_percibido = values(esfuerzo_percibido),
           dolor_reportado = values(dolor_reportado),
           comentario = values(comentario),
           registrado_por = values(registrado_por)`,
        {
          idEjercicioPlan: body.idEjercicioPlan,
          idAdultoMayor: body.idAdultoMayor,
          idRegistroActividadDiaria,
          fechaProgramada: body.fechaProgramada,
          fechaRealizacion: body.fechaRealizacion ?? new Date().toISOString(),
          estado: body.estado,
          duracionRealSegundos: body.duracionRealSegundos ?? null,
          repeticionesRealizadas: body.repeticionesRealizadas ?? null,
          esfuerzoPercibido: body.esfuerzoPercibido ?? null,
          dolorReportado: body.dolorReportado ?? null,
          comentario: body.comentario ?? null,
          registradoPor: actor.idUsuario,
        },
      );

      const [rows] = await connection.query<ExerciseRecordRow[]>(
        `select id_registro_ejercicio_plan, id_ejercicio_plan, id_adulto_mayor, id_registro_actividad_diaria,
                fecha_programada, fecha_realizacion, estado, duracion_real_segundos,
                repeticiones_realizadas, esfuerzo_percibido, dolor_reportado, comentario
         from registro_ejercicio_plan
         where id_ejercicio_plan = :idEjercicioPlan and fecha_programada = :fechaProgramada
         limit 1`,
        {
          idEjercicioPlan: body.idEjercicioPlan,
          fechaProgramada: body.fechaProgramada,
        },
      );

      const record = rows[0];
      if (!record) throw notFound('Registro de ejercicio no encontrado');

      await recalculateWeeklyStats(connection, {
        idAdultoMayor: body.idAdultoMayor,
        idPlanEjercicio: link.id_plan_ejercicio,
        fecha: body.fechaProgramada,
      });

      await insertChangeAudit(connection, {
        tabla: 'registro_ejercicio_plan',
        registroId: record.id_registro_ejercicio_plan,
        accion: 'actualizar',
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      await createAndSendTrackingNotification({
        idUsuario: actor.idUsuario,
        idAdultoMayor: body.idAdultoMayor,
        estado: body.estado,
        idRegistroEjercicioPlan: record.id_registro_ejercicio_plan,
      });
      return mapExerciseRecord(record);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.get('/older-adults/:id/exercise-records', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const query = z.object({
      from: z.string().date().optional(),
      to: z.string().date().optional(),
    }).parse(request.query);

    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<ExerciseRecordRow[]>(
      `select id_registro_ejercicio_plan, id_ejercicio_plan, id_adulto_mayor, id_registro_actividad_diaria,
              fecha_programada, fecha_realizacion, estado, duracion_real_segundos,
              repeticiones_realizadas, esfuerzo_percibido, dolor_reportado, comentario
       from registro_ejercicio_plan
       where id_adulto_mayor = :idAdultoMayor
         and (:fromDate is null or fecha_programada >= :fromDate)
         and (:toDate is null or fecha_programada <= :toDate)
       order by fecha_programada desc, id_registro_ejercicio_plan desc`,
      {
        idAdultoMayor: params.id,
        fromDate: query.from ?? null,
        toDate: query.to ?? null,
      },
    );

    return rows.map(mapExerciseRecord);
  });

  app.get('/older-adults/:id/progress-stats', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_estadistica_progreso, id_adulto_mayor, id_plan_ejercicio, tipo_periodo,
              fecha_inicio, fecha_fin, ejercicios_programados, ejercicios_completados,
              ejercicios_omitidos, porcentaje_cumplimiento, datos_metricas, calculado_en
       from estadistica_progreso
       where id_adulto_mayor = :idAdultoMayor
       order by fecha_inicio desc
       limit 24`,
      { idAdultoMayor: params.id },
    );

    return rows;
  });
}
