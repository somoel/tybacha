import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { badRequest, forbidden } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

const syncOperationSchema = z.object({
  idLocal: z.string().uuid(),
  entidad: z.enum(['adulto_mayor', 'registro_ejercicio_plan']),
  accion: z.enum(['crear', 'actualizar']),
  creadoEnLocal: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

const syncRequestSchema = z.object({
  operaciones: z.array(syncOperationSchema).min(1).max(100),
});

type SyncOperation = z.infer<typeof syncOperationSchema>;

interface ExistingOperationRow extends RowDataPacket {
  estado: 'aplicada' | 'conflicto' | 'rechazada';
  id_remoto: number | null;
  detalle: unknown;
}

interface AccessRow extends RowDataPacket {
  id_adulto_mayor: number;
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

function optionalString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw badRequest(`Campo requerido invalido: ${key}`);
  }
  return value;
}

function optionalNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw badRequest(`Campo numerico invalido: ${key}`);
  }
  return number;
}

async function applyOlderAdultCreate(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  operation: SyncOperation,
  actor: { idUsuario: number; rol: string },
) {
  const payload = operation.payload;
  const idCuidador = actor.rol === 'cuidador'
    ? actor.idUsuario
    : optionalNumber(payload, 'idCuidador');

  if (!idCuidador) {
    throw badRequest('Crear adulto mayor offline requiere idCuidador');
  }

  const [userRows] = await connection.query<RowDataPacket[]>(
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
    { idCuidador, idProfesional: actor.rol === 'profesional' ? actor.idUsuario : null },
  );
  if (!userRows[0]) throw badRequest('Cuidador no encontrado, inactivo o no pertenece al profesional');

  const [insertResult] = await connection.query<ResultSetHeader>(
    `insert into adulto_mayor
      (nombres, apellidos, fecha_nacimiento, genero, tipo_documento, numero_documento,
       telefono, correo_contacto, direccion, ciudad, id_profesional_responsable, creado_por, actualizado_por)
     values
      (:nombres, :apellidos, :fechaNacimiento, :genero, :tipoDocumento, :numeroDocumento,
       :telefono, :correoContacto, :direccion, :ciudad, :profesional, :creadoPor, :actualizadoPor)`,
    {
      nombres: requiredString(payload, 'nombres'),
      apellidos: requiredString(payload, 'apellidos'),
      fechaNacimiento: requiredString(payload, 'fechaNacimiento'),
      genero: optionalString(payload, 'genero') ?? 'no_informa',
      tipoDocumento: optionalString(payload, 'tipoDocumento'),
      numeroDocumento: optionalString(payload, 'numeroDocumento'),
      telefono: optionalString(payload, 'telefono'),
      correoContacto: optionalString(payload, 'correoContacto'),
      direccion: optionalString(payload, 'direccion'),
      ciudad: optionalString(payload, 'ciudad'),
      profesional: actor.rol === 'profesional' ? actor.idUsuario : null,
      creadoPor: actor.idUsuario,
      actualizadoPor: actor.idUsuario,
    },
  );

  const idAdultoMayor = insertResult.insertId;
  await connection.query(
    `insert into asignacion_cuidador_adulto_mayor
      (id_adulto_mayor, id_cuidador, asignado_por, fecha_inicio)
     values
      (:idAdultoMayor, :idCuidador, :asignadoPor, current_date())`,
    { idAdultoMayor, idCuidador, asignadoPor: actor.idUsuario },
  );

  await insertChangeAudit(connection, {
    tabla: 'adulto_mayor',
    registroId: idAdultoMayor,
    accion: 'crear',
    nuevos: payload,
    context: { userId: actor.idUsuario },
  });

  return idAdultoMayor;
}

