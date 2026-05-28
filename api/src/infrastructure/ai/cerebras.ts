import { env } from '../../config/env.js';

export async function generateWithCerebras(prompt: string): Promise<string> {
  if (!env.CEREBRAS_API_KEY) {
    throw new Error('CEREBRAS_API_KEY no configurada');
  }

  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.CEREBRAS_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cerebras respondio ${response.status}: ${body}`);
  }

  const payload = await response.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('Cerebras no devolvio contenido');
  }

  return text;
}
