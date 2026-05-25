import type { PoolConnection } from 'mysql2/promise';

export interface AuditContext {
  userId?: number | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function insertChangeAudit(
  connection: PoolConnection,
  input: {
    tabla: string;
    registroId: number;
    accion: 'crear' | 'actualizar' | 'inactivar' | 'reactivar' | 'eliminar';
    anteriores?: unknown;
    nuevos?: unknown;
    context: AuditContext;
  },
): Promise<void> {
  await connection.query(
    `insert into auditoria_cambio
      (tabla_afectada, id_registro_afectado, accion, valores_anteriores, valores_nuevos, realizado_por, direccion_ip, agente_usuario)
     values
      (:tabla, :registroId, :accion, :anteriores, :nuevos, :realizadoPor, :ip, :userAgent)`,
    {
      tabla: input.tabla,
      registroId: input.registroId,
      accion: input.accion,
      anteriores: input.anteriores ? JSON.stringify(input.anteriores) : null,
      nuevos: input.nuevos ? JSON.stringify(input.nuevos) : null,
      realizadoPor: input.context.userId ?? null,
      ip: input.context.ip ?? null,
      userAgent: input.context.userAgent ?? null,
    },
  );
}

export async function insertAccessAudit(
  connection: PoolConnection,
  input: {
    idUsuario?: number | null;
    idAdultoMayor?: number | null;
    tipoDato: 'personal' | 'clinico' | 'sft' | 'plan' | 'reporte' | 'otro';
    accion: 'consultar' | 'exportar' | 'descargar' | 'compartir';
    resultado: 'permitido' | 'denegado';
    motivo?: string | null;
    context: AuditContext;
  },
): Promise<void> {
  await connection.query(
    `insert into auditoria_acceso_dato
      (id_usuario, id_adulto_mayor, tipo_dato, accion, resultado, motivo, direccion_ip, agente_usuario)
     values
      (:idUsuario, :idAdultoMayor, :tipoDato, :accion, :resultado, :motivo, :ip, :userAgent)`,
    {
      idUsuario: input.idUsuario ?? input.context.userId ?? null,
      idAdultoMayor: input.idAdultoMayor ?? null,
      tipoDato: input.tipoDato,
      accion: input.accion,
      resultado: input.resultado,
      motivo: input.motivo ?? null,
      ip: input.context.ip ?? null,
      userAgent: input.context.userAgent ?? null,
    },
  );
}

export async function insertAccessAuditWithPool(
  getConnection: () => Promise<PoolConnection>,
  input: Parameters<typeof insertAccessAudit>[1],
): Promise<void> {
  const connection = await getConnection();
  try {
    await insertAccessAudit(connection, input);
  } finally {
    connection.release();
  }
}