async function applyOlderAdultUpdate(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  operation: SyncOperation,
  actor: { idUsuario: number; rol: string },
) {
  const payload = operation.payload;
  const idAdultoMayor = optionalNumber(payload, 'idAdultoMayor');
  if (!idAdultoMayor) throw badRequest('Actualizar adulto mayor requiere idAdultoMayor');

  await assertCanAccessOlderAdult(idAdultoMayor, actor.idUsuario, actor.rol);

  await connection.query(
    `update adulto_mayor
     set nombres = coalesce(:nombres, nombres),
         apellidos = coalesce(:apellidos, apellidos),
         telefono = coalesce(:telefono, telefono),
         correo_contacto = coalesce(:correoContacto, correo_contacto),
         direccion = coalesce(:direccion, direccion),
         ciudad = coalesce(:ciudad, ciudad),
         actualizado_por = :actualizadoPor
     where id_adulto_mayor = :idAdultoMayor`,
    {
      idAdultoMayor,
      nombres: optionalString(payload, 'nombres'),
      apellidos: optionalString(payload, 'apellidos'),
      telefono: optionalString(payload, 'telefono'),
      correoContacto: optionalString(payload, 'correoContacto'),
      direccion: optionalString(payload, 'direccion'),
      ciudad: optionalString(payload, 'ciudad'),
      actualizadoPor: actor.idUsuario,
    },
  );

  await insertChangeAudit(connection, {
    tabla: 'adulto_mayor',
    registroId: idAdultoMayor,
    accion: 'actualizar',
    nuevos: payload,
    context: { userId: actor.idUsuario },
  });

  return idAdultoMayor;
}

