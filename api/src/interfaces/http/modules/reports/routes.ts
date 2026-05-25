import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  renderProgressPdf,
  renderProgressXlsx,
  type ProgressReportData,
} from '../../../../infrastructure/reports/progressReport.js';
import { insertAccessAuditWithPool } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { forbidden, notFound } from '../../httpErrors.js';
import { requireAuth } from '../../requireAuth.js';

interface AdultRow extends RowDataPacket {
  id_adulto_mayor: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  estado: string;
}

async function assertCanAccessOlderAdult(idAdultoMayor: number, actorId: number, role: string): Promise<AdultRow> {
  const [rows] = await pool.query<AdultRow[]>(
    `select a.id_adulto_mayor, a.nombres, a.apellidos, a.fecha_nacimiento, a.genero, a.estado
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

  const row = rows[0];
  if (!row) throw forbidden();
  return row;
}

async function buildProgressReportData(idAdultoMayor: number, actorId: number, role: string): Promise<ProgressReportData> {
  const adult = await assertCanAccessOlderAdult(idAdultoMayor, actorId, role);

  const [sftRows] = await pool.query<RowDataPacket[]>(
    `select aps.fecha_aplicacion as fechaAplicacion,
            ps.nombre as prueba,
            coalesce(cast(rs.valor_numerico as char), rs.valor_texto, '') as valor,
            ps.unidad_resultado as unidad
     from aplicacion_sft aps
     join resultado_sft rs on rs.id_aplicacion_sft = aps.id_aplicacion_sft
     join prueba_sft ps on ps.id_prueba_sft = rs.id_prueba_sft
     where aps.id_adulto_mayor = :idAdultoMayor
     order by aps.fecha_aplicacion desc, ps.orden
     limit 35`,
    { idAdultoMayor },
  );

  const [planRows] = await pool.query<RowDataPacket[]>(
    `select titulo, estado, nivel_dificultad as nivelDificultad, creado_en as creadoEn
     from plan_ejercicio
     where id_adulto_mayor = :idAdultoMayor
     order by creado_en desc
     limit 20`,
    { idAdultoMayor },
  );

  const [progressRows] = await pool.query<RowDataPacket[]>(
    `select tipo_periodo as periodo,
            fecha_inicio as fechaInicio,
            fecha_fin as fechaFin,
            ejercicios_programados as programados,
            ejercicios_completados as completados,
            ejercicios_omitidos as omitidos,
            porcentaje_cumplimiento as cumplimiento
     from estadistica_progreso
     where id_adulto_mayor = :idAdultoMayor
     order by fecha_inicio desc
     limit 24`,
    { idAdultoMayor },
  );

  return {
    adultoMayor: {
      idAdultoMayor: adult.id_adulto_mayor,
      nombres: adult.nombres,
      apellidos: adult.apellidos,
      fechaNacimiento: String(adult.fecha_nacimiento),
      genero: adult.genero,
      estado: adult.estado,
    },
    sft: sftRows.map((row) => ({
      fechaAplicacion: String(row.fechaAplicacion),
      prueba: String(row.prueba),
      valor: String(row.valor),
      unidad: row.unidad ? String(row.unidad) : null,
    })),
    planes: planRows.map((row) => ({
      titulo: String(row.titulo),
      estado: String(row.estado),
      nivelDificultad: String(row.nivelDificultad),
      creadoEn: String(row.creadoEn),
    })),
    progreso: progressRows.map((row) => ({
      periodo: String(row.periodo),
      fechaInicio: String(row.fechaInicio),
      fechaFin: String(row.fechaFin),
      programados: Number(row.programados),
      completados: Number(row.completados),
      omitidos: Number(row.omitidos),
      cumplimiento: Number(row.cumplimiento),
    })),
  };
}

async function persistReport(input: {
  actorId: number;
  format: 'pdf' | 'xlsx';
  title: string;
  filters: unknown;
  summary: unknown;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<{ idReporteGenerado: number; idArchivoExportado: number }> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [reportResult] = await connection.query<ResultSetHeader>(
      `insert into reporte_generado
        (tipo_reporte, titulo, filtros, resumen, formato, generado_por)
       values
        ('progreso', :title, :filters, :summary, :format, :actorId)`,
      {
        title: input.title,
        filters: JSON.stringify(input.filters),
        summary: JSON.stringify(input.summary),
        format: input.format,
        actorId: input.actorId,
      },
    );

    const hash = createHash('sha256').update(input.content).digest('hex');
    const [fileResult] = await connection.query<ResultSetHeader>(
      `insert into archivo_exportado
        (id_reporte_generado, nombre_archivo, tipo_mime, contenido_binario, tamano_bytes, huella_sha256)
       values
        (:idReporte, :fileName, :mimeType, :content, :size, :hash)`,
      {
        idReporte: reportResult.insertId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        content: input.content,
        size: input.content.byteLength,
        hash,
      },
    );

    await connection.commit();
    return {
      idReporteGenerado: reportResult.insertId,
      idArchivoExportado: fileResult.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function registerReportRoutes(app: FastifyInstance): Promise<void> {
  app.post('/reports/progress.:format', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const params = z.object({ format: z.enum(['pdf', 'xlsx']) }).parse(request.params);
    const body = z.object({ idAdultoMayor: z.number().int().positive() }).parse(request.body);

    const data = await buildProgressReportData(body.idAdultoMayor, actor.idUsuario, actor.rol);
    const isPdf = params.format === 'pdf';
    const content = isPdf ? await renderProgressPdf(data) : await renderProgressXlsx(data);
    const extension = params.format;
    const fileName = `reporte-progreso-${body.idAdultoMayor}.${extension}`;
    const mimeType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    await persistReport({
      actorId: actor.idUsuario,
      format: params.format,
      title: `Reporte de progreso - ${data.adultoMayor.nombres} ${data.adultoMayor.apellidos}`,
      filters: { idAdultoMayor: body.idAdultoMayor },
      summary: {
        sft: data.sft.length,
        planes: data.planes.length,
        progreso: data.progreso.length,
      },
      fileName,
      mimeType,
      content,
    });

    await insertAccessAuditWithPool(() => pool.getConnection(), {
      idUsuario: actor.idUsuario,
      idAdultoMayor: body.idAdultoMayor,
      tipoDato: 'reporte',
      accion: 'exportar',
      resultado: 'permitido',
      motivo: `Generacion de reporte de progreso ${params.format}`,
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

  app.get('/reports', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_reporte_generado as idReporteGenerado,
              tipo_reporte as tipoReporte,
              titulo,
              formato,
              creado_en as creadoEn
       from reporte_generado
       where generado_por = :actorId
       order by creado_en desc
       limit 50`,
      { actorId: actor.idUsuario },
    );
    return rows;
  });

  app.get('/reports/files/:id', { preHandler: requireAuth(app) }, async (request, reply) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select ae.nombre_archivo, ae.tipo_mime, ae.contenido_binario
       from archivo_exportado ae
       join reporte_generado rg on rg.id_reporte_generado = ae.id_reporte_generado
       where ae.id_archivo_exportado = :idArchivo
         and rg.generado_por = :actorId
       limit 1`,
      { idArchivo: params.id, actorId: actor.idUsuario },
    );

    const file = rows[0];
    if (!file) throw notFound('Archivo no encontrado');

    await insertAccessAuditWithPool(() => pool.getConnection(), {
      idUsuario: actor.idUsuario,
      idAdultoMayor: null,
      tipoDato: 'reporte',
      accion: 'descargar',
      resultado: 'permitido',
      motivo: `Descarga de archivo exportado ${params.id}`,
      context: {
        userId: actor.idUsuario,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    return reply
      .header('Content-Type', String(file.tipo_mime))
      .header('Content-Disposition', `attachment; filename="${String(file.nombre_archivo)}"`)
      .send(file.contenido_binario as Buffer);
  });
}
