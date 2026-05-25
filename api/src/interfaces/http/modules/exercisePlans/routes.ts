import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { generateWithGemini } from '../../../../infrastructure/ai/gemini.js';
import { insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

const generatePlanSchema = z.object({
  idAdultoMayor: z.number().int().positive(),
  idAplicacionSft: z.number().int().positive().optional(),
  titulo: z.string().max(160).default('Plan semanal personalizado'),
  objetivo: z.string().optional(),
});

const updatePlanStatusSchema = z.object({
  estado: z.enum(['borrador', 'generado', 'revisado', 'asignado', 'activo', 'pausado', 'finalizado', 'cancelado']),
  motivo: z.string().max(255).optional(),
});

const aiExerciseSchema = z.object({
  diaSemana: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']),
  nombre: z.string().min(1).max(160),
  descripcion: z.string().optional(),
  series: z.number().int().positive().optional(),
  repeticiones: z.number().int().positive().optional(),
  duracionSegundos: z.number().int().positive().optional(),
  descansoSegundos: z.number().int().nonnegative().optional(),
  dificultad: z.enum(['bajo', 'medio', 'alto']).default('bajo'),
  instrucciones: z.string().optional(),
});

const aiPlanSchema = z.object({
  resumen: z.string(),
  objetivo: z.string().optional(),
  nivelDificultad: z.enum(['bajo', 'medio', 'alto']).default('bajo'),
  ejercicios: z.array(aiExerciseSchema).length(5),
});

interface OlderAdultContextRow extends RowDataPacket {
  id_adulto_mayor: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  id_profesional_responsable: number | null;
  id_cuidador: number | null;
  patologias: string | null;
  medicamentos: string | null;
}

interface SftResultRow extends RowDataPacket {
  prueba: string;
  valor_numerico: number | null;
  valor_texto: string | null;
  unidad_resultado: string | null;
}

interface PlanRow extends RowDataPacket {
  id_plan_ejercicio: number;
  id_adulto_mayor: number;
  titulo: string;
  objetivo: string | null;
  origen: string;
  estado: string;
  nivel_dificultad: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  creado_por: number | null;
  revisado_por: number | null;
  asignado_por: number | null;
  creado_en: string;
}

interface ExercisePlanRow extends RowDataPacket {
  id_ejercicio_plan: number;
  id_plan_ejercicio: number;
  nombre_personalizado: string | null;
  descripcion_personalizada: string | null;
  dia_semana: string;
  orden: number;
  series: number | null;
  repeticiones: number | null;
  duracion_segundos: number | null;
  descanso_segundos: number | null;
  dificultad: string;
  instrucciones: string | null;
}

function normalizeGeminiJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('La respuesta de IA no contiene JSON valido');
    return JSON.parse(match[0]);
  }
}