async function applyExerciseRecord(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  operation: SyncOperation,
  actor: { idUsuario: number; rol: string },
) {
  const payload = operation.payload;
  const idEjercicioPlan = optionalNumber(payload, 'idEjercicioPlan');
  const idAdultoMayor = optionalNumber(payload, 'idAdultoMayor');
  if (!idEjercicioPlan || !idAdultoMayor) {
    throw badRequest('Registro de ejercicio requiere idEjercicioPlan e idAdultoMayor');
  }
  await assertCanAccessOlderAdult(idAdultoMayor, actor.idUsuario, actor.rol);

  const fechaProgramada = requiredString(payload, 'fechaProgramada');
  const [planRows] = await connection.query<RowDataPacket[]>(
    `select pe.id_plan_ejercicio
     from ejercicio_plan ep
     join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
     where ep.id_ejercicio_plan = :idEjercicioPlan
       and pe.id_adulto_mayor = :idAdultoMayor
     limit 1`,
    { idEjercicioPlan, idAdultoMayor },
  );
  const plan = planRows[0] as { id_plan_ejercicio?: number } | undefined;
  if (!plan?.id_plan_ejercicio) throw badRequest('Ejercicio no pertenece al adulto mayor');

  const [activityInsert] = await connection.query<ResultSetHeader>(
    `insert into registro_actividad_diaria
      (id_adulto_mayor, id_plan_ejercicio, fecha_actividad, registrado_por)
     values
      (:idAdultoMayor, :idPlanEjercicio, :fechaProgramada, :registradoPor)
     on duplicate key update registrado_por = values(registrado_por)`,
    {
      idAdultoMayor,
      idPlanEjercicio: plan.id_plan_ejercicio,
      fechaProgramada,
      registradoPor: actor.idUsuario,
    },
  );

  const [activityRows] = await connection.query<RowDataPacket[]>(
    `select id_registro_actividad_diaria
     from registro_actividad_diaria
     where id_adulto_mayor = :idAdultoMayor
       and id_plan_ejercicio = :idPlanEjercicio
       and fecha_actividad = :fechaProgramada
     limit 1`,
    {
      idAdultoMayor,
      idPlanEjercicio: plan.id_plan_ejercicio,
      fechaProgramada,
    },
  );

  const activity = activityRows[0] as { id_registro_actividad_diaria?: number } | undefined;
  const idActividad = activity?.id_registro_actividad_diaria ?? activityInsert.insertId;

  await connection.query(
    `insert into registro_ejercicio_plan
      (id_ejercicio_plan, id_adulto_mayor, id_registro_actividad_diaria, fecha_programada,
       fecha_realizacion, estado, duracion_real_segundos, repeticiones_realizadas,
       esfuerzo_percibido, dolor_reportado, comentario, registrado_por)
     values
      (:idEjercicioPlan, :idAdultoMayor, :idActividad, :fechaProgramada,
       :fechaRealizacion, :estado, :duracion, :repeticiones, :esfuerzo, :dolor, :comentario, :registradoPor)
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
      idEjercicioPlan,
      idAdultoMayor,
      idActividad,
      fechaProgramada,
      fechaRealizacion: optionalString(payload, 'fechaRealizacion') ?? new Date().toISOString(),
      estado: optionalString(payload, 'estado') ?? 'completado',
      duracion: optionalNumber(payload, 'duracionRealSegundos'),
      repeticiones: optionalNumber(payload, 'repeticionesRealizadas'),
      esfuerzo: optionalNumber(payload, 'esfuerzoPercibido'),
      dolor: optionalNumber(payload, 'dolorReportado'),
      comentario: optionalString(payload, 'comentario'),
      registradoPor: actor.idUsuario,
    },
  );

  const [recordRows] = await connection.query<RowDataPacket[]>(
    `select id_registro_ejercicio_plan
     from registro_ejercicio_plan
     where id_ejercicio_plan = :idEjercicioPlan and fecha_programada = :fechaProgramada
     limit 1`,
    { idEjercicioPlan, fechaProgramada },
  );
  const record = recordRows[0] as { id_registro_ejercicio_plan?: number } | undefined;
  return record?.id_registro_ejercicio_plan ?? null;
}

async function applyOperation(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  operation: SyncOperation,
  actor: { idUsuario: number; rol: string },
) {
  if (operation.entidad === 'adulto_mayor' && operation.accion === 'crear') {
    return applyOlderAdultCreate(connection, operation, actor);
  }
  if (operation.entidad === 'adulto_mayor' && operation.accion === 'actualizar') {
    return applyOlderAdultUpdate(connection, operation, actor);
  }
  if (operation.entidad === 'registro_ejercicio_plan') {
    return applyExerciseRecord(connection, operation, actor);
  }

  throw badRequest('Operacion de sincronizacion no soportada');
}

export async function registerSyncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sync/operations', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const body = syncRequestSchema.parse(request.body);
    const resultados = [];

    for (const operation of body.operaciones) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [existingRows] = await connection.query<ExistingOperationRow[]>(
          `select estado, id_remoto, detalle
           from operacion_sincronizacion
           where id_local = :idLocal and id_usuario = :idUsuario
           limit 1`,
          { idLocal: operation.idLocal, idUsuario: actor.idUsuario },
        );

        const existing = existingRows[0];
        if (existing) {
          await connection.commit();
          resultados.push({
            idLocal: operation.idLocal,
            estado: existing.estado,
            idRemoto: existing.id_remoto,
            detalle: existing.detalle,
          });
          continue;
        }

        const idRemoto = await applyOperation(connection, operation, actor);
        const detail = {
          entidad: operation.entidad,
          accion: operation.accion,
          payload: operation.payload,
        };

        await connection.query(
          `insert into operacion_sincronizacion
            (id_local, id_usuario, entidad, accion, estado, id_remoto, detalle, creado_en_local)
           values
            (:idLocal, :idUsuario, :entidad, :accion, 'aplicada', :idRemoto, :detalle, :creadoEnLocal)`,
          {
            idLocal: operation.idLocal,
            idUsuario: actor.idUsuario,
            entidad: operation.entidad,
            accion: operation.accion,
            idRemoto,
            detalle: JSON.stringify(detail),
            creadoEnLocal: operation.creadoEnLocal,
          },
        );

        await connection.commit();
        resultados.push({
          idLocal: operation.idLocal,
          estado: 'aplicada',
          idRemoto,
          detalle: detail,
        });
      } catch (error) {
        await connection.rollback();

        const detail = {
          error: error instanceof Error ? error.message : String(error),
          entidad: operation.entidad,
          accion: operation.accion,
        };

        await pool.query(
          `insert into operacion_sincronizacion
            (id_local, id_usuario, entidad, accion, estado, detalle, creado_en_local)
           values
            (:idLocal, :idUsuario, :entidad, :accion, 'rechazada', :detalle, :creadoEnLocal)
           on duplicate key update estado = 'rechazada', detalle = values(detalle)`,
          {
            idLocal: operation.idLocal,
            idUsuario: actor.idUsuario,
            entidad: operation.entidad,
            accion: operation.accion,
            detalle: JSON.stringify(detail),
            creadoEnLocal: operation.creadoEnLocal,
          },
        );

        resultados.push({
          idLocal: operation.idLocal,
          estado: 'rechazada',
          idRemoto: null,
          detalle: detail,
        });
      } finally {
        connection.release();
      }
    }

    return { resultados };
  });
}
