import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import type { TokenUser } from '../../../../infrastructure/auth/tokens.js';
import { insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
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
}

interface ApplicationDetailRow extends RowDataPacket {
  id_aplicacion_sft: number;
  id_adulto_mayor: number;
  id_bateria_sft: number;
  responsable: number | null;
  fecha_aplicacion: string;
  estado: string;
  observaciones: string | null;
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
      `select id_aplicacion_sft, id_adulto_mayor, id_bateria_sft, responsable, fecha_aplicacion, estado, observaciones
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
    }));
  });

  app.get('/sft-applications/:id', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const [rows] = await pool.query<ApplicationDetailRow[]>(
      `select aps.id_aplicacion_sft, aps.id_adulto_mayor, aps.id_bateria_sft, aps.responsable,
              aps.fecha_aplicacion, aps.estado, aps.observaciones,
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
          (id_adulto_mayor, id_bateria_sft, responsable, fecha_aplicacion, estado, observaciones)
         values
          (:idAdultoMayor, :idBateriaSft, :responsable, coalesce(:fechaAplicacion, current_timestamp(3)), 'finalizada', :observaciones)`,
        {
          idAdultoMayor: params.id,
          idBateriaSft,
          responsable: actor.idUsuario,
          fechaAplicacion: body.fechaAplicacion ?? null,
          observaciones: body.observaciones ?? null,
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
}
