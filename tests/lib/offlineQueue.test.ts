import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    enqueueOfflineOperation,
    listPendingOfflineOperations,
    markOfflineOperationResult,
} from '@/src/lib/offlineQueue';
import { Platform } from 'react-native';
import { __dumpOfflineQueue } from '@/tests/mocks/expo-sqlite';

const WEB_KEY = 'tybacha_offline_queue';

function useNative(): void {
    Platform.OS = 'ios';
}

function useWeb(): void {
    Platform.OS = 'web';
}

/** Lee la operación cruda tal y como quedó persistida en la plataforma activa. */
async function readStoredOperation(
    idLocal: string,
): Promise<{ estado: string; idRemoto: number | null; detalle: string | null }> {
    if (Platform.OS === 'web') {
        const raw = await AsyncStorage.getItem(WEB_KEY);
        const rows = JSON.parse(raw ?? '[]') as {
            idLocal: string;
            estado: string;
            idRemoto: number | null;
            detalle: string | null;
        }[];
        return rows.find((row) => row.idLocal === idLocal) as never;
    }

    const row = __dumpOfflineQueue().find((item) => item.id_local === idLocal) as {
        estado: string;
        id_remoto: number | null;
        detalle: string | null;
    };
    // El doble de SQLite guarda el detalle tal cual; al leerlo la cola lo normaliza.
    return { estado: row.estado, idRemoto: row.id_remoto, detalle: row.detalle };
}

describe.each([
    ['nativa (SQLite)', useNative],
    ['web (AsyncStorage)', useWeb],
])('offlineQueue — ruta %s', (_label, setupPlatform) => {
    beforeEach(() => {
        setupPlatform();
    });

    it('encola una operación pendiente y la devuelve al listar', async () => {
        const id = await enqueueOfflineOperation('adulto_mayor', 'crear', { nombres: 'Ana' });

        expect(id).toMatch(/^[0-9a-f-]{36}$/);

        const pending = await listPendingOfflineOperations();
        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
            idLocal: id,
            entidad: 'adulto_mayor',
            accion: 'crear',
            estado: 'pendiente',
            idRemoto: null,
            detalle: null,
        });
        expect(pending[0].payload).toEqual({ nombres: 'Ana' });
        expect(() => Date.parse(pending[0].creadoEnLocal)).not.toThrow();
    });

    it('reutiliza el idLocal pasado (idempotencia de la sesión de batería)', async () => {
        const id = await enqueueOfflineOperation(
            'aplicacion_sft',
            'crear',
            { x: 1 },
            '0f1e2d3c-4b5a-6978-8796-a1b2c3d4e5f6',
        );
        expect(id).toBe('0f1e2d3c-4b5a-6978-8796-a1b2c3d4e5f6');
        expect((await listPendingOfflineOperations())[0].idLocal).toBe(id);
    });

    it('al reintentar con el mismo idLocal no duplica la operación', async () => {
        const id = await enqueueOfflineOperation('adulto_mayor', 'crear', { v: 1 }, 'id-fijo');
        await enqueueOfflineOperation('adulto_mayor', 'crear', { v: 2 }, 'id-fijo');

        const pending = await listPendingOfflineOperations();
        expect(pending).toHaveLength(1);
        expect(pending[0].idLocal).toBe(id);
        expect(pending[0].payload).toEqual({ v: 2 });
    });

    it('devuelve las operaciones ordenadas por creación', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
            const first = await enqueueOfflineOperation('adulto_mayor', 'crear', { n: 1 });
            vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
            const second = await enqueueOfflineOperation('adulto_mayor', 'crear', { n: 2 });

            const pending = await listPendingOfflineOperations();
            expect(pending.map((op) => op.idLocal)).toEqual([first, second]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('marca el resultado y deja de aparecer como pendiente', async () => {
        const id = await enqueueOfflineOperation('adulto_mayor', 'crear', { n: 1 });

        await markOfflineOperationResult(id, 'aplicada', 55, 'ok');

        expect(await listPendingOfflineOperations()).toHaveLength(0);
    });

    it('serializa un detalle no textual como JSON', async () => {
        const id = await enqueueOfflineOperation('adulto_mayor', 'crear', { n: 1 });

        await markOfflineOperationResult(id, 'rechazada', null, { motivo: 'validacion' });

        const stored = await readStoredOperation(id);
        expect(stored.estado).toBe('rechazada');
        expect(stored.idRemoto).toBeNull();
        expect(stored.detalle).toBe(JSON.stringify({ motivo: 'validacion' }));
    });

    it('normaliza detalle "null" y vacío a null al leer', async () => {
        const id = await enqueueOfflineOperation('adulto_mayor', 'crear', { n: 1 });

        // estado 'pendiente' para que siga siendo visible en el listado
        await markOfflineOperationResult(id, 'pendiente', null, 'null');
        expect((await listPendingOfflineOperations())[0].detalle).toBeNull();

        await markOfflineOperationResult(id, 'pendiente', null, '');
        expect((await listPendingOfflineOperations())[0].detalle).toBeNull();

        await markOfflineOperationResult(id, 'pendiente', null, undefined);
        expect((await listPendingOfflineOperations())[0].detalle).toBeNull();
    });

    it('marcar un id inexistente no lanza', async () => {
        await expect(
            markOfflineOperationResult('no-existe', 'aplicada', 1, null),
        ).resolves.toBeUndefined();
    });
});

