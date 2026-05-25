import type { FastifyInstance } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../../../../infrastructure/db/pool.js';
import { requireRoles } from '../../requireAuth.js';

export async function registerAuditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/audit/changes', { preHandler: requireRoles(app, ['administrador']) }, async (request) => {
    const query = z.object({
      tabla: z.string().max(120).optional(),
      limit: z.coerce.number().int().positive().max(200).default(100),
    }).parse(request.query);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_auditoria_cambio as idAuditoriaCambio,
              tabla_afectada as tablaAfectada,
              id_registro_afectado as idRegistroAfectado,
              accion,
              valores_anteriores as valoresAnteriores,
              valores_nuevos as valoresNuevos,
              realizado_por as realizadoPor,
              direccion_ip as direccionIp,
              agente_usuario as agenteUsuario,
              creado_en as creadoEn
       from auditoria_cambio
       where (:tabla is null or tabla_afectada = :tabla)
       order by creado_en desc
       limit :limit`,
      {
        tabla: query.tabla ?? null,
        limit: query.limit,
      },
    );

    return rows;
  });

  app.get('/audit/data-access', { preHandler: requireRoles(app, ['administrador']) }, async (request) => {
    const query = z.object({
      idAdultoMayor: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(200).default(100),
    }).parse(request.query);

    const [rows] = await pool.query<RowDataPacket[]>(
      `select id_auditoria_acceso_dato as idAuditoriaAccesoDato,
              id_usuario as idUsuario,
              id_adulto_mayor as idAdultoMayor,
              tipo_dato as tipoDato,
              accion,
              resultado,
              motivo,
              direccion_ip as direccionIp,
              agente_usuario as agenteUsuario,
              creado_en as creadoEn
       from auditoria_acceso_dato
       where (:idAdultoMayor is null or id_adulto_mayor = :idAdultoMayor)
       order by creado_en desc
       limit :limit`,
      {
        idAdultoMayor: query.idAdultoMayor ?? null,
        limit: query.limit,
      },
    );

    return rows;
  });
}

