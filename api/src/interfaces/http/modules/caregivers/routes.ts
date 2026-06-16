import type { FastifyInstance } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../../../../infrastructure/db/pool.js';
import { notFound } from '../../httpErrors.js';
import { requireRoles } from '../../requireAuth.js';

interface CaregiverRow extends RowDataPacket {
  id_usuario: number;
  correo: string;
  estado: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  ciudad: string | null;
  creado_en: string;
  ultimo_acceso_en: string | null;
  cantidad_pacientes: number;
  pacientes_con_plan_activo: number;
  cumplimiento_semanal_promedio: number;
}

interface PatientRow extends RowDataPacket {
  id_adulto_mayor: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  tiene_plan_activo: number;
  tiene_alerta: number;
  cantidad_baterias: number;
}

function mapCaregiver(row: CaregiverRow) {
  return {
    idUsuario: row.id_usuario,
    correo: row.correo,
    estado: row.estado,
    nombres: row.nombres,
    apellidos: row.apellidos,
    telefono: row.telefono,
    ciudad: row.ciudad,
    creadoEn: row.creado_en,
    ultimoAccesoEn: row.ultimo_acceso_en,
    cantidadPacientes: row.cantidad_pacientes,
    pacientesConPlanActivo: row.pacientes_con_plan_activo,
    cumplimientoSemanalPromedio: row.cumplimiento_semanal_promedio,
  };
}

function mapPatient(row: PatientRow & { cumplimiento_semanal?: number }) {
  return {
    idAdultoMayor: row.id_adulto_mayor,
    nombres: row.nombres,
    apellidos: row.apellidos,
    fechaNacimiento: row.fecha_nacimiento,
    genero: row.genero,
    tienePlanActivo: Boolean(row.tiene_plan_activo),
    cumplimientoSemanal: row.cumplimiento_semanal ?? 0,
    tieneAlertaActiva: Boolean(row.tiene_alerta),
    cantidadBaterias: row.cantidad_baterias,
  };
}

