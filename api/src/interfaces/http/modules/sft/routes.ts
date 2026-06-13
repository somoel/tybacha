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
import {
  renderBulkBatteryXlsx,
  type BulkBatteryRow,
} from '../../../../infrastructure/reports/bulkBatteryReport.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';
import {
  calculateAgeBand,
  calculateNormativePercentage,
  getPerformanceCategory,
  getNormativeRange,
} from '../../../../../../shared/constants/normativeRanges.js';
import type { SFTTestType, PatientGender } from '../../../../../../shared/constants/normativeRanges.js';

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

/**
 * Map test order (1-7) to SFTTestType.
 * This matches the order in the database.
 */
const ORDER_TO_TEST_TYPE: Record<number, SFTTestType> = {
  1: 'chair_stand',
  2: 'arm_curl',
  3: 'six_min_walk',
  4: 'two_min_step',
  5: 'chair_sit_reach',
  6: 'back_scratch',
  7: 'up_and_go',
};

/**
 * Higher-is-better flag per test (for up_and_go it's false).
 */
const HIGHER_IS_BETTER: Record<SFTTestType, boolean> = {
  chair_stand: true,
  arm_curl: true,
  six_min_walk: true,
  two_min_step: true,
  chair_sit_reach: true,
  back_scratch: true,
  up_and_go: false,
};

