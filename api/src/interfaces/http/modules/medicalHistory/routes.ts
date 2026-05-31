import type { FastifyInstance } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { insertAccessAudit, insertChangeAudit } from '../../../../infrastructure/db/audit.js';
import { pool } from '../../../../infrastructure/db/pool.js';
import { badRequest, forbidden, notFound } from '../../httpErrors.js';
import { requireAuth, requireRoles } from '../../requireAuth.js';

// ── Zod schemas ────────────────────────────────────────────────────────────

const pathologySchema = z.object({
  nombre: z.string().min(1).max(160),
  descripcion: z.string().optional(),
  fechaDiagnostico: z.string().date().optional(),
  estado: z.enum(['activa', 'resuelta', 'cronica', 'desconocida']).default('activa'),
});

const medicationSchema = z.object({
  nombre: z.string().min(1).max(160),
  dosis: z.string().max(120).optional(),
  frecuencia: z.string().max(120).optional(),
  viaAdministracion: z.string().max(80).optional(),
  fechaInicio: z.string().date().optional(),
  fechaFin: z.string().date().optional(),
  estado: z.enum(['activo', 'suspendido', 'finalizado', 'desconocido']).default('activo'),
  observaciones: z.string().optional(),
});

const medicalNoteSchema = z.object({
  tipoNota: z.enum(['antecedente', 'alergia', 'limitacion', 'observacion', 'otro']).default('observacion'),
  contenido: z.string().min(1, 'El contenido no puede estar vacio'),
});

const updatePathologySchema = pathologySchema.partial();
const updateMedicationSchema = medicationSchema.partial();

// ── Row interfaces ─────────────────────────────────────────────────────────

interface AccessRow extends RowDataPacket {
  id_adulto_mayor: number;
}

