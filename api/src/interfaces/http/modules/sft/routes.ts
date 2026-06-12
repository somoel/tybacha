import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { TokenUser } from '../../../../infrastructure/auth/tokens.js';
import { insertAccessAuditWithPool, insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import {
  renderBatteryXlsx,
  type BatteryReportData,
} from '../../../../infrastructure/reports/batteryReport.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

const resultSchema = z.object({
  idPruebaSft: z.number().int().positive(),
  valorNumerico: z.number().optional(),
  valorTexto: z.string().max(255).optional(),
  clasificacion: z.string().max(80).optional(),
  observaciones: z.string().optional(),
});

const createApplicationSchema = z.object({
  idBateriaSft: z.number().int().positive().optional(),
  fechaAplicacion: z.string().datetime().optional(),
  observaciones: z.string().optional(),
  pesoKg: z.number().positive().optional(),
  estaturaCm: z.number().positive().optional(),
  imc: z.number().positive().optional(),
  resultados: z.array(resultSchema).min(1),
});

interface BatteryRow extends RowDataPacket {
  id_bateria_sft: number;
  nombre: string;
  descripcion: string | null;
  version: string;
}

interface TestRow extends RowDataPacket {
  id_prueba_sft: number;
  id_bateria_sft: number;
  nombre: string;
  descripcion: string | null;
  unidad_resultado: string | null;
  orden: number;
}

interface ApplicationRow extends RowDataPacket {
  id_aplicacion_sft: number;
  id_adulto_mayor: number;
  id_bateria_sft: number;
  responsable: number | null;
  fecha_aplicacion: string;
  estado: string;
  observaciones: string | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  imc: number | null;
}

interface ApplicationDetailRow extends RowDataPacket {
  id_aplicacion_sft: number;
  id_adulto_mayor: number;
  id_bateria_sft: number;
  responsable: number | null;
  fecha_aplicacion: string;
  estado: string;
  observaciones: string | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  imc: number | null;
  id_resultado_sft: number | null;
  id_prueba_sft: number | null;
  prueba_nombre: string | null;
  unidad_resultado: string | null;
  orden: number | null;
  valor_numerico: number | null;
  valor_texto: string | null;
  clasificacion: string | null;
  resultado_observaciones: string | null;
}

interface AdultRow extends RowDataPacket {
  id_adulto_mayor: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
}

async function getActiveSftBatteryId(): Promise<number> {
  const [rows] = await pool.query<BatteryRow[]>(
    `select id_bateria_sft, nombre, descripcion, version
     from bateria_sft
     where nombre = 'Senior Fitness Test' and estado = 'activa'
     order by version desc
     limit 1`,
  );
  const battery = rows[0];
  if (!battery) throw badRequest('No existe una bateria SFT activa. Ejecute los seeds.');
  return battery.id_bateria_sft;
}

async function assertCanAccessOlderAdult(
  idAdultoMayor: number,
  actor: TokenUser,
): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `select a.id_adulto_mayor
     from adulto_mayor a
     left join asignacion_cuidador_adulto_mayor ac
       on ac.id_adulto_mayor = a.id_adulto_mayor and ac.estado = 'activa'
     where a.id_adulto_mayor = :idAdultoMayor
       and (
         :rol = 'administrador'
         or a.id_profesional_responsable = :actorId
         or ac.id_cuidador = :actorId
       )
     limit 1`,
    { idAdultoMayor, actorId: actor.idUsuario, rol: actor.rol },
  );

  if (!rows[0]) throw forbidden();
}

