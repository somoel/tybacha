// MySQL Database Types for Tybacha System

// User related types
export type UserRole = 'professional' | 'caregiver' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  rol: UserRole;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  address?: string;
  license_number?: string; // Para profesionales
  specialization?: string; // Para profesionales
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile extends User {
  profile?: UserProfile;
}

// Patient related types
export type Gender = 'M' | 'F';

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

// Patient-Caregiver assignment
export interface PatientCaregiver {
  id: string;
  patient_id: string;
  caregiver_id: string;
  assigned_at: string;
  assigned_by?: string; // ID del profesional que asignó
  is_active: boolean;
}

// Cognitive Tests
export type TestType = 'mmse' | 'clock_drawing' | 'memory_test' | 'attention_test';

export interface CognitiveTest {
  id: string;
  patient_id: string;
  test_type: TestType;
  score?: number;
  max_score: number;
  interpretation?: string;
  observations?: string;
  tested_by: string; // ID del profesional
  test_date: string;
  created_at: string;
}

// Exercise Plans
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseCategory = 'strength' | 'flexibility' | 'balance' | 'cardio' | 'cognitive';

export interface ExercisePlan {
  id: string;
  patient_id: string;
  plan_name: string;
  description?: string;
  difficulty_level: DifficultyLevel;
  duration_weeks: number;
  sessions_per_week: number;
  minutes_per_session: number;
  created_by: string; // ID del profesional
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  plan_id: string;
  exercise_name: string;
  description?: string;
  instructions?: string;
  repetitions?: number;
  sets?: number;
  rest_seconds?: number;
  category: ExerciseCategory;
  order_index: number;
  created_at: string;
}

export interface ExerciseSession {
  id: string;
  patient_id: string;
  plan_id: string;
  session_date: string;
  duration_minutes?: number;
  completed_exercises?: number;
  total_exercises?: number;
  notes?: string;
  performed_by?: string; // ID del cuidador o profesional
  created_at: string;
}

// Patient Progress
export type ProgressTestType = TestType | 'physical_assessment';

export interface PatientProgress {
  id: string;
  patient_id: string;
  test_type: ProgressTestType;
  score?: number;
  previous_score?: number;
  improvement?: number;
  measurement_date: string;
  notes?: string;
}

// Daily Activities
export type ActivityType = 'medication' | 'meal' | 'exercise' | 'hygiene' | 'social' | 'sleep' | 'other';

export interface DailyActivity {
  id: string;
  patient_id: string;
  activity_type: ActivityType;
  activity_description: string;
  activity_time: string;
  duration_minutes?: number;
  performed_by?: string; // ID del cuidador
  notes?: string;
  created_at: string;
}

// Alerts and Reminders
export type AlertType = 'medication' | 'appointment' | 'exercise' | 'emergency' | 'checkup';
export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Alert {
  id: string;
  patient_id: string;
  alert_type: AlertType;
  title: string;
  message: string;
  scheduled_time: string;
  is_completed: boolean;
  priority: AlertPriority;
  created_by?: string;
  created_at: string;
}

// Sync Queue for offline mode
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface SyncQueue {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  data: any; // JSON data
  created_at: string;
  synced_at?: string;
  status: SyncStatus;
  error_message?: string;
}

// System Settings
export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// Extended types with relationships
export interface PatientWithDetails extends Patient {
  caregiver_assignments?: PatientCaregiver[];
  cognitive_tests?: CognitiveTest[];
  exercise_plans?: ExercisePlan[];
  progress?: PatientProgress[];
  daily_activities?: DailyActivity[];
  alerts?: Alert[];
}

export interface ExercisePlanWithDetails extends ExercisePlan {
  exercises?: Exercise[];
  sessions?: ExerciseSession[];
  patient?: Patient;
}

export interface UserWithPatients extends UserWithProfile {
  assigned_patients?: Patient[];
  created_patients?: Patient[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Query options
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Database connection status
export interface DatabaseStatus {
  connected: boolean;
  online: boolean;
  lastSync?: string;
  pendingSyncs: number;
}

// Legacy compatibility types (for existing code)
export type GenderLegacy = 'male' | 'female' | 'other';

// Helper functions for type conversion
export function convertGenderToMySQL(gender: GenderLegacy): Gender {
  switch (gender) {
    case 'male': return 'M';
    case 'female': return 'F';
    default: return 'M';
  }
}

export function convertGenderFromMySQL(gender: Gender): GenderLegacy {
  switch (gender) {
    case 'M': return 'male';
    case 'F': return 'female';
    default: return 'male';
  }
}

// Sectioned Patients for UI (keeping existing interface)
export interface SectionedPatients {
  noBatteries: Patient[];
  pendingRecommendation: Patient[];
  inProgress: Patient[];
}