interface PathologyRow extends RowDataPacket {
  id_patologia_adulto_mayor: number;
  id_adulto_mayor: number;
  nombre: string;
  descripcion: string | null;
  fecha_diagnostico: string | null;
  estado: string;
  registrado_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

interface MedicationRow extends RowDataPacket {
  id_medicamento_adulto_mayor: number;
  id_adulto_mayor: number;
  nombre: string;
  dosis: string | null;
  frecuencia: string | null;
  via_administracion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  observaciones: string | null;
  registrado_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

interface MedicalNoteRow extends RowDataPacket {
  id_nota_historial_medico: number;
  id_adulto_mayor: number;
  tipo_nota: string;
  contenido: string;
  registrado_por: number | null;
  creado_en: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function mapPathology(row: PathologyRow) {
  return {
    idPatologiaAdultoMayor: row.id_patologia_adulto_mayor,
    idAdultoMayor: row.id_adulto_mayor,
    nombre: row.nombre,
    descripcion: row.descripcion,
    fechaDiagnostico: row.fecha_diagnostico,
    estado: row.estado,
    registradoPor: row.registrado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function mapMedication(row: MedicationRow) {
  return {
    idMedicamentoAdultoMayor: row.id_medicamento_adulto_mayor,
    idAdultoMayor: row.id_adulto_mayor,
    nombre: row.nombre,
    dosis: row.dosis,
    frecuencia: row.frecuencia,
    viaAdministracion: row.via_administracion,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    estado: row.estado,
    observaciones: row.observaciones,
    registradoPor: row.registrado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function mapMedicalNote(row: MedicalNoteRow) {
  return {
    idNotaHistorialMedico: row.id_nota_historial_medico,
    idAdultoMayor: row.id_adulto_mayor,
    tipoNota: row.tipo_nota,
    contenido: row.contenido,
    registradoPor: row.registrado_por,
    creadoEn: row.creado_en,
  };
}

// ── Route registration ─────────────────────────────────────────────────────

export async function registerMedicalHistoryRoutes(app: FastifyInstance): Promise<void> {
  //
  // PATHOLOGIES
  //

  // GET /older-adults/:id/pathologies
  app.get('/older-adults/:id/pathologies', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<PathologyRow[]>(
      `select *
       from patologia_adulto_mayor
       where id_adulto_mayor = :idAdultoMayor
       order by estado, creado_en desc`,
      { idAdultoMayor: params.id },
    );

    return rows.map(mapPathology);
  });

  // POST /older-adults/:id/pathologies
  app.post('/older-adults/:id/pathologies', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = pathologySchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores registran patologias');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into patologia_adulto_mayor
          (id_adulto_mayor, nombre, descripcion, fecha_diagnostico, estado, registrado_por)
         values
          (:idAdultoMayor, :nombre, :descripcion, :fechaDiagnostico, :estado, :registradoPor)`,
        {
          idAdultoMayor: params.id,
          nombre: body.nombre,
          descripcion: body.descripcion ?? null,
          fechaDiagnostico: body.fechaDiagnostico ?? null,
          estado: body.estado,
          registradoPor: actor.idUsuario,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'patologia_adulto_mayor',
        registroId: insertResult.insertId,
        accion: 'crear',
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await insertAccessAudit(connection, {
        idUsuario: actor.idUsuario,
        idAdultoMayor: params.id,
        tipoDato: 'clinico',
        accion: 'consultar',
        resultado: 'permitido',
        motivo: 'Registro de patologia',
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return {
        idPatologiaAdultoMayor: insertResult.insertId,
        idAdultoMayor: params.id,
        ...body,
        registradoPor: actor.idUsuario,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // PATCH /older-adults/:id/pathologies/:pathologyId
  app.patch('/older-adults/:id/pathologies/:pathologyId', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({
      id: z.coerce.number().int().positive(),
      pathologyId: z.coerce.number().int().positive(),
    }).parse(request.params);
    const body = updatePathologySchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores modifican patologias');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query<PathologyRow[]>(
        `select * from patologia_adulto_mayor
         where id_patologia_adulto_mayor = :pathologyId and id_adulto_mayor = :idAdultoMayor
         limit 1`,
        { pathologyId: params.pathologyId, idAdultoMayor: params.id },
      );

      const existing = existingRows[0];
      if (!existing) throw notFound('Patologia no encontrada');

      const updates: string[] = [];
      const vals: Record<string, unknown> = { id: params.pathologyId };
      if (body.nombre !== undefined) { updates.push('nombre = :nombre'); vals.nombre = body.nombre; }
      if (body.descripcion !== undefined) { updates.push('descripcion = :descripcion'); vals.descripcion = body.descripcion; }
      if (body.fechaDiagnostico !== undefined) { updates.push('fecha_diagnostico = :fechaDiagnostico'); vals.fechaDiagnostico = body.fechaDiagnostico; }
      if (body.estado !== undefined) { updates.push('estado = :estado'); vals.estado = body.estado; }

      if (updates.length > 0) {
        await connection.query(
          `update patologia_adulto_mayor set ${updates.join(', ')} where id_patologia_adulto_mayor = :id`,
          vals,
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'patologia_adulto_mayor',
        registroId: params.pathologyId,
        accion: 'actualizar',
        anteriores: existing,
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { ok: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // DELETE /older-adults/:id/pathologies/:pathologyId
  app.delete('/older-adults/:id/pathologies/:pathologyId', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({
      id: z.coerce.number().int().positive(),
      pathologyId: z.coerce.number().int().positive(),
    }).parse(request.params);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores eliminan patologias');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [result] = await pool.query<ResultSetHeader>(
      `delete from patologia_adulto_mayor
       where id_patologia_adulto_mayor = :pathologyId and id_adulto_mayor = :idAdultoMayor`,
      { pathologyId: params.pathologyId, idAdultoMayor: params.id },
    );

    if (result.affectedRows === 0) throw notFound('Patologia no encontrada');

    return { ok: true };
  });

  //
  // MEDICATIONS
  //

  // GET /older-adults/:id/medications
  app.get('/older-adults/:id/medications', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<MedicationRow[]>(
      `select *
       from medicamento_adulto_mayor
       where id_adulto_mayor = :idAdultoMayor
       order by estado, creado_en desc`,
      { idAdultoMayor: params.id },
    );

    return rows.map(mapMedication);
  });

  // POST /older-adults/:id/medications
  app.post('/older-adults/:id/medications', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = medicationSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores registran medicamentos');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.query<ResultSetHeader>(
        `insert into medicamento_adulto_mayor
          (id_adulto_mayor, nombre, dosis, frecuencia, via_administracion,
           fecha_inicio, fecha_fin, estado, observaciones, registrado_por)
         values
          (:idAdultoMayor, :nombre, :dosis, :frecuencia, :viaAdministracion,
           :fechaInicio, :fechaFin, :estado, :observaciones, :registradoPor)`,
        {
          idAdultoMayor: params.id,
          nombre: body.nombre,
          dosis: body.dosis ?? null,
          frecuencia: body.frecuencia ?? null,
          viaAdministracion: body.viaAdministracion ?? null,
          fechaInicio: body.fechaInicio ?? null,
          fechaFin: body.fechaFin ?? null,
          estado: body.estado,
          observaciones: body.observaciones ?? null,
          registradoPor: actor.idUsuario,
        },
      );

      await insertChangeAudit(connection, {
        tabla: 'medicamento_adulto_mayor',
        registroId: insertResult.insertId,
        accion: 'crear',
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await insertAccessAudit(connection, {
        idUsuario: actor.idUsuario,
        idAdultoMayor: params.id,
        tipoDato: 'clinico',
        accion: 'consultar',
        resultado: 'permitido',
        motivo: 'Registro de medicamento',
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return {
        idMedicamentoAdultoMayor: insertResult.insertId,
        idAdultoMayor: params.id,
        ...body,
        registradoPor: actor.idUsuario,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // PATCH /older-adults/:id/medications/:medicationId
  app.patch('/older-adults/:id/medications/:medicationId', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({
      id: z.coerce.number().int().positive(),
      medicationId: z.coerce.number().int().positive(),
    }).parse(request.params);
    const body = updateMedicationSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores modifican medicamentos');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query<MedicationRow[]>(
        `select * from medicamento_adulto_mayor
         where id_medicamento_adulto_mayor = :medicationId and id_adulto_mayor = :idAdultoMayor
         limit 1`,
        { medicationId: params.medicationId, idAdultoMayor: params.id },
      );

      const existing = existingRows[0];
      if (!existing) throw notFound('Medicamento no encontrado');

      const updates: string[] = [];
      const vals: Record<string, unknown> = { id: params.medicationId };
      if (body.nombre !== undefined) { updates.push('nombre = :nombre'); vals.nombre = body.nombre; }
      if (body.dosis !== undefined) { updates.push('dosis = :dosis'); vals.dosis = body.dosis; }
      if (body.frecuencia !== undefined) { updates.push('frecuencia = :frecuencia'); vals.frecuencia = body.frecuencia; }
      if (body.viaAdministracion !== undefined) { updates.push('via_administracion = :viaAdministracion'); vals.viaAdministracion = body.viaAdministracion; }
      if (body.fechaInicio !== undefined) { updates.push('fecha_inicio = :fechaInicio'); vals.fechaInicio = body.fechaInicio; }
      if (body.fechaFin !== undefined) { updates.push('fecha_fin = :fechaFin'); vals.fechaFin = body.fechaFin; }
      if (body.estado !== undefined) { updates.push('estado = :estado'); vals.estado = body.estado; }
      if (body.observaciones !== undefined) { updates.push('observaciones = :observaciones'); vals.observaciones = body.observaciones; }

      if (updates.length > 0) {
        await connection.query(
          `update medicamento_adulto_mayor set ${updates.join(', ')} where id_medicamento_adulto_mayor = :id`,
          vals,
        );
      }

      await insertChangeAudit(connection, {
        tabla: 'medicamento_adulto_mayor',
        registroId: params.medicationId,
        accion: 'actualizar',
        anteriores: existing,
        nuevos: body,
        context: {
          userId: actor.idUsuario,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      });

      await connection.commit();
      return { ok: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // DELETE /older-adults/:id/medications/:medicationId
  app.delete('/older-adults/:id/medications/:medicationId', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({
      id: z.coerce.number().int().positive(),
      medicationId: z.coerce.number().int().positive(),
    }).parse(request.params);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores eliminan medicamentos');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [result] = await pool.query<ResultSetHeader>(
      `delete from medicamento_adulto_mayor
       where id_medicamento_adulto_mayor = :medicationId and id_adulto_mayor = :idAdultoMayor`,
      { medicationId: params.medicationId, idAdultoMayor: params.id },
    );

    if (result.affectedRows === 0) throw notFound('Medicamento no encontrado');

    return { ok: true };
  });

  //
  // MEDICAL NOTES
  //

  // GET /older-adults/:id/medical-notes
  app.get('/older-adults/:id/medical-notes', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [rows] = await pool.query<MedicalNoteRow[]>(
      `select id_nota_historial_medico, id_adulto_mayor, tipo_nota, contenido, registrado_por, creado_en
       from nota_historial_medico
       where id_adulto_mayor = :idAdultoMayor
       order by creado_en desc`,
      { idAdultoMayor: params.id },
    );

    return rows.map(mapMedicalNote);
  });

  // POST /older-adults/:id/medical-notes
  app.post('/older-adults/:id/medical-notes', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = medicalNoteSchema.parse(request.body);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores registran notas medicas');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [insertResult] = await pool.query<ResultSetHeader>(
      `insert into nota_historial_medico
        (id_adulto_mayor, tipo_nota, contenido, registrado_por)
       values
        (:idAdultoMayor, :tipoNota, :contenido, :registradoPor)`,
      {
        idAdultoMayor: params.id,
        tipoNota: body.tipoNota,
        contenido: body.contenido,
        registradoPor: actor.idUsuario,
      },
    );

    return {
      idNotaHistorialMedico: insertResult.insertId,
      idAdultoMayor: params.id,
      ...body,
      registradoPor: actor.idUsuario,
    };
  });

  // DELETE /older-adults/:id/medical-notes/:noteId
  app.delete('/older-adults/:id/medical-notes/:noteId', { preHandler: requireAuth(app) }, async (request) => {
    const actor = request.authUser!;
    const params = z.object({
      id: z.coerce.number().int().positive(),
      noteId: z.coerce.number().int().positive(),
    }).parse(request.params);

    if (actor.rol === 'cuidador') {
      throw forbidden('Solo profesionales o administradores eliminan notas medicas');
    }
    await assertCanAccessOlderAdult(params.id, actor.idUsuario, actor.rol);

    const [result] = await pool.query<ResultSetHeader>(
      `delete from nota_historial_medico
       where id_nota_historial_medico = :noteId and id_adulto_mayor = :idAdultoMayor`,
      { noteId: params.noteId, idAdultoMayor: params.id },
    );

    if (result.affectedRows === 0) throw notFound('Nota medica no encontrada');

    return { ok: true };
  });
}