const NORMATIVE_RANGES_BY_ORDER: Record<number, {
  prueba: string;
  unidad: string;
  higherIsBetter: boolean;
  belowBelowAvg: number;
  belowAvg: number;
  avg: number;
  aboveAvg: number;
  excellent: number;
}> = {
  1: { prueba: 'Sentarse y levantarse de silla', unidad: 'reps', higherIsBetter: true, belowBelowAvg: 8, belowAvg: 12, avg: 15, aboveAvg: 19, excellent: 23 },
  2: { prueba: 'Flexión de codo (Arm Curl)', unidad: 'reps', higherIsBetter: true, belowBelowAvg: 10, belowAvg: 13, avg: 16, aboveAvg: 20, excellent: 24 },
  3: { prueba: 'Caminata de 6 minutos', unidad: 'meters', higherIsBetter: true, belowBelowAvg: 350, belowAvg: 450, avg: 550, aboveAvg: 650, excellent: 750 },
  4: { prueba: 'Marcha estacionaria 2 minutos', unidad: 'steps', higherIsBetter: true, belowBelowAvg: 60, belowAvg: 75, avg: 90, aboveAvg: 110, excellent: 130 },
  5: { prueba: 'Sentado y extenderse (Chair Sit-and-Reach)', unidad: 'cm', higherIsBetter: true, belowBelowAvg: -4, belowAvg: -1, avg: 2, aboveAvg: 5, excellent: 8 },
  6: { prueba: 'Rascarse la espalda (Back Scratch)', unidad: 'cm', higherIsBetter: true, belowBelowAvg: -12, belowAvg: -6, avg: -1, aboveAvg: 4, excellent: 8 },
  7: { prueba: '8-Foot Up-and-Go', unidad: 'seconds', higherIsBetter: false, belowBelowAvg: 14, belowAvg: 12, avg: 10, aboveAvg: 8, excellent: 6 },
};

function calculatePerformance(value: number, ranges: (typeof NORMATIVE_RANGES_BY_ORDER)[number]): { label: string; percentage: number } {
  const { belowBelowAvg, excellent, higherIsBetter } = ranges;
  let percentage: number;
  if (higherIsBetter) {
    const totalRange = excellent - belowBelowAvg;
    percentage = totalRange <= 0 ? 50 : Math.max(0, Math.min(100, ((value - belowBelowAvg) / totalRange) * 100));
  } else {
    const totalRange = belowBelowAvg - excellent;
    percentage = totalRange <= 0 ? 50 : Math.max(0, Math.min(100, ((belowBelowAvg - value) / totalRange) * 100));
  }
  let label: string;
  if (percentage >= 80) label = 'Excelente';
  else if (percentage >= 60) label = 'Por encima del promedio';
  else if (percentage >= 40) label = 'Promedio';
  else if (percentage >= 20) label = 'Por debajo del promedio';
  else label = 'Bajo promedio';
  return { label, percentage };
}

