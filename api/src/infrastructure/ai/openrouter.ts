import { env } from '../../config/env.js';

export interface OpenRouterGeneration {
  text: string;
  model: string;
  usedFallback: boolean;
}

interface OpenRouterResponse {
  model?: string;
  choices?: {
    finish_reason?: string | null;
    message?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
}

class OpenRouterRequestError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'OpenRouterRequestError';
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 429 || status >= 500;
}

async function requestCompletion(model: string, prompt: string): Promise<OpenRouterGeneration> {
  let response: Response;

  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'X-OpenRouter-Title': 'Tybacha API',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3072,
        reasoning: { effort: 'low', exclude: true },
        response_format: { type: 'json_object' },
        stream: false,
      }),
      signal: AbortSignal.timeout(env.OPENROUTER_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new OpenRouterRequestError(
      timedOut ? `El modelo ${model} excedio el tiempo limite` : `No se pudo conectar con ${model}`,
      true,
    );
  }

  const payload = await response.json().catch(() => null) as OpenRouterResponse | null;

  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new OpenRouterRequestError(
      `OpenRouter respondio ${response.status}: ${message.slice(0, 300)}`,
      isRetryableStatus(response.status),
    );
  }

  if (payload?.error?.message) {
    throw new OpenRouterRequestError(`OpenRouter: ${payload.error.message.slice(0, 300)}`, true);
  }

  const choice = payload?.choices?.[0];
  const text = choice?.message?.content?.trim();

  if (choice?.finish_reason === 'length' || !text) {
    throw new OpenRouterRequestError(`El modelo ${model} no devolvio una respuesta completa`, true);
  }

  return {
    text,
    model: payload?.model ?? model,
    usedFallback: false,
  };
}

function logGeneration(startedAt: number, generation: OpenRouterGeneration): void {
  console.log(JSON.stringify({
    event: 'openrouter_generation',
    model: generation.model,
    usedFallback: generation.usedFallback,
    durationMs: Date.now() - startedAt,
  }));
}

export async function generateWithOpenRouter(prompt: string): Promise<OpenRouterGeneration> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  const startedAt = Date.now();

  try {
    const primary = await requestCompletion(env.OPENROUTER_PRIMARY_MODEL, prompt);
    logGeneration(startedAt, primary);
    return primary;
  } catch (error) {
    if (!(error instanceof OpenRouterRequestError) || !error.retryable) {
      throw error;
    }

    const fallback = await requestCompletion(env.OPENROUTER_FALLBACK_MODEL, prompt);
    const result = { ...fallback, usedFallback: true };
    logGeneration(startedAt, result);
    return result;
  }
}