async function getOlderAdultContext(idAdultoMayor: number, actorId: number, role: string): Promise<OlderAdultContextRow> {
  const [rows] = await pool.query<OlderAdultContextRow[]>(
    `select a.id_adulto_mayor, a.nombres, a.apellidos, a.fecha_nacimiento, a.genero,
            a.id_profesional_responsable,
            ac.id_cuidador,
            (
              select group_concat(concat(nombre, coalesce(concat(': ', descripcion), '')) separator '; ')
              from patologia_adulto_mayor p
              where p.id_adulto_mayor = a.id_adulto_mayor
            ) as patologias,
            (
              select group_concat(concat(nombre, coalesce(concat(' ', dosis), ''), coalesce(concat(' ', frecuencia), '')) separator '; ')
              from medicamento_adulto_mayor m
              where m.id_adulto_mayor = a.id_adulto_mayor and m.estado = 'activo'
            ) as medicamentos
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

  const adult = rows[0];
  if (!adult) throw forbidden();
  return adult;
}

async function getLatestSftResults(idAdultoMayor: number, idAplicacionSft?: number): Promise<SftResultRow[]> {
  const params = { idAdultoMayor, idAplicacionSft: idAplicacionSft ?? null };
  const [applicationRows] = await pool.query<RowDataPacket[]>(
    `select id_aplicacion_sft
     from aplicacion_sft
     where id_adulto_mayor = :idAdultoMayor
       and (:idAplicacionSft is null or id_aplicacion_sft = :idAplicacionSft)
     order by fecha_aplicacion desc
     limit 1`,
    params,
  );

  const application = applicationRows[0] as { id_aplicacion_sft?: number } | undefined;
  if (!application?.id_aplicacion_sft) {
    throw badRequest('El adulto mayor no tiene una aplicacion SFT disponible');
  }

  const [rows] = await pool.query<SftResultRow[]>(
    `select ps.nombre as prueba, rs.valor_numerico, rs.valor_texto, ps.unidad_resultado
     from resultado_sft rs
     join prueba_sft ps on ps.id_prueba_sft = rs.id_prueba_sft
     where rs.id_aplicacion_sft = :idAplicacionSft
     order by ps.orden`,
    { idAplicacionSft: application.id_aplicacion_sft },
  );

  return rows;
}

function buildPrompt(adult: OlderAdultContextRow, sftResults: SftResultRow[]) {
  const results = sftResults
    .map((result) => `- ${result.prueba}: ${result.valor_numerico ?? result.valor_texto ?? 'Sin valor'} ${result.unidad_resultado ?? ''}`)
    .join('\n');

  return `Eres un especialista en ejercicio fisico para adultos mayores.

Genera un plan de ejercicios semanal personalizado y seguro.

REGLAS OBLIGATORIAS:
- Responde unicamente JSON valido.
- Debe contener exactamente 5 ejercicios.
- Debe haber un ejercicio para cada dia: lunes, martes, miercoles, jueves y viernes.
- Usa dificultad bajo, medio o alto.
- Evita ejercicios contraindicados para las patologias registradas.
- No incluyas sabado ni domingo.

ADULTO MAYOR:
- Nombre: ${adult.nombres} ${adult.apellidos}
- Fecha de nacimiento: ${adult.fecha_nacimiento}
- Genero: ${adult.genero}
- Patologias: ${adult.patologias ?? 'No registradas'}
- Medicamentos activos: ${adult.medicamentos ?? 'No registrados'}

RESULTADOS SFT:
${results}

JSON esperado:
{
  "resumen": "Resumen breve del plan",
  "objetivo": "Objetivo funcional del plan",
  "nivelDificultad": "bajo",
  "ejercicios": [
    {
      "diaSemana": "lunes",
      "nombre": "Nombre",
      "descripcion": "Descripcion breve",
      "series": 2,
      "repeticiones": 10,
      "duracionSegundos": null,
      "descansoSegundos": 60,
      "dificultad": "bajo",
      "instrucciones": "Indicaciones claras para cuidador"
    }
  ]
}`;
}

async function fetchPlanWithExercises(idPlanEjercicio: number) {
  const [planRows] = await pool.query<PlanRow[]>(
    `select id_plan_ejercicio, id_adulto_mayor, titulo, objetivo, origen, estado, nivel_dificultad,
            fecha_inicio, fecha_fin, creado_por, revisado_por, asignado_por, creado_en
     from plan_ejercicio
     where id_plan_ejercicio = :idPlanEjercicio
     limit 1`,
    { idPlanEjercicio },
  );

  const plan = planRows[0];
  if (!plan) throw notFound('Plan no encontrado');

  const [exerciseRows] = await pool.query<ExercisePlanRow[]>(
    `select id_ejercicio_plan, id_plan_ejercicio, nombre_personalizado, descripcion_personalizada,
            dia_semana, orden, series, repeticiones, duracion_segundos, descanso_segundos,
            dificultad, instrucciones
     from ejercicio_plan
     where id_plan_ejercicio = :idPlanEjercicio and activo = 1
     order by orden`,
    { idPlanEjercicio },
  );

  return {
    idPlanEjercicio: plan.id_plan_ejercicio,
    idAdultoMayor: plan.id_adulto_mayor,
    titulo: plan.titulo,
    objetivo: plan.objetivo,
    origen: plan.origen,
    estado: plan.estado,
    nivelDificultad: plan.nivel_dificultad,
    fechaInicio: plan.fecha_inicio,
    fechaFin: plan.fecha_fin,
    creadoPor: plan.creado_por,
    revisadoPor: plan.revisado_por,
    asignadoPor: plan.asignado_por,
    creadoEn: plan.creado_en,
    ejercicios: exerciseRows.map((exercise) => ({
      idEjercicioPlan: exercise.id_ejercicio_plan,
      idPlanEjercicio: exercise.id_plan_ejercicio,
      nombre: exercise.nombre_personalizado,
      descripcion: exercise.descripcion_personalizada,
      diaSemana: exercise.dia_semana,
      orden: exercise.orden,
      series: exercise.series,
      repeticiones: exercise.repeticiones,
      duracionSegundos: exercise.duracion_segundos,
      descansoSegundos: exercise.descanso_segundos,
      dificultad: exercise.dificultad,
      instrucciones: exercise.instrucciones,
    })),
  };
}

export async function registerExercisePlanRoutes(app: FastifyInstance): Promise<void> {
  app.get('/older-adults/:id/exercise-plans', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await getOlderAdultContext(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<PlanRow[]>(
      `select id_plan_ejercicio, id_adulto_mayor, titulo, objetivo, origen, estado, nivel_dificultad,
              fecha_inicio, fecha_fin, creado_por, revisado_por, asignado_por, creado_en
       from plan_ejercicio
       where id_adulto_mayor = :idAdultoMayor
       order by creado_en desc`,
      { idAdultoMayor: params.id },
    );

    return rows.map((plan) => ({
      idPlanEjercicio: plan.id_plan_ejercicio,
      idAdultoMayor: plan.id_adulto_mayor,
      titulo: plan.titulo,
      objetivo: plan.objetivo,
      origen: plan.origen,
      estado: plan.estado,
      nivelDificultad: plan.nivel_dificultad,
      fechaInicio: plan.fecha_inicio,
      fechaFin: plan.fecha_fin,
      creadoEn: plan.creado_en,
    }));
  });

  app.get('/exercise-plans/:id', { preHandler: requireAuth(app) }, async (request) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    return fetchPlanWithExercises(params.id);
  });

  app.post('/exercise-plans/generate', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores generan planes con IA');
    }

    const body = generatePlanSchema.parse(request.body);
    const adult = await getOlderAdultContext(body.idAdultoMayor, actor.idUsuario, actor.rol);
    const sftResults = await getLatestSftResults(body.idAdultoMayor, body.idAplicacionSft);
    const prompt = buildPrompt(adult, sftResults);

    const connection = await pool.getConnection();
    try {
      const responseText = await generateWithGemini(prompt);
      const parsed = aiPlanSchema.parse(normalizeGeminiJson(responseText));

      await connection.beginTransaction();

      const [insertPlan] = await connection.query<ResultSetHeader>(
        `insert into plan_ejercicio
          (id_adulto_mayor, titulo, objetivo, origen, estado, nivel_dificultad, creado_por, datos_personalizacion)
         values
          (:idAdultoMayor, :titulo, :objetivo, 'ia', 'generado', :nivelDificultad, :creadoPor, :datosPersonalizacion)`,
        {
          idAdultoMayor: body.idAdultoMayor,
          titulo: body.titulo,
          objetivo: parsed.objetivo ?? body.objetivo ?? null,
          nivelDificultad: parsed.nivelDificultad,
          creadoPor: actor.idUsuario,
          datosPersonalizacion: JSON.stringify({
            resumen: parsed.resumen,
            idAplicacionSft: body.idAplicacionSft ?? null,
          }),
        },
      );

      const idPlanEjercicio = insertPlan.insertId;

      for (let index = 0; index < parsed.ejercicios.length; index++) {
        const exercise = parsed.ejercicios[index]!;
        await connection.query(
          `insert into ejercicio_plan
            (id_plan_ejercicio, nombre_personalizado, descripcion_personalizada, dia_semana,
             orden, series, repeticiones, duracion_segundos, descanso_segundos, dificultad, instrucciones)
           values
            (:idPlanEjercicio, :nombre, :descripcion, :diaSemana,
             :orden, :series, :repeticiones, :duracionSegundos, :descansoSegundos, :dificultad, :instrucciones)`,
          {
            idPlanEjercicio,
            nombre: exercise.nombre,
            descripcion: exercise.descripcion ?? null,
            diaSemana: exercise.diaSemana,
            orden: index + 1,
            series: exercise.series ?? null,
            repeticiones: exercise.repeticiones ?? null,
            duracionSegundos: exercise.duracionSegundos ?? null,
            descansoSegundos: exercise.descansoSegundos ?? null,
            dificultad: exercise.dificultad,
            instrucciones: exercise.instrucciones ?? null,
          },
        );
      }

      await connection.query(
        `insert into generacion_ia_plan
          (id_plan_ejercicio, proveedor, modelo, solicitud, respuesta, estado, creado_por)
         values
          (:idPlanEjercicio, 'gemini', :modelo, :solicitud, :respuesta, 'exitosa', :creadoPor)`,
        {
          idPlanEjercicio,
          modelo: 'gemini',
          solicitud: JSON.stringify({ prompt }),
          respuesta: JSON.stringify(parsed),
          creadoPor: actor.idUsuario,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'plan_ejercicio',
        registroId: idPlanEjercicio,
        accion: 'crear',
        nuevos: parsed,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return fetchPlanWithExercises(idPlanEjercicio);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  app.patch('/exercise-plans/:id/status', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = updatePlanStatusSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores cambian estados de plan');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query<PlanRow[]>(
        `select id_plan_ejercicio, id_adulto_mayor, titulo, objetivo, origen, estado, nivel_dificultad,
                fecha_inicio, fecha_fin, creado_por, revisado_por, asignado_por, creado_en
         from plan_ejercicio
         where id_plan_ejercicio = :id
         limit 1`,
        { id: params.id },
      );

      const plan = rows[0];
      if (!plan) throw notFound('Plan no encontrado');
      await getOlderAdultContext(plan.id_adulto_mayor, actor.idUsuario, actor.rol);

      await connection.query(
        `update plan_ejercicio
         set estado = :estado,
             revisado_por = case when :estado = 'revisado' then :actorId else revisado_por end,
             revisado_en = case when :estado = 'revisado' then current_timestamp(3) else revisado_en end,
             asignado_por = case when :estado in ('asignado', 'activo') then :actorId else asignado_por end,
             asignado_en = case when :estado in ('asignado', 'activo') then current_timestamp(3) else asignado_en end
         where id_plan_ejercicio = :id`,
        { id: params.id, estado: body.estado, actorId: actor.idUsuario },
      );

      await connection.query(
        `insert into cambio_estado_plan
          (id_plan_ejercicio, estado_anterior, estado_nuevo, motivo, cambiado_por)
         values
          (:id, :estadoAnterior, :estadoNuevo, :motivo, :actorId)`,
        {
          id: params.id,
          estadoAnterior: plan.estado,
          estadoNuevo: body.estado,
          motivo: body.motivo ?? null,
          actorId: actor.idUsuario,
        },
      );

      await connection.commit();
      return fetchPlanWithExercises(params.id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });
}