function calculatePerformance(
  value: number,
  testType: SFTTestType,
  gender: PatientGender | null,
  birthDate: string | null,
): { label: string; percentage: number } {
  const higherIsBetter = HIGHER_IS_BETTER[testType];

  // Try gender/age-specific range first
  if (gender && birthDate) {
    const ageBand = calculateAgeBand(birthDate);
    if (ageBand) {
      const range = getNormativeRange(testType, gender, ageBand);
      if (range) {
        const percentage = calculateNormativePercentage(value, range, higherIsBetter);
        const label = getPerformanceCategory(value, range, higherIsBetter);
        return { label, percentage };
      }
    }
  }

  // Fallback: use legacy flat ranges (approximate values from the original code)
  const LEGACY_RANGES: Record<SFTTestType, { belowBelowAvg: number; excellent: number }> = {
    chair_stand: { belowBelowAvg: 8, excellent: 23 },
    arm_curl: { belowBelowAvg: 10, excellent: 24 },
    six_min_walk: { belowBelowAvg: 350, excellent: 750 },
    two_min_step: { belowBelowAvg: 60, excellent: 130 },
    chair_sit_reach: { belowBelowAvg: -4, excellent: 8 },
    back_scratch: { belowBelowAvg: -12, excellent: 8 },
    up_and_go: { belowBelowAvg: 14, excellent: 6 },
  };

  const legacy = LEGACY_RANGES[testType];
  let percentage: number;
  if (higherIsBetter) {
    const totalRange = legacy.excellent - legacy.belowBelowAvg;
    percentage = totalRange <= 0 ? 50 : Math.max(0, Math.min(100, ((value - legacy.belowBelowAvg) / totalRange) * 100));
  } else {
    const totalRange = legacy.belowBelowAvg - legacy.excellent;
    percentage = totalRange <= 0 ? 50 : Math.max(0, Math.min(100, ((legacy.belowBelowAvg - value) / totalRange) * 100));
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
          const testType = ORDER_TO_TEST_TYPE[orden];
          const valor = row.valor_numerico ?? 0;
          const gender = adult.genero === 'masculino' ? 'M' : 'F' as PatientGender;
          const birthDate = adult.fecha_nacimiento ? String(adult.fecha_nacimiento) : null;
          const perf = testType ? calculatePerformance(valor, testType, gender, birthDate) : { label: row.clasificacion ?? '', percentage: 0 };
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

  app.post('/sft-applications/export-bulk.xlsx', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const body = z.object({ patientIds: z.array(z.coerce.number().int().positive()).min(1).max(100) }).parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores pueden exportar baterías');
    }

    // Assert access to all patients
    for (const id of body.patientIds) {
      await assertCanAccessOlderAdult(id, actor);
    }

    // 1. Get latest finalized application per patient
    const [appRows] = await pool.query<RowDataPacket[]>(
      `select aps.id_aplicacion_sft, aps.id_adulto_mayor, aps.fecha_aplicacion, aps.peso_kg, aps.estatura_cm, aps.imc
       from aplicacion_sft aps
       inner join (
         select id_adulto_mayor, max(fecha_aplicacion) as max_fecha
         from aplicacion_sft
         where id_adulto_mayor IN (:ids) and estado = 'finalizada'
         group by id_adulto_mayor
       ) latest on latest.id_adulto_mayor = aps.id_adulto_mayor and latest.max_fecha = aps.fecha_aplicacion`,
      { ids: body.patientIds },
    );

    if (appRows.length === 0) {
      throw notFound('Ninguno de los pacientes seleccionados tiene baterías finalizadas');
    }

    const appIds = appRows.map((r) => r.id_aplicacion_sft);

    // 2. Get results for those applications
    const [resultRows] = await pool.query<RowDataPacket[]>(
      `select rs.id_aplicacion_sft, ps.orden, rs.valor_numerico
       from resultado_sft rs
       join prueba_sft ps on ps.id_prueba_sft = rs.id_prueba_sft
       where rs.id_aplicacion_sft IN (:appIds)
       order by rs.id_aplicacion_sft, ps.orden`,
      { appIds },
    );

    // 3. Get patient data
    const [adultRows] = await pool.query<AdultRow[]>(
      `select id_adulto_mayor, nombres, apellidos, fecha_nacimiento, genero
       from adulto_mayor
       where id_adulto_mayor IN (:ids)`,
      { ids: body.patientIds },
    );

    const adultMap = new Map(adultRows.map((a) => [a.id_adulto_mayor, a]));

    // Group results by application
    const resultsByApp = new Map<number, Map<number, number | null>>();
    for (const row of resultRows) {
      const appId = row.id_aplicacion_sft;
      if (!resultsByApp.has(appId)) resultsByApp.set(appId, new Map());
      resultsByApp.get(appId)!.set(row.orden, row.valor_numerico);
    }

    // Build rows
    const bulkRows: BulkBatteryRow[] = appRows.map((app) => {
      const adult = adultMap.get(app.id_adulto_mayor);
      const results = resultsByApp.get(app.id_aplicacion_sft) ?? new Map();

      const valores: (number | null)[] = [];
      const porcentajes: (number | null)[] = [];

      const gender = adult?.genero === 'masculino' ? 'M' : 'F' as PatientGender;
      const birthDate = adult?.fecha_nacimiento ? String(adult.fecha_nacimiento) : null;

      for (let orden = 1; orden <= 7; orden++) {
        const valor = results.get(orden) ?? null;
        valores.push(valor);
        const testType = ORDER_TO_TEST_TYPE[orden];
        if (valor !== null && testType) {
          const perf = calculatePerformance(valor, testType, gender, birthDate);
          porcentajes.push(Math.round(perf.percentage));
        } else {
          porcentajes.push(null);
        }
      }

      return {
        paciente: {
          nombres: adult?.nombres ?? '',
          apellidos: adult?.apellidos ?? '',
          fechaNacimiento: adult ? String(adult.fecha_nacimiento) : '',
          genero: adult?.genero ?? '',
        },
        bateria: {
          fechaAplicacion: app.fecha_aplicacion,
          pesoKg: app.peso_kg,
          estaturaCm: app.estatura_cm,
          imc: app.imc,
        },
        valores,
        porcentajes,
      };
    });

    const content = await renderBulkBatteryXlsx(bulkRows, new Date());
    const patientCount = body.patientIds.length;
    const fileName = `baterias-sft-masivo-${patientCount}-pacientes.xlsx`;
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    await persistBatteryReport({
      actorId: actor.idUsuario,
      title: `Exportación masiva SFT — ${patientCount} pacientes`,
      fileName,
      content,
    });

    await insertAccessAuditWithPool(() => pool.getConnection(), {
      idUsuario: actor.idUsuario,
      idAdultoMayor: null,
      tipoDato: 'reporte',
      accion: 'exportar',
      resultado: 'permitido',
      motivo: `Exportación masiva SFT de ${patientCount} pacientes`,
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
