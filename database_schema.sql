-- =============================================================================  
-- Tybachá - MySQL Database Schema
-- Senior Fitness Test (SFT) Application Database  
-- =============================================================================

-- Users table with profile information
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  rol ENUM('professional', 'caregiver', 'admin') NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_by VARCHAR(36) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  second_name VARCHAR(100) NULL,
  first_lastname VARCHAR(100) NOT NULL,
  second_lastname VARCHAR(100) NULL,
  birth_date DATE NOT NULL,
  gender ENUM('M', 'F') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- SFT Batteries table
CREATE TABLE sft_batteries (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  patient_id VARCHAR(36) NOT NULL,
  performed_by VARCHAR(36) NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- SFT Results table
CREATE TABLE sft_results (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  battery_id VARCHAR(36) NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  value VARCHAR(20) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (battery_id) REFERENCES sft_batteries(id)
);

-- Exercise Plans table
CREATE TABLE exercise_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  patient_id VARCHAR(36) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  duration_weekS INT NOT NULL,
  sessions_per_week INT NOT NULL,
  minutes_per_session INT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Exercise Logs table
CREATE TABLE exercise_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  plan_id VARCHAR(36) NOT NULL,
  exercise_index INT NOT NULL,
  logged_by VARCHAR(36) NOT NULL,
  completed BOOLEAN NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES exercise_plans(id),
  FOREIGN KEY (logged_by) REFERENCES users(id)
);

-- Caregiver Assignments table
CREATE TABLE caregiver_assignments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  caregiver_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (caregiver_id) REFERENCES users(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_patients_active ON patients(is_active);
CREATE INDEX idx_sft_batteries_patient ON sft_batteries(patient_id);
CREATE INDEX idx_sft_batteries_performed_by ON sft_batteries(performed_by);
CREATE INDEX idx_sft_results_battery ON sft_results(battery_id);
CREATE INDEX idx_exercise_plans_patient ON exercise_plans(patient_id);
CREATE INDEX idx_exercise_plans_created_by ON exercise_plans(created_by);
CREATE INDEX idx_caregiver_assignments_caregiver ON caregiver_assignments(caregiver_id);
CREATE INDEX idx_caregiver_assignments_patient ON caregiver_assignments(patient_id);
