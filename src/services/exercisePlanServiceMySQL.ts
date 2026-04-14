import { getMySQLService } from '@/src/lib/mysql';
import type { SFTResult } from '@/src/types/battery.types';
import type { ExerciseLog, ExerciseLogInput, ExercisePlan, GeminiExercisePlanResponse } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';

// Database-compatible type matching actual table structure
interface ExercisePlanDB {
  id: string;
  patient_id: string;
  plan_name: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  sessions_per_week: number;
  minutes_per_session: number;
  created_by: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export class ExercisePlanServiceMySQL {
  private mysql = getMySQLService();

  /**
   * Fetch all exercise plans for a patient
   */
  async fetchExercisePlans(patientId: string): Promise<ExercisePlan[]> {
    try {
      console.log('ExercisePlanServiceMySQL - Fetching exercise plans for patient:', patientId);
      
      const plansDB = await this.mysql.query<ExercisePlanDB>(
        'SELECT * FROM exercise_plans WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );
      
      // Map database results to ExercisePlan format
      const plans: ExercisePlan[] = plansDB.map(plan => ({
        id: plan.id,
        patient_id: plan.patient_id,
        battery_id: '', // Not in database schema, using empty string
        generated_by: plan.created_by,
        generated_at: plan.created_at,
        exercises: [], // No exercises stored in current schema
        status: plan.is_active ? 'active' : 'completed' as 'active' | 'completed' | 'cancelled',
        summary: plan.description
      }));
      
      console.log('ExercisePlanServiceMySQL - Exercise plans fetched:', plans.length);
      return plans;
    } catch (error) {
      console.error('ExercisePlanServiceMySQL - Error fetching exercise plans:', error);
      throw new Error('Error obteniendo planes: ' + error);
    }
  }
}

// Export singleton instance
export const exercisePlanServiceMySQL = new ExercisePlanServiceMySQL();

/**
 * Generate an AI exercise plan using Gemini 2.0 Flash (RF-09).
 * @param patient - The patient data including pathologies
 * @param results - The SFT battery results
 * @param generatedBy - ID of the professional generating the plan
 * @param batteryId - ID of the battery the plan is based on
 */
export async function generateExercisePlan(
    patient: Patient,
    results: SFTResult[],
    generatedBy: string,
    batteryId: string
): Promise<ExercisePlan> {
    const { geminiModel } = await import('@/src/lib/gemini');
    const { generateUUID } = await import('@/src/lib/sqlite');
    const { differenceInYears } = await import('date-fns');
    
    const age = differenceInYears(new Date(), new Date(patient.birth_date || '2000-01-01'));
    const genderLabel = patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro';

    const getResultValue = (testType: string): string => {
        const result = results.find((r) => r.test_type === testType);
        return result ? `${result.value}` : 'No evaluado';
    };

    const prompt = `Eres un especialista en ejercicio físico para adultos mayores.
Basándote en los siguientes datos, genera un plan de ejercicios personalizado
de 4 semanas para mejorar las capacidades físicas deficientes.

DATOS DEL PACIENTE:
- Nombre: ${patient.first_name} ${patient.first_lastname}
- Edad: ${age} años
- Género: ${genderLabel}
- Patologías: ${'Ninguna reportada'}

RESULTADOS ÚLTIMA BATERÍA SFT (Rikli & Jones):
- Sentarse/levantarse silla (30s): ${getResultValue('chair_stand')} repeticiones
- Flexión de codo (30s): ${getResultValue('arm_curl')} repeticiones
- Caminata 6 minutos: ${getResultValue('six_min_walk')} metros
- Marcha estacionaria 2 min: ${getResultValue('two_min_step')} pasos
- Sentado y extenderse: ${getResultValue('chair_sit_reach')} cm
- Rascarse la espalda: ${getResultValue('back_scratch')} cm
- Up-and-Go 8 pies: ${getResultValue('up_and_go')} segundos

Responde ÚNICAMENTE con un JSON válido con este esquema (sin texto adicional):
{
  "summary": "Breve análisis de las capacidades del paciente (máx 3 oraciones)",
  "exercises": [
    {
      "index": 0,
      "name": "Nombre del ejercicio",
      "description": "Descripción paso a paso clara para el cuidador",
      "sets": 3,
      "reps": 12,
      "duration_seconds": null,
      "frequency": "X veces por semana",
      "rationale": "Por qué este ejercicio para este paciente"
    }
  ]
}
Genera entre 5 y 8 ejercicios. Prioriza ejercicios seguros sin equipamiento.`;

    try {
        const responseText = await geminiModel.sendSync(prompt);

        let parsed: GeminiExercisePlanResponse;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            // Try to extract JSON from response if wrapped in markdown
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('La respuesta de IA no contiene JSON válido.');
            }
        }

        if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
            throw new Error('La respuesta de IA no contiene ejercicios válidos.');
        }

        // Save plan to MySQL
        const planId = generateUUID();
        const planData = {
            id: planId,
            patient_id: patient.id,
            battery_id: batteryId,
            generated_by: generatedBy,
            exercises: parsed.exercises,
            status: 'active' as const,
            generated_at: new Date().toISOString(),
        };

        const mysql = getMySQLService();
        await mysql.execute(
            `INSERT INTO exercise_plans (
              patient_id, plan_name, description, difficulty_level, 
              duration_weeks, sessions_per_week, minutes_per_session, 
              created_by, is_active, start_date, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                planData.patient_id,
                'Plan de Ejercicios Personalizado',
                parsed.summary,
                'beginner',
                4,
                3,
                30,
                planData.generated_by,
                1,
                new Date().toISOString().split('T')[0],
                new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            ]
        );

        return {
            ...planData,
            summary: parsed.summary,
        };
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al generar plan de ejercicios.');
    }
}

/**
 * Log exercise completion (RF-04).
 */
export async function logExerciseCompletion(
    planId: string,
    exerciseIndex: number,
    loggedBy: string,
    input: ExerciseLogInput
): Promise<ExerciseLog> {
    const { generateUUID } = await import('@/src/lib/sqlite');
    
    const logData = {
        id: generateUUID(),
        plan_id: planId,
        exercise_index: exerciseIndex,
        logged_by: loggedBy,
        completed: input.completed,
        notes: input.notes || null,
    };

    const mysql = getMySQLService();
        await mysql.execute(
        `INSERT INTO exercise_logs (
          id, plan_id, exercise_index, logged_by, completed, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            logData.id,
            logData.plan_id,
            logData.exercise_index,
            logData.logged_by,
            logData.completed,
            logData.notes,
        ]
    );

    return logData as ExerciseLog;
}

// Export functions for backward compatibility
export async function fetchExercisePlans(patientId: string): Promise<ExercisePlan[]> {
  return await exercisePlanServiceMySQL.fetchExercisePlans(patientId);
}
