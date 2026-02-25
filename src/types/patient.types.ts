export type Gender = 'male' | 'female' | 'other';

export interface Patient {
    id: string;
    created_by: string;
    first_name: string;
    second_name?: string;
    first_lastname: string;
    second_lastname?: string;
    birth_date: string;
    gender: Gender;
    pathologies?: string;
    created_at: string;
    updated_at: string;
}

export interface PatientFormData {
    first_name: string;
    second_name?: string;
    first_lastname: string;
    second_lastname?: string;
    birth_date: Date;
    gender: Gender;
    pathologies?: string;
}

export interface CaregiverPatient {
    id: string;
    caregiver_id: string;
    patient_id: string;
    assigned_by: string;
    created_at: string;
}

export interface SectionedPatients {
    noBatteries: Patient[];
    pendingRecommendation: Patient[];
    inProgress: Patient[];
}