describe('offlineQueue — ruta web: normalización de datos corruptos', () => {
    beforeEach(() => {
        useWeb();
        (AsyncStorage as unknown as { __reset: () => void }).__reset();
    });

    it('JSON que no es array devuelve lista vacía', async () => {
        await AsyncStorage.setItem(WEB_KEY, '{"no":"es-array"}');
        expect(await listPendingOfflineOperations()).toEqual([]);
    });

    it('JSON inválido devuelve lista vacía', async () => {
        await AsyncStorage.setItem(WEB_KEY, 'no-json');
        expect(await listPendingOfflineOperations()).toEqual([]);
    });

    it('descarta entradas sin idLocal', async () => {
        await AsyncStorage.setItem(
            WEB_KEY,
            JSON.stringify([{ entidad: 'adulto_mayor' }, { idLocal: 'ok', estado: 'pendiente' }]),
        );

        const pending = await listPendingOfflineOperations();
        expect(pending).toHaveLength(1);
        expect(pending[0].idLocal).toBe('ok');
    });

    it('payload corrupto se normaliza a objeto vacío', async () => {
        await AsyncStorage.setItem(
            WEB_KEY,
            JSON.stringify([{ idLocal: 'a', estado: 'pendiente', payload: '%%%no-json%%%' }]),
        );

        const pending = await listPendingOfflineOperations();
        expect(pending[0].payload).toEqual({});
    });

    it('payload guardado como string JSON se parsea', async () => {
        await AsyncStorage.setItem(
            WEB_KEY,
            JSON.stringify([
                { idLocal: 'a', estado: 'pendiente', payload: '{"nombres":"Ana"}' },
            ]),
        );

        const pending = await listPendingOfflineOperations();
        expect(pending[0].payload).toEqual({ nombres: 'Ana' });
    });

    it('estado por defecto es pendiente y el resto de campos se rellenan', async () => {
        await AsyncStorage.setItem(WEB_KEY, JSON.stringify([{ idLocal: 'a' }]));

        const pending = await listPendingOfflineOperations();
        expect(pending[0]).toMatchObject({
            idLocal: 'a',
            estado: 'pendiente',
            idRemoto: null,
            detalle: null,
            creadoEnLocal: '',
        });
    });

    it('solo devuelve las operaciones pendientes', async () => {
        await AsyncStorage.setItem(
            WEB_KEY,
            JSON.stringify([
                { idLocal: 'a', estado: 'aplicada' },
                { idLocal: 'b', estado: 'pendiente' },
                { idLocal: 'c', estado: 'rechazada' },
            ]),
        );

        const pending = await listPendingOfflineOperations();
        expect(pending.map((op) => op.idLocal)).toEqual(['b']);
    });
});
