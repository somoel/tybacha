import { fetchApiCaregivers, fetchApiCaregiver, fetchApiCaregiverPatients } from '@/src/api/caregiversApi';
import type { ApiCaregiverPatient, ApiCaregiverSummary } from '@/src/types/apiCaregiver.types';
import type { Patient } from '@/src/types/patient.types';

export interface CaregiverSummary {
    id: string;
    correo: string;
    estado: string;
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    ciudad: string | null;
    creadoEn: string | null;
    ultimoAccesoEn: string | null;
    fullName: string;
    cantidadPacientes: number;
    pacientesConPlanActivo: number;
    cumplimientoSemanalPromedio: number;
}

export interface CaregiverPatient {
    id: string;
    nombres: string;
    apellidos: string;
    fullName: string;
    fechaNacimiento: string;
    genero: 'femenino' | 'masculino';
    tienePlanActivo: boolean;
    cumplimientoSemanal: number;
    tieneAlertaActiva: boolean;
    cantidadBaterias: number;
}

export interface CaregiverDetail extends CaregiverSummary {
    pacientes: CaregiverPatient[];
}

function mapSummary(row: ApiCaregiverSummary): CaregiverSummary {
    return {
        id: String(row.idUsuario),
        correo: row.correo,
        estado: row.estado,
        nombres: row.nombres,
        apellidos: row.apellidos,
        telefono: row.telefono,
        ciudad: row.ciudad,
        creadoEn: row.creadoEn,
        ultimoAccesoEn: row.ultimoAccesoEn,
        fullName: [row.nombres, row.apellidos].filter(Boolean).join(' ') || row.correo,
        cantidadPacientes: row.cantidadPacientes,
        pacientesConPlanActivo: row.pacientesConPlanActivo,
        cumplimientoSemanalPromedio: row.cumplimientoSemanalPromedio,
    };
}

function mapPatient(row: ApiCaregiverPatient): CaregiverPatient {
    return {
        id: String(row.idAdultoMayor),
        nombres: row.nombres,
        apellidos: row.apellidos,
        fullName: [row.nombres, row.apellidos].filter(Boolean).join(' '),
        fechaNacimiento: row.fechaNacimiento,
        genero: row.genero,
        tienePlanActivo: row.tienePlanActivo,
        cumplimientoSemanal: row.cumplimientoSemanal,
        tieneAlertaActiva: row.tieneAlertaActiva,
        cantidadBaterias: row.cantidadBaterias,
    };
}

/**
 * Maps a CaregiverPatient to the Patient type so PatientCard can be reused.
 */
export function mapCaregiverPatientToPatient(cp: CaregiverPatient): Patient {
    return {
        id: cp.id,
        created_by: '',
        first_name: cp.nombres,
        first_lastname: cp.apellidos,
        birth_date: cp.fechaNacimiento,
        gender: cp.genero === 'masculino' ? 'male' : 'female',
        has_photo: false,
        photo_data: null,
        created_at: '',
        updated_at: '',
    };
}

export async function fetchCaregivers(search?: string): Promise<CaregiverSummary[]> {
    const rows = await fetchApiCaregivers(search);
    return rows.map(mapSummary);
}

export async function fetchCaregiverDetail(id: string): Promise<CaregiverDetail> {
    const row = await fetchApiCaregiver(Number(id));
    return {
        ...mapSummary(row),
        pacientes: row.pacientes.map(mapPatient),
    };
}

export async function fetchCaregiverPatients(id: string): Promise<CaregiverPatient[]> {
    const rows = await fetchApiCaregiverPatients(Number(id));
    return rows.map(mapPatient);
}