export async function registerCaregiverRoutes(app: FastifyInstance): Promise<void> {
  const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

  app.get('/caregivers', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const search = (request.query as Record<string, string>).search?.trim() ?? '';

    let searchFilter = '';
    const params: Record<string, string | number> = {
      actorRol: actor.rol,
      actorId: actor.idUsuario,
    };

    if (search.length >= 2) {
      searchFilter = `and (
        lower(p.nombres) like :search
        or lower(p.apellidos) like :search
        or lower(u.correo) like :search
      )`;
      params.search = `%${search.toLowerCase()}%`;
    }

    const [rows] = await pool.query<CaregiverRow[]>(
      `select
        u.id_usuario,
        u.correo,
        u.estado,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.ciudad,
        u.creado_en,
        u.ultimo_acceso_en,
        coalesce(pac.cantidad_pacientes, 0) as cantidad_pacientes,
        coalesce(plan_stats.pacientes_con_plan_activo, 0) as pacientes_con_plan_activo,
        coalesce(comp.cumplimiento_semanal_promedio, 0) as cumplimiento_semanal_promedio
      from usuario u
      inner join perfil_usuario p on p.id_usuario = u.id_usuario
      inner join profesional_cuidador pc
        on pc.id_cuidador = u.id_usuario and pc.estado = 'activa'
      left join (
        select id_cuidador, count(distinct id_adulto_mayor) as cantidad_pacientes
        from asignacion_cuidador_adulto_mayor
        where estado = 'activa'
        group by id_cuidador
      ) pac on pac.id_cuidador = u.id_usuario
      left join (
        select ac.id_cuidador, count(distinct ac.id_adulto_mayor) as pacientes_con_plan_activo
        from asignacion_cuidador_adulto_mayor ac
        where ac.estado = 'activa'
          and exists (
            select 1 from plan_ejercicio pe
            where pe.id_adulto_mayor = ac.id_adulto_mayor and pe.estado = 'activo'
          )
        group by ac.id_cuidador
      ) plan_stats on plan_stats.id_cuidador = u.id_usuario
      left join (
        select
          ac.id_cuidador,
          avg(comp_per_patient.ratio) as cumplimiento_semanal_promedio
        from asignacion_cuidador_adulto_mayor ac
        inner join (
          select
            pe.id_adulto_mayor,
            avg(case when rep.estado = 'completado' then 1.0 else 0 end) as ratio
          from ejercicio_plan ep
          inner join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
          left join registro_ejercicio_plan rep
            on rep.id_ejercicio_plan = ep.id_ejercicio_plan
            and rep.fecha_programada >= date_sub(current_date(), interval 7 day)
          group by pe.id_adulto_mayor
        ) comp_per_patient on comp_per_patient.id_adulto_mayor = ac.id_adulto_mayor
        where ac.estado = 'activa'
        group by ac.id_cuidador
      ) comp on comp.id_cuidador = u.id_usuario
      where u.rol = 'cuidador' and u.estado = 'activo'
        and (:actorRol = 'administrador' or pc.id_profesional = :actorId)
        ${searchFilter}
      order by p.apellidos, p.nombres`,
      params,
    );

    return rows.map(mapCaregiver);
  });

  app.get('/caregivers/:id', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const actor = request.authUser!;
    const { id } = paramsSchema.parse(request.params);

    const [caregiverRows] = await pool.query<CaregiverRow[]>(
      `select
        u.id_usuario,
        u.correo,
        u.estado,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.ciudad,
        u.creado_en,
        u.ultimo_acceso_en
      from usuario u
      inner join perfil_usuario p on p.id_usuario = u.id_usuario
      where u.id_usuario = :id and u.rol = 'cuidador' and u.estado = 'activo'`,
      { id },
    );

    const caregiver = caregiverRows[0];
    if (!caregiver) throw notFound('Cuidador no encontrado');

    const [patientRows] = await pool.query<PatientRow[]>(
      `select
        am.id_adulto_mayor,
        am.nombres,
        am.apellidos,
        am.fecha_nacimiento,
        am.genero,
        case when pe.id_plan_ejercicio is not null then 1 else 0 end as tiene_plan_activo,
        coalesce(
          (select 1 from alerta_programada ap
           where ap.id_adulto_mayor = am.id_adulto_mayor and ap.estado = 'pendiente'
           limit 1),
          0
        ) as tiene_alerta,
        coalesce(
          (select count(distinct ap2.id_aplicacion_sft)
           from aplicacion_sft ap2
           where ap2.id_adulto_mayor = am.id_adulto_mayor),
          0
        ) as cantidad_baterias
      from asignacion_cuidador_adulto_mayor ac
      inner join adulto_mayor am on am.id_adulto_mayor = ac.id_adulto_mayor
      left join plan_ejercicio pe
        on pe.id_adulto_mayor = am.id_adulto_mayor and pe.estado = 'activo'
      where ac.id_cuidador = :id and ac.estado = 'activa'
      order by am.apellidos, am.nombres`,
      { id },
    );

    const patientIds = patientRows.map((r) => r.id_adulto_mayor);

    let complianceMap: Record<number, number> = {};
    if (patientIds.length > 0) {
      const [compRows] = await pool.query<RowDataPacket[]>(
        `select
          pe.id_adulto_mayor,
          avg(case when rep.estado = 'completado' then 1.0 else 0 end) as ratio
        from ejercicio_plan ep
        inner join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
        left join registro_ejercicio_plan rep
          on rep.id_ejercicio_plan = ep.id_ejercicio_plan
          and rep.fecha_programada >= date_sub(current_date(), interval 7 day)
        where pe.id_adulto_mayor in (:patientIds)
        group by pe.id_adulto_mayor`,
        { patientIds },
      );
      for (const row of compRows) {
        complianceMap[row.id_adulto_mayor] = row.ratio;
      }
    }

    const patients = patientRows.map((row) => mapPatient({
      ...row,
      cumplimiento_semanal: complianceMap[row.id_adulto_mayor] ?? 0,
    }));

    return {
      ...mapCaregiver(caregiver),
      cantidadPacientes: patients.length,
      pacientesConPlanActivo: patients.filter((p) => p.tienePlanActivo).length,
      cumplimientoSemanalPromedio: patients.length > 0
        ? patients.reduce((sum, p) => sum + p.cumplimientoSemanal, 0) / patients.length
        : 0,
      pacientes: patients,
    };
  });

  app.get('/caregivers/:id/patients', { preHandler: requireRoles(app, ['administrador', 'profesional']) }, async (request) => {
    const { id } = paramsSchema.parse(request.params);

    const [patientRows] = await pool.query<PatientRow[]>(
      `select
        am.id_adulto_mayor,
        am.nombres,
        am.apellidos,
        am.fecha_nacimiento,
        am.genero,
        case when pe.id_plan_ejercicio is not null then 1 else 0 end as tiene_plan_activo,
        coalesce(
          (select 1 from alerta_programada ap
           where ap.id_adulto_mayor = am.id_adulto_mayor and ap.estado = 'pendiente'
           limit 1),
          0
        ) as tiene_alerta,
        coalesce(
          (select count(distinct ap2.id_aplicacion_sft)
           from aplicacion_sft ap2
           where ap2.id_adulto_mayor = am.id_adulto_mayor),
          0
        ) as cantidad_baterias
      from asignacion_cuidador_adulto_mayor ac
      inner join adulto_mayor am on am.id_adulto_mayor = ac.id_adulto_mayor
      left join plan_ejercicio pe
        on pe.id_adulto_mayor = am.id_adulto_mayor and pe.estado = 'activo'
      where ac.id_cuidador = :id and ac.estado = 'activa'
      order by am.apellidos, am.nombres`,
      { id },
    );

    const patientIds = patientRows.map((r) => r.id_adulto_mayor);

    let complianceMap: Record<number, number> = {};
    if (patientIds.length > 0) {
      const [compRows] = await pool.query<RowDataPacket[]>(
        `select
          pe.id_adulto_mayor,
          avg(case when rep.estado = 'completado' then 1.0 else 0 end) as ratio
        from ejercicio_plan ep
        inner join plan_ejercicio pe on pe.id_plan_ejercicio = ep.id_plan_ejercicio
        left join registro_ejercicio_plan rep
          on rep.id_ejercicio_plan = ep.id_ejercicio_plan
          and rep.fecha_programada >= date_sub(current_date(), interval 7 day)
        where pe.id_adulto_mayor in (:patientIds)
        group by pe.id_adulto_mayor`,
        { patientIds },
      );
      for (const row of compRows) {
        complianceMap[row.id_adulto_mayor] = row.ratio;
      }
    }

    return patientRows.map((row) => mapPatient({
      ...row,
      cumplimiento_semanal: complianceMap[row.id_adulto_mayor] ?? 0,
    }));
  });
}
