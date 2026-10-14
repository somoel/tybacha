import { beforeEach, describe, expect, it } from 'vitest';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useAuthStore } from '@/src/stores/authStore';

const store = () => useBatteryStore.getState();

describe('batteryStore', () => {
    beforeEach(() => {
        store().clearSession();
        useAuthStore.getState().setUser(null);
    });

    describe('startBattery', () => {
        it('crea una sesión nueva con id y paciente', () => {
            store().startBattery('42');

            expect(store().activeBatteryId).toMatch(/^[0-9a-f-]{36}$/);
            expect(store().patientId).toBe('42');
            expect(store().completedTests).toEqual([]);
            expect(store().results).toEqual({});
        });

        it('captura el profesional que abre la batería', () => {
            useAuthStore.getState().setUser({
                id: '7',
                email: 'doc@x.com',
                correo: 'doc@x.com',
                role: 'profesional',
            } as never);

            store().startBattery('42');
            expect(store().ownerUserId).toBe('7');
        });

        it('limpia resultados, notas y métricas de la sesión anterior', () => {
            store().startBattery('1');
            store().saveResult('chair_stand', 12, 'ok');
            store().setNotes('nota previa');
            store().setBodyMetrics(70, 170);

            store().startBattery('2');

            expect(store().results).toEqual({});
            expect(store().resultNotes).toEqual({});
            expect(store().completedTests).toEqual([]);
            expect(store().notes).toBe('');
            expect(store().pesoKg).toBeNull();
            expect(store().estaturaCm).toBeNull();
            expect(store().imc).toBeNull();
            expect(store().patientId).toBe('2');
        });
    });

    describe('saveResult', () => {
        beforeEach(() => store().startBattery('1'));

        it('guarda el resultado y marca la prueba como completada', () => {
            store().saveResult('chair_stand', 14);

            expect(store().results.chair_stand).toBe(14);
            expect(store().completedTests).toEqual(['chair_stand']);
        });

        it('no duplica la prueba en completedTests al sobrescribir', () => {
            store().saveResult('chair_stand', 14);
            store().saveResult('chair_stand', 15);
            store().saveResult('chair_stand', 16);

            expect(store().completedTests).toEqual(['chair_stand']);
            expect(store().results.chair_stand).toBe(16);
        });

        it('acumula varias pruebas manteniendo el orden de registro', () => {
            store().saveResult('chair_stand', 14);
            store().saveResult('up_and_go', 5.4);
            store().saveResult('arm_curl', 18);

            expect(store().completedTests).toEqual(['chair_stand', 'up_and_go', 'arm_curl']);
        });

        it('guarda la nota solo cuando se pasa', () => {
            store().saveResult('chair_stand', 14, 'dolor leve');
            store().saveResult('arm_curl', 18);

            expect(store().resultNotes.chair_stand).toBe('dolor leve');
            expect(store().resultNotes.arm_curl).toBeUndefined();
        });

        it('permite sobrescribir la nota', () => {
            store().saveResult('chair_stand', 14, 'primera');
            store().saveResult('chair_stand', 14, 'segunda');
            expect(store().resultNotes.chair_stand).toBe('segunda');
        });

        it('acepta valores negativos (flexibilidad)', () => {
            store().saveResult('chair_sit_reach', -3.5);
            expect(store().results.chair_sit_reach).toBe(-3.5);
            expect(store().completedTests).toContain('chair_sit_reach');
        });

        it('acepta cero', () => {
            store().saveResult('back_scratch', 0);
            expect(store().results.back_scratch).toBe(0);
        });
    });

    describe('setBodyMetrics', () => {
        it('calcula el IMC con dos decimales', () => {
            store().setBodyMetrics(70, 170);
            expect(store().imc).toBe(24.22);
            expect(store().pesoKg).toBe(70);
            expect(store().estaturaCm).toBe(170);
        });

        it('redondea correctamente casos borde', () => {
            store().setBodyMetrics(60, 150);
            expect(store().imc).toBe(26.67);
        });

        it('soporta una persona de 1,60 m y 57 kg', () => {
            store().setBodyMetrics(57, 160);
            expect(store().imc).toBe(22.27);
        });
    });

    describe('setNotes / setLoading', () => {
        it('actualiza las notas generales', () => {
            store().setNotes('observación global');
            expect(store().notes).toBe('observación global');
        });

        it('actualiza el flag de carga', () => {
            store().setLoading(true);
            expect(store().isLoading).toBe(true);
            store().setLoading(false);
            expect(store().isLoading).toBe(false);
        });
    });

    describe('clearSession / resetBattery', () => {
        it('vacía por completo la sesión', () => {
            store().startBattery('9');
            store().saveResult('arm_curl', 20, 'nota');
            store().setNotes('x');
            store().setBodyMetrics(80, 180);

            store().clearSession();

            expect(store()).toMatchObject({
                activeBatteryId: null,
                patientId: null,
                results: {},
                resultNotes: {},
                completedTests: [],
                notes: '',
                pesoKg: null,
                estaturaCm: null,
                imc: null,
                isLoading: false,
                ownerUserId: null,
            });
        });

        it('resetBattery deja el mismo estado inicial que clearSession', () => {
            store().startBattery('9');
            store().saveResult('arm_curl', 20);
            store().resetBattery();

            expect(store().activeBatteryId).toBeNull();
            expect(store().results).toEqual({});
            expect(store().completedTests).toEqual([]);
        });
    });
});
