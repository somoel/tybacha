import type { FastifyInstance } from 'fastify';
import { generateWithCerebras } from '../../../../infrastructure/ai/cerebras.js';
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

const aiPlanTestSchema = {
  type: 'object' as const,
  required: ['resumen', 'ejercicios'],
  properties: {
    resumen: { type: 'string' },
    objetivo: { type: 'string' },
    nivelDificultad: { type: 'string', enum: ['bajo', 'medio', 'alto'] },
    ejercicios: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        required: ['diaSemana', 'nombre'],
        properties: {
          diaSemana: { type: 'string', enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] },
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          series: { type: 'number' },
          repeticiones: { type: 'number' },
          duracionSegundos: { type: 'number' },
          descansoSegundos: { type: 'number' },
          dificultad: { type: 'string', enum: ['bajo', 'medio', 'alto'] },
          instrucciones: { type: 'string' },
        },
      },
    },
  },
};

function normalizeAiJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('La respuesta de IA no contiene JSON valido');
    return JSON.parse(match[0]);
  }
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/admin/ai/exercise-plan-test', { preHandler: requireRoles(app, ['administrador']) }, async (request, reply) => {
    const start = Date.now();

    const responseText = await generateWithCerebras(TEST_PROMPT);
    const parsed = normalizeAiJson(responseText);

    const validated = aiPlanTestSchema as any;
    const ejercicios = (parsed as any).ejercicios;
    if (!Array.isArray(ejercicios) || ejercicios.length !== 5) {
      throw new Error('La respuesta no contiene exactamente 5 ejercicios');
    }

    console.log(JSON.stringify({ event: 'debug_exercise_plan', ejercicios: ejercicios.map((e: any) => ({ diaSemana: e.diaSemana, nombre: e.nombre })) }));

    const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    for (const dia of dias) {
      const found = ejercicios.some((e: any) => normalize(e.diaSemana) === dia);
      if (!found) throw new Error(`Falta ejercicio para ${dia}`);
    }

    const durationMs = Date.now() - start;

    return {
      ok: true,
      durationMs,
      resumen: (parsed as any).resumen,
      objetivo: (parsed as any).objetivo,
      nivelDificultad: (parsed as any).nivelDificultad,
      ejercicios: ejercicios.map((e: any) => ({
        diaSemana: e.diaSemana,
        nombre: e.nombre,
        descripcion: e.descripcion ?? null,
        series: e.series ?? null,
        repeticiones: e.repeticiones ?? null,
        duracionSegundos: e.duracionSegundos ?? null,
        dificultad: e.dificultad ?? null,
      })),
    };
  });
}
