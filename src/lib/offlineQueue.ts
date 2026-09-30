import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { generateUUID, getDatabase } from './sqlite';

export type OfflineEntity =
    | 'adulto_mayor' | 'registro_ejercicio_plan'
    | 'patologia_adulto_mayor' | 'medicamento_adulto_mayor' | 'nota_historial_medico'
    | 'aplicacion_sft';

export type OfflineAction = 'crear' | 'actualizar';
export type OfflineEstado = 'pendiente' | 'aplicada' | 'conflicto' | 'rechazada';

export interface OfflineOperation {
    idLocal: string;
    entidad: OfflineEntity;
    accion: OfflineAction;
    payload: Record<string, unknown>;
    creadoEnLocal: string;
    estado: OfflineEstado;
    idRemoto: number | null;
    detalle: string | null;
}

const WEB_QUEUE_KEY = 'tybacha_offline_queue';

interface OfflineQueueRow {
    id_local: string;
    entidad: OfflineEntity;
    accion: OfflineAction;
    payload: string;
    creado_en_local: string;
    estado: OfflineEstado;
    id_remoto: number | null;
    detalle: string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePayload(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
        try {
            const parsed: unknown = JSON.parse(value);
            return isPlainObject(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return isPlainObject(value) ? value : {};
}

function normalizeDetalle(value: unknown): string | null {
    if (value == null || value === 'null' || value === '') return null;
    if (typeof value !== 'string') {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (parsed == null) return null;
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch {
        return value;
    }
}

function serializeDetalle(detalle: unknown): string | null {
    if (detalle == null) return null;
    if (typeof detalle === 'string') return detalle;
    return JSON.stringify(detalle);
}

function mapRow(row: OfflineQueueRow): OfflineOperation {
    return {
        idLocal: row.id_local,
        entidad: row.entidad,
        accion: row.accion,
        payload: normalizePayload(row.payload),
        creadoEnLocal: row.creado_en_local,
        estado: row.estado,
        idRemoto: row.id_remoto ?? null,
        detalle: normalizeDetalle(row.detalle),
    };
}

function normalizeStoredOperation(value: unknown): OfflineOperation | null {
    if (!isPlainObject(value) || typeof value.idLocal !== 'string') return null;
    return {
        idLocal: value.idLocal,
        entidad: value.entidad as OfflineEntity,
        accion: value.accion as OfflineAction,
        payload: normalizePayload(value.payload),
        creadoEnLocal: typeof value.creadoEnLocal === 'string' ? value.creadoEnLocal : '',
        estado: typeof value.estado === 'string' ? (value.estado as OfflineEstado) : 'pendiente',
        idRemoto: typeof value.idRemoto === 'number' ? value.idRemoto : null,
        detalle: normalizeDetalle(value.detalle),
    };
}

/** En web no hay SQLite: la cola vive en AsyncStorage (localStorage) como JSON. */
async function readWebQueue(): Promise<OfflineOperation[]> {
    const raw = await AsyncStorage.getItem(WEB_QUEUE_KEY);
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeStoredOperation)
            .filter((operation): operation is OfflineOperation => operation !== null);
    } catch {
        return [];
    }
}

async function writeWebQueue(operations: OfflineOperation[]): Promise<void> {
    await AsyncStorage.setItem(WEB_QUEUE_KEY, JSON.stringify(operations));
}

/** Encola una operacion pendiente de sincronizacion y devuelve su id local.
 *  `idLocal` opcional permite reutilizar una clave de idempotencia ya
 *  enviada al servidor (p. ej. el id de la sesion de bateria). */
export async function enqueueOfflineOperation(
    entidad: OfflineEntity,
    accion: OfflineAction,
    payload: Record<string, unknown>,
    idLocal?: string,
): Promise<string> {
    const operationId = idLocal ?? generateUUID();
    const creadoEnLocal = new Date().toISOString();

    if (Platform.OS === 'web') {
        const operations = await readWebQueue();
        const record: OfflineOperation = {
            idLocal: operationId,
            entidad,
            accion,
            payload,
            creadoEnLocal,
            estado: 'pendiente',
            idRemoto: null,
            detalle: null,
        };
        const existingIndex = operations.findIndex((item) => item.idLocal === operationId);
        if (existingIndex >= 0) {
            // Reintento de la misma sesión: reemplaza sin duplicar.
            operations[existingIndex] = record;
        } else {
            operations.push(record);
        }
        await writeWebQueue(operations);
        return operationId;
    }

    const database = await getDatabase();
    if (database) {
        await database.runAsync(
            `INSERT OR REPLACE INTO offline_operation_queue
              (id_local, entidad, accion, payload, creado_en_local)
             VALUES (?, ?, ?, ?, ?)`,
            [operationId, entidad, accion, JSON.stringify(payload), creadoEnLocal],
        );
    }
    return operationId;
}

/** Devuelve las operaciones pendientes, ordenadas por fecha de creacion. */
export async function listPendingOfflineOperations(): Promise<OfflineOperation[]> {
    if (Platform.OS === 'web') {
        return (await readWebQueue())
            .filter((operation) => operation.estado === 'pendiente')
            .sort((a, b) => a.creadoEnLocal.localeCompare(b.creadoEnLocal));
    }

    const database = await getDatabase();
    if (!database) return [];
    const rows = await database.getAllAsync<OfflineQueueRow>(
        `SELECT id_local, entidad, accion, payload, creado_en_local, estado, id_remoto, detalle
         FROM offline_operation_queue
         WHERE estado = 'pendiente'
         ORDER BY creado_en_local ASC`,
    );
    return rows.map(mapRow);
}

/** Registra el resultado de sincronizar una operacion. */
export async function markOfflineOperationResult(
    idLocal: string,
    estado: OfflineEstado,
    idRemoto: number | null,
    detalle: unknown,
): Promise<void> {
    const storedDetalle = serializeDetalle(detalle);

    if (Platform.OS === 'web') {
        const operations = await readWebQueue();
        const operation = operations.find((item) => item.idLocal === idLocal);
        if (!operation) return;
        operation.estado = estado;
        operation.idRemoto = idRemoto;
        operation.detalle = storedDetalle;
        await writeWebQueue(operations);
        return;
    }

    const database = await getDatabase();
    if (!database) return;
    await database.runAsync(
        `UPDATE offline_operation_queue
         SET estado = ?, id_remoto = ?, detalle = ?
         WHERE id_local = ?`,
        [estado, idRemoto, storedDetalle, idLocal],
    );
}
