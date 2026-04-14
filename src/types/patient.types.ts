import type { Gender, SectionedPatients } from './database.types';

// Legacy types for backward compatibility
export type GenderLegacy = 'male' | 'female' | 'other';

export interface Patient {
    id: string;
    first_name: string;
    second_name?: string;
    first_lastname: string;
    second_lastname?: string;
    birth_date?: string;
    gender: Gender;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    medical_history?: string;
    allergies?: string;
    medications?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface PatientFormData {
    first_name: string;
    second_name?: string;
    first_lastname: string;
    second_lastname?: string;
    birth_date?: Date;
    gender: Gender;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    medical_history?: string;
    allergies?: string;
    medications?: string;
}

// Re-export from database.types
export { SectionedPatients };

// Helper functions for backward compatibility
export function convertGenderToLegacy(gender: Gender): GenderLegacy {
    switch (gender) {
        case 'M': return 'male';
        case 'F': return 'female';
        default: return 'male';
    }
}

export function convertGenderFromLegacy(gender: GenderLegacy): Gender {
    switch (gender) {
        case 'male': return 'M';
        case 'female': return 'F';
        default: return 'M';
    }
}
