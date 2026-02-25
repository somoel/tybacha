import { geminiModel } from '@/src/lib/gemini';
import { generateUUID } from '@/src/lib/sqlite';
import { supabase } from '@/src/lib/supabase';
import type { SFTResult } from '@/src/types/battery.types';
import type { ExerciseLog, ExerciseLogInput, ExercisePlan, GeminiExercisePlanResponse } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import { differenceInYears } from 'date-fns';

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
    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const genderLabel = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro';

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
- Patologías: ${patient.pathologies || 'Ninguna reportada'}

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
        const result = await geminiModel.generateContent(prompt);
        const responseText = result.response.text();

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

        // Save plan to Supabase
        const planData = {
            id: generateUUID(),
            patient_id: patient.id,
            battery_id: batteryId,
            generated_by: generatedBy,
            exercises: parsed.exercises,
            status: 'active' as const,
        };

        const { data, error } = await supabase
            .from('exercise_plans')
            .insert(planData)
            .select()
            .single();

        if (error) throw new Error('Error al guardar plan de ejercicios: ' + error.message);

        return {
            ...(data as ExercisePlan),
            summary: parsed.summary,
        };
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al generar plan de ejercicios.');
    }
}

/**
 * Fetch exercise plans for a patient.
 */
export async function fetchExercisePlans(patientId: string): Promise<ExercisePlan[]> {
    try {
        const { data, error } = await supabase
            .from('exercise_plans')
            .select('*')
            .eq('patient_id', patientId)
            .order('generated_at', { ascending: false });

        if (error) throw new Error('Error al obtener planes: ' + error.message);
        return (data ?? []) as ExercisePlan[];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener planes.');
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
    try {
        const logData = {
            id: generateUUID(),
            plan_id: planId,
            exercise_index: exerciseIndex,
            logged_by: loggedBy,
            completed: input.completed,
            value_achieved: input.value_achieved ?? null,
            notes: input.notes ?? null,
        };

        const { data, error } = await supabase
            .from('exercise_logs')
            .insert(logData)
            .select()
            .single();

        if (error) throw new Error('Error al registrar ejercicio: ' + error.message);
        return data as ExerciseLog;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al registrar ejercicio.');
    }
}

/**
 * Fetch exercise logs for a plan.
 */
export async function fetchExerciseLogs(planId: string): Promise<ExerciseLog[]> {
    try {
        const { data, error } = await supabase
            .from('exercise_logs')
            .select('*')
            .eq('plan_id', planId)
            .order('logged_at', { ascending: false });

        if (error) throw new Error('Error al obtener registros: ' + error.message);
        return (data ?? []) as ExerciseLog[];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener registros de ejercicios.');
    }
}

/**
 * Update exercise plan status.
 */
export async function updatePlanStatus(
    planId: string,
    status: ExercisePlan['status']
): Promise<void> {
    try {
        const { error } = await supabase
            .from('exercise_plans')
            .update({ status })
            .eq('id', planId);

        if (error) throw new Error('Error al actualizar plan: ' + error.message);
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al actualizar plan.');
    }
}