async function persistBatteryReport(input: {
  actorId: number;
  title: string;
  fileName: string;
  content: Buffer;
}): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [reportResult] = await connection.query<ResultSetHeader>(
      `insert into reporte_generado
        (tipo_reporte, titulo, filtros, resumen, formato, generado_por)
       values
        ('sft', :title, '{}', '{}', 'xlsx', :actorId)`,
      { title: input.title, actorId: input.actorId },
    );

    const hash = createHash('sha256').update(input.content).digest('hex');
    await connection.query<ResultSetHeader>(
      `insert into archivo_exportado
        (id_reporte_generado, nombre_archivo, tipo_mime, contenido_binario, tamano_bytes, huella_sha256)
       values
        (:idReporte, :fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', :content, :size, :hash)`,
      {
        idReporte: reportResult.insertId,
        fileName: input.fileName,
        content: input.content,
        size: input.content.byteLength,
        hash,
      },
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function registerSftRoutes(app: FastifyInstance): Promise<void> {
  app.get('/sft/batteries/active', { preHandler: requireAuth(app) }, async () => {
    const [rows] = await pool.query<BatteryRow[]>(
      `select id_bateria_sft, nombre, descripcion, version
       from bateria_sft
       where estado = 'activa'
       order by nombre, version`,
    );

    return rows.map((row) => ({
      idBateriaSft: row.id_bateria_sft,
      nombre: row.nombre,
      descripcion: row.descripcion,
      version: row.version,
    }));
  });

  app.get('/sft/batteries/:id/tests', { preHandler: requireAuth(app) }, async (request) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const [rows] = await pool.query<TestRow[]>(
      `select id_prueba_sft, id_bateria_sft, nombre, descripcion, unidad_resultado, orden
       from prueba_sft
       where id_bateria_sft = :id and activa = 1
       order by orden`,
      { id: params.id },
    );

    return rows.map((row) => ({
      idPruebaSft: row.id_prueba_sft,
      idBateriaSft: row.id_bateria_sft,
      nombre: row.nombre,
      descripcion: row.descripcion,
      unidadResultado: row.unidad_resultado,
      orden: row.orden,
    }));
  });

  app.get('/older-adults/:id/sft-applications', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor);

    const [rows] = await pool.query<ApplicationRow[]>(
      `select id_aplicacion_sft, id_adulto_mayor, id_bateria_sft, responsable, fecha_aplicacion, estado, observaciones,
              peso_kg, estatura_cm, imc
       from aplicacion_sft
       where id_adulto_mayor = :id
         and estado = 'finalizada'
       order by fecha_aplicacion desc`,
      { id: params.id },
    );

    return rows.map((row) => ({
      idAplicacionSft: row.id_aplicacion_sft,
      idAdultoMayor: row.id_adulto_mayor,
      idBateriaSft: row.id_bateria_sft,
      responsable: row.responsable,
      fechaAplicacion: row.fecha_aplicacion,
      estado: row.estado,
      observaciones: row.observaciones,
      pesoKg: row.peso_kg,
      estaturaCm: row.estatura_cm,
      imc: row.imc,
    }));
  });

  app.get('/sft-applications/:id', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<ApplicationDetailRow[]>(
      `select aps.id_aplicacion_sft, aps.id_adulto_mayor, aps.id_bateria_sft, aps.responsable,
              aps.fecha_aplicacion, aps.estado, aps.observaciones,
              aps.peso_kg, aps.estatura_cm, aps.imc,
              rs.id_resultado_sft, ps.id_prueba_sft, ps.nombre as prueba_nombre, ps.unidad_resultado,
              ps.orden, rs.valor_numerico, rs.valor_texto, rs.clasificacion,
              rs.observaciones as resultado_observaciones
       from aplicacion_sft aps
       left join resultado_sft rs on rs.id_aplicacion_sft = aps.id_aplicacion_sft
       left join prueba_sft ps on ps.id_prueba_sft = rs.id_prueba_sft
       where aps.id_aplicacion_sft = :id
       order by ps.orden`,
      { id: params.id },
    );

    const first = rows[0];
    if (!first) throw notFound('Aplicacion SFT no encontrada');
    await assertCanAccessOlderAdult(first.id_adulto_mayor, actor);

    return {
      idAplicacionSft: first.id_aplicacion_sft,
      idAdultoMayor: first.id_adulto_mayor,
      idBateriaSft: first.id_bateria_sft,
      responsable: first.responsable,
      fechaAplicacion: first.fecha_aplicacion,
      estado: first.estado,
      observaciones: first.observaciones,
      pesoKg: first.peso_kg,
      estaturaCm: first.estatura_cm,
      imc: first.imc,
      resultados: rows
        .filter((row) => row.id_resultado_sft !== null)
        .map((row) => ({
          idResultadoSft: row.id_resultado_sft,
          idPruebaSft: row.id_prueba_sft,
          pruebaNombre: row.prueba_nombre,
          unidadResultado: row.unidad_resultado,
          orden: row.orden,
          valorNumerico: row.valor_numerico,
          valorTexto: row.valor_texto,
          clasificacion: row.clasificacion,
          observaciones: row.resultado_observaciones,
        })),
    };
  });

  app.post('/older-adults/:id/sft-applications', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = createApplicationSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores registran SFT');
    }

    await assertCanAccessOlderAdult(params.id, actor);
    const idBateriaSft = body.idBateriaSft ?? await getActiveSftBatteryId();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into aplicacion_sft
          (id_adulto_mayor, id_bateria_sft, responsable, fecha_aplicacion, estado, observaciones, peso_kg, estatura_cm, imc)
         values
          (:idAdultoMayor, :idBateriaSft, :responsable, coalesce(:fechaAplicacion, current_timestamp(3)), 'finalizada', :observaciones, :pesoKg, :estaturaCm, :imc)`,
        {
          idAdultoMayor: params.id,
          idBateriaSft,
          responsable: actor.idUsuario,
          fechaAplicacion: body.fechaAplicacion ?? null,
          observaciones: body.observaciones ?? null,
          pesoKg: body.pesoKg ?? null,
          estaturaCm: body.estaturaCm ?? null,
          imc: body.imc ?? null,
        },
      );

      const idAplicacionSft = insertResult.insertId;

      for (const result of body.resultados) {
        await connection.query(
          `insert into resultado_sft
            (id_aplicacion_sft, id_prueba_sft, valor_numerico, valor_texto, clasificacion, observaciones)
           values
            (:idAplicacionSft, :idPruebaSft, :valorNumerico, :valorTexto, :clasificacion, :observaciones)`,
          {
            idAplicacionSft,
            idPruebaSft: result.idPruebaSft,
            valorNumerico: result.valorNumerico ?? null,
            valorTexto: result.valorTexto ?? null,
            clasificacion: result.clasificacion ?? null,
            observaciones: result.observaciones ?? null,
          },
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'aplicacion_sft',
        registroId: idAplicacionSft,
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
        idAplicacionSft,
        idAdultoMayor: params.id,
        idBateriaSft,
        resultadosRegistrados: body.resultados.length,
      };
    } catch (error) {
      await connection.rollback();
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw notFound('La bateria o prueba SFT indicada no existe');
      }
      throw error;
    } finally {
      connection.release();
    }
  });

  app.get('/sft-applications/:id/export.xlsx', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<ApplicationDetailRow[]>(
      `select aps.id_aplicacion_sft, aps.id_adulto_mayor, aps.id_bateria_sft, aps.responsable,
              aps.fecha_aplicacion, aps.estado, aps.observaciones,
              aps.peso_kg, aps.estatura_cm, aps.imc,
              rs.id_resultado_sft, ps.id_prueba_sft, ps.nombre as prueba_nombre, ps.unidad_resultado,
              ps.orden, rs.valor_numerico, rs.valor_texto, rs.clasificacion,
              rs.observaciones as resultado_observaciones
       from aplicacion_sft aps
       left join resultado_sft rs on rs.id_aplicacion_sft = aps.id_aplicacion_sft
       left join prueba_sft ps on ps.id_prueba_sft = rs.id_prueba_sft
       where aps.id_aplicacion_sft = :id
       order by ps.orden`,
      { id: params.id },
    );

    const first = rows[0];
    if (!first) throw notFound('Aplicacion SFT no encontrada');
    await assertCanAccessOlderAdult(first.id_adulto_mayor, actor);

    const [adultRows] = await pool.query<AdultRow[]>(
      `select id_adulto_mayor, nombres, apellidos, fecha_nacimiento, genero
       from adulto_mayor
       where id_adulto_mayor = :idAdultoMayor
       limit 1`,
      { idAdultoMayor: first.id_adulto_mayor },
    );

    const adult = adultRows[0];
    if (!adult) throw notFound('Adulto mayor no encontrado');

    const reportData: BatteryReportData = {
      paciente: {
        nombres: adult.nombres,
        apellidos: adult.apellidos,
        fechaNacimiento: String(adult.fecha_nacimiento),
        genero: adult.genero,
      },
      bateria: {
        idAplicacionSft: first.id_aplicacion_sft,
        fechaAplicacion: first.fecha_aplicacion,
        pesoKg: first.peso_kg,
        estaturaCm: first.estatura_cm,
        imc: first.imc,
        observaciones: first.observaciones,
        estado: first.estado,
      },
      resultados: rows
        .filter((row) => row.id_resultado_sft !== null && row.orden !== null)
        .map((row) => {
          const orden = row.orden!;
          const ranges = NORMATIVE_RANGES_BY_ORDER[orden];
          const valor = row.valor_numerico ?? 0;
          const perf = ranges ? calculatePerformance(valor, ranges) : { label: row.clasificacion ?? '', percentage: 0 };
          return {
            prueba: row.prueba_nombre ?? `Prueba ${orden}`,
            valor,
            unidad: row.unidad_resultado ?? '',
            desempeno: perf.label,
            porcentaje: Math.round(perf.percentage),
            observaciones: row.resultado_observaciones,
          };
        }),
    };

    const content = await renderBatteryXlsx(reportData);
    const fileName = `bateria-sft-${params.id}.xlsx`;
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    await persistBatteryReport({
      actorId: actor.idUsuario,
      title: `Bateria SFT ${params.id} - ${adult.nombres} ${adult.apellidos}`,
      fileName,
      content,
    });

    await insertAccessAuditWithPool(() => pool.getConnection(), {
      idUsuario: actor.idUsuario,
      idAdultoMayor: first.id_adulto_mayor,
      tipoDato: 'reporte',
      accion: 'exportar',
      resultado: 'permitido',
      motivo: `Exportacion de batería SFT ${params.id} a XLSX`,
      context: {
        userId: actor.idUsuario,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    return reply
      .header('Content-Type', mimeType)
      .header('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(content);
  });
}
