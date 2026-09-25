import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateWithOpenRouter } from '../../../../infrastructure/ai/openrouter.js';
import { requireRoles } from '../../requireAuth.js';

const TEST_PROMPT = `Eres un especialista en ejercicio fisico para adultos mayores.

Genera un plan de ejercicios semanal personalizado y seguro.

REGLAS OBLIGATORIAS:
- Responde unicamente JSON valido.
- Debe contener exactamente 5 ejercicios.
- Debe haber un ejercicio para cada dia: lunes, martes, miercoles, jueves y viernes.
- Usa dificultad bajo, medio o alto.
- Evita ejercicios contraindicados.
- No incluyas sabado ni domingo.

ADULTO MAYOR (prueba):
- Fecha de nacimiento: 1945-03-15
- Genero: femenino
- Patologias: Hipertension arterial controlada
- Medicamentos activos: Losartan 50mg diario

DATOS CORPORALES:
- Peso: 68 kg
- Estatura: 155 cm
- IMC: 28.3 (sobrepeso)

RESULTADOS SFT:
- Caminata 6 minutos: 420 metros
- Sentarse y levantarse: 12 repeticiones
- Empuje de brazos: 18 kg
- Recoger objeto: 22 cm
- Marcha rapida: 4.8 segundos

JSON esperado:
{
  "resumen": "Resumen breve del plan",
  "objetivo": "Objetivo funcional del plan",
  "nivelDificultad": "bajo",
  "ejercicios": [
    {
      "diaSemana": "lunes",
      "nombre": "Nombre",
      "descripcion": "Descripcion breve",
      "series": 2,
      "repeticiones": 10,
      "duracionSegundos": null,
      "descansoSegundos": 60,
      "dificultad": "bajo",
      "instrucciones": "Indicaciones claras para cuidador"
    }
  ]
}`;

const normalizeDay = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const aliases: Record<string, string> = {
    monday: 'lunes',
    tuesday: 'martes',
    wednesday: 'miercoles',
    thursday: 'jueves',
    friday: 'viernes',
  };
  return aliases[normalized] ?? normalized;
};

const aiPlanTestSchema = z.object({
  resumen: z.string().min(1),
  objetivo: z.string().nullable().optional(),
  nivelDificultad: z.enum(['bajo', 'medio', 'alto']).default('bajo'),
  ejercicios: z.array(z.object({
    diaSemana: z.preprocess(normalizeDay, z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes'])),
    nombre: z.string().min(1),
    descripcion: z.string().nullable().optional(),
    series: z.number().int().positive().nullable().optional(),
    repeticiones: z.number().int().positive().nullable().optional(),
    duracionSegundos: z.number().int().positive().nullable().optional(),
    descansoSegundos: z.number().int().nonnegative().nullable().optional(),
    dificultad: z.string().nullable().optional(),
    instrucciones: z.string().nullable().optional(),
  })).length(5),
});

function normalizeAiJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    if (start < 0) throw new Error('La respuesta de IA no contiene JSON valido');

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(cleaned.slice(start, index + 1));
        }
      }
    }

    throw new Error('La respuesta de IA contiene JSON incompleto');
  }
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/admin/ai/exercise-plan-test', { preHandler: requireRoles(app, ['administrador']) }, async (request, reply) => {
    const start = Date.now();
    const generation = await generateWithOpenRouter(TEST_PROMPT);
    let parsed: z.infer<typeof aiPlanTestSchema>;

    try {
      parsed = aiPlanTestSchema.parse(normalizeAiJson(generation.text));
    } catch (error) {
      request.log.error({
        event: 'ai_test_invalid_response',
        model: generation.model,
        usedFallback: generation.usedFallback,
        error: error instanceof Error ? error.message : String(error),
      });
      return reply.code(502).send({
        code: 'AI_INVALID_RESPONSE',
        message: 'La IA no devolvio un plan valido',
      });
    }

    console.log(JSON.stringify({
      event: 'debug_exercise_plan',
      model: generation.model,
      usedFallback: generation.usedFallback,
      ejercicios: parsed.ejercicios.map((ejercicio) => ({ diaSemana: ejercicio.diaSemana, nombre: ejercicio.nombre })),
    }));

    const durationMs = Date.now() - start;

    return {
      ok: true,
      durationMs,
      model: generation.model,
      usedFallback: generation.usedFallback,
      resumen: parsed.resumen,
      objetivo: parsed.objetivo ?? null,
      nivelDificultad: parsed.nivelDificultad,
      ejercicios: parsed.ejercicios.map((ejercicio) => ({
        diaSemana: ejercicio.diaSemana,
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion ?? null,
        series: ejercicio.series ?? null,
        repeticiones: ejercicio.repeticiones ?? null,
        duracionSegundos: ejercicio.duracionSegundos ?? null,
        dificultad: ejercicio.dificultad ?? null,
      })),
    };
  });
}
