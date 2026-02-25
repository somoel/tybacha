-- =============================================================================
-- Tybachá - Supabase Migration: Initial Schema
-- Senior Fitness Test (SFT) Application Database
-- =============================================================================

-- ─────────────────────────────────────────────────────────
-- Table: profiles (extends auth.users)
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('professional', 'caregiver')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'professional')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- Table: patients
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by       UUID NOT NULL REFERENCES profiles(id),
  first_name       TEXT NOT NULL,
  second_name      TEXT,
  first_lastname   TEXT NOT NULL,
  second_lastname  TEXT,
  birth_date       DATE NOT NULL,
  gender           TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  pathologies      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Professional sees own patients" ON patients
  FOR ALL USING (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────
-- Table: caregiver_patients (RF-03, RF-07)
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.caregiver_patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id  UUID NOT NULL REFERENCES profiles(id),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assigned_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(caregiver_id, patient_id)
);

ALTER TABLE caregiver_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professional manages assignments" ON caregiver_patients
  FOR ALL USING (auth.uid() = assigned_by);

CREATE POLICY "Caregiver manages own assignments" ON caregiver_patients
  FOR SELECT USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregiver can unlink" ON caregiver_patients
  FOR DELETE USING (auth.uid() = caregiver_id);

-- Policy on patients that depends on caregiver_patients
CREATE POLICY "Caregiver sees assigned patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patients cp
      WHERE cp.patient_id = patients.id AND cp.caregiver_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────
-- Table: sft_batteries (RF-08)
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.sft_batteries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  performed_by  UUID NOT NULL REFERENCES profiles(id),
  performed_at  TIMESTAMPTZ DEFAULT now(),
  notes         TEXT,
  is_synced     BOOLEAN DEFAULT TRUE
);

ALTER TABLE sft_batteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own batteries" ON sft_batteries
  FOR ALL USING (auth.uid() = performed_by);

CREATE POLICY "Professional sees patient batteries" ON sft_batteries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = sft_batteries.patient_id AND p.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────
-- Table: sft_results
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.sft_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id  UUID NOT NULL REFERENCES sft_batteries(id) ON DELETE CASCADE,
  test_type   TEXT NOT NULL CHECK (test_type IN (
                'chair_stand', 'arm_curl', 'six_min_walk', 'two_min_step',
                'chair_sit_reach', 'back_scratch', 'up_and_go'
              )),
  value       NUMERIC NOT NULL,
  unit        TEXT NOT NULL,
  notes       TEXT
);

ALTER TABLE sft_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees results via battery" ON sft_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sft_batteries b
      WHERE b.id = sft_results.battery_id
        AND (b.performed_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = b.patient_id AND p.created_by = auth.uid()
          ))
    )
  );

-- ─────────────────────────────────────────────────────────
-- Table: exercise_plans (RF-09)
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.exercise_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  battery_id    UUID NOT NULL REFERENCES sft_batteries(id),
  generated_by  UUID NOT NULL REFERENCES profiles(id),
  generated_at  TIMESTAMPTZ DEFAULT now(),
  exercises     JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'cancelled'))
);

ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professional manages plans" ON exercise_plans
  FOR ALL USING (auth.uid() = generated_by);

CREATE POLICY "Caregiver sees patient plans" ON exercise_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patients cp
      WHERE cp.patient_id = exercise_plans.patient_id
        AND cp.caregiver_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────
-- Table: exercise_logs (RF-04)
-- ─────────────────────────────────────────────────────────

CREATE TABLE public.exercise_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_index  INT NOT NULL,
  logged_by       UUID NOT NULL REFERENCES profiles(id),
  logged_at       TIMESTAMPTZ DEFAULT now(),
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  value_achieved  NUMERIC,
  notes           TEXT
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own logs" ON exercise_logs
  FOR ALL USING (auth.uid() = logged_by);

CREATE POLICY "Professional sees patient logs" ON exercise_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercise_plans ep
        JOIN patients p ON ep.patient_id = p.id
      WHERE ep.id = exercise_logs.plan_id AND p.created_by = auth.uid()
    )
  );
