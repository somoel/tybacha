import { describe, expect, it } from 'vitest';
import { getSectionedPatients } from '@/src/stores/patientsStore';
import type { Patient } from '@/src/types/patient.types';

function patient(id: string): Patient {
    return {
        id,
        first_name: 'Ana',
        second_name: null,
        first_lastname: 'Perez',
        second_lastname: null,
        birth_date: '1960-01-01',
        gender: 'female',
    } as unknown as Patient;
}

describe('getSectionedPatients (RF-10)', () => {
    it('separa sin baterías, sin plan activo y en curso', () => {
        const patients = [patient('1'), patient('2'), patient('3'), patient('4')];

        const sections = getSectionedPatients(
            patients,
            { '1': 0, '2': 2, '3': 1, '4': 0 },
            { '2': false, '3': true, '4': false },
        );

        expect(sections.noBatteries.map((p) => p.id)).toEqual(['1', '4']);
        expect(sections.pendingRecommendation.map((p) => p.id)).toEqual(['2']);
        expect(sections.inProgress.map((p) => p.id)).toEqual(['3']);
    });

    it('trata los metadatos ausentes como "sin baterias" y "sin plan"', () => {
        const sections = getSectionedPatients([patient('9')], {}, {});
        expect(sections.noBatteries.map((p) => p.id)).toEqual(['9']);
        expect(sections.pendingRecommendation).toHaveLength(0);
        expect(sections.inProgress).toHaveLength(0);
    });

    it('no pierde ni duplica pacientes', () => {
        const patients = [patient('a'), patient('b'), patient('c')];
        const sections = getSectionedPatients(
            patients,
            { a: 1, b: 1, c: 1 },
            { a: true, b: true, c: true },
        );

        const ids = [
            ...sections.noBatteries,
            ...sections.pendingRecommendation,
            ...sections.inProgress,
        ].map((p) => p.id);

        expect(ids.sort()).toEqual(['a', 'b', 'c']);
    });

    it('devuelve las tres secciones aunque este vacia la lista', () => {
        const sections = getSectionedPatients([], {}, {});
        expect(sections).toEqual({ noBatteries: [], pendingRecommendation: [], inProgress: [] });
    });

    it('un contador de baterias negativo o raro sigue contando como "con baterias" si no es 0', () => {
        const sections = getSectionedPatients([patient('x')], { x: -1 }, {});
        expect(sections.pendingRecommendation.map((p) => p.id)).toEqual(['x']);
    });
});
