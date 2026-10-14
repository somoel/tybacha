import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ApiError,
    apiRequest,
    clearAuthTokens,
    getAccessToken,
    getRefreshToken,
    isNetworkError,
    setAuthTokens,
    setOnAuthExpired,
} from '@/src/api/httpClient';

const BASE = 'http://localhost:4001';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function textResponse(body: string, status = 200): Response {
    return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setOnAuthExpired(null);
});

afterEach(() => {
    setOnAuthExpired(null);
    vi.unstubAllGlobals();
});

describe('tokens', () => {
    it('guarda y limpia los tokens en el almacenamiento seguro', async () => {
        await setAuthTokens('access-1', 'refresh-1');
        expect(await getAccessToken()).toBe('access-1');
        expect(await getRefreshToken()).toBe('refresh-1');

        await clearAuthTokens();
        expect(await getAccessToken()).toBeNull();
        expect(await getRefreshToken()).toBeNull();
    });
});

describe('apiRequest', () => {
    it('sin token no envía cabecera Authorization', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await apiRequest('/health');

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${BASE}/health`);
        expect(new Headers(init?.headers).has('Authorization')).toBe(false);
    });

    it('con token envía Bearer', async () => {
        await setAuthTokens('access-1', 'refresh-1');
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await apiRequest('/me');

        const init = fetchMock.mock.calls[0][1];
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-1');
    });

    it('añade Content-Type JSON cuando hay body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await apiRequest('/auth/login', { method: 'POST', body: '{"a":1}' });

        const init = fetchMock.mock.calls[0][1];
        expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    });

    it('no toca Content-Type si ya viene definido', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await apiRequest('/x', {
            method: 'POST',
            body: '{}',
            headers: { 'Content-Type': 'application/vnd.api+json' },
        });

        const init = fetchMock.mock.calls[0][1];
        expect(new Headers(init?.headers).get('Content-Type')).toBe('application/vnd.api+json');
    });

    it('no fija Content-Type en peticiones sin body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await apiRequest('/me');

        const init = fetchMock.mock.calls[0][1];
        expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
    });

    it('no fija Content-Type en FormData (lo pone el runtime)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
        const form = new FormData();
        form.append('foto', new Blob(['x']), 'a.png');

        await apiRequest('/upload', { method: 'POST', body: form });

        const init = fetchMock.mock.calls[0][1];
        expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
    });

    it('devuelve el JSON parseado', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));

        await expect(apiRequest<{ id: number }>('/me')).resolves.toEqual({ id: 7 });
    });

    it('devuelve texto cuando la respuesta no es JSON', async () => {
        fetchMock.mockResolvedValue(textResponse('archivo binario'));

        await expect(apiRequest('/reports')).resolves.toBe('archivo binario');
    });

    it('lanza ApiError con message y code del payload', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({ message: 'Credenciales invalidas', code: 'BAD_CREDENTIALS' }, 401),
        );

        const error = (await apiRequest('/auth/login', { method: 'POST' }).catch((e: unknown) => e)) as ApiError;

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(401);
        expect(error.message).toBe('Credenciales invalidas');
        expect(error.code).toBe('BAD_CREDENTIALS');
    });

    it('usa un mensaje genérico si la respuesta de error no es JSON', async () => {
        fetchMock.mockResolvedValue(textResponse('boom', 500));

        const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(500);
        expect(error.message).toBe('Error de comunicacion con el servidor');
        expect(error.code).toBeUndefined();
    });

    it('no lanza aunque el campo message no sea string', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: { nested: true } }, 400));

        const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;

        expect(error.message).toBe('[object Object]');
    });
});

describe('apiRequest — refresco de sesión 401', () => {
    beforeEach(async () => {
        await setAuthTokens('access-viejo', 'refresh-viejo');
    });

    it('refresca el token y reintenta la petición', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
            .mockResolvedValueOnce(jsonResponse({ accessToken: 'access-nuevo' }))
            .mockResolvedValueOnce(jsonResponse({ id: 1 }));

        const result = await apiRequest<{ id: number }>('/me');

        expect(result).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(3);

        const [refreshUrl, refreshInit] = fetchMock.mock.calls[1];
        expect(refreshUrl).toBe(`${BASE}/auth/refresh`);
        expect(JSON.parse(String(refreshInit?.body))).toEqual({ refreshToken: 'refresh-viejo' });

        const retryHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);
        expect(retryHeaders.get('Authorization')).toBe('Bearer access-nuevo');
        expect(await getAccessToken()).toBe('access-nuevo');
    });

    it('si el refresh devuelve 4xx limpia los tokens y avisa al listener', async () => {
        const onExpired = vi.fn();
        setOnAuthExpired(onExpired);

        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
            .mockResolvedValueOnce(jsonResponse({ message: 'Sesion expirada' }, 401));

        const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(401);
        expect(onExpired).toHaveBeenCalledTimes(1);
        expect(await getAccessToken()).toBeNull();
        expect(await getRefreshToken()).toBeNull();
    });

    it('si el refresh devuelve 5xx conserva los tokens y no avisa', async () => {
        const onExpired = vi.fn();
        setOnAuthExpired(onExpired);

        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
            .mockResolvedValueOnce(jsonResponse({ message: 'caido' }, 503));

        const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError;

        expect(error.status).toBe(401);
        expect(onExpired).not.toHaveBeenCalled();
        expect(await getAccessToken()).toBe('access-viejo');
        expect(await getRefreshToken()).toBe('refresh-viejo');
    });

    it('si el refresh no devuelve accessToken también cierra la sesión', async () => {
        const onExpired = vi.fn();
        setOnAuthExpired(onExpired);

        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
            .mockResolvedValueOnce(jsonResponse({ algo: 'otro' }));

        await apiRequest('/me').catch(() => undefined);

        expect(onExpired).toHaveBeenCalledTimes(1);
        expect(await getAccessToken()).toBeNull();
    });

    it('sin refresh token no reintenta', async () => {
        await clearAuthTokens();
        await setAuthTokens('access-viejo', '');

        const onExpired = vi.fn();
        setOnAuthExpired(onExpired);

        fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401));

        const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError;

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(error.status).toBe(401);
        expect(onExpired).not.toHaveBeenCalled();
    });

    it('un error del listener no rompe la petición', async () => {
        setOnAuthExpired(() => {
            throw new Error('listener roto');
        });
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        fetchMock
            .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
            .mockResolvedValueOnce(jsonResponse({ message: 'Sesion expirada' }, 401));

        const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError;

        expect(error.status).toBe(401);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('las respuestas 401 sin refresh token solo se lanzan una vez', async () => {
        await clearAuthTokens();

        fetchMock.mockResolvedValue(jsonResponse({ message: 'no autorizado' }, 401));

        const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError;

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(error.status).toBe(401);
    });
});

describe('isNetworkError', () => {
    it('ApiError nunca es error de red', () => {
        expect(isNetworkError(new ApiError(500, 'fallo'))).toBe(false);
        expect(isNetworkError(new ApiError(0, 'fallo'))).toBe(false);
    });

    it('TypeError sí es error de red', () => {
        expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
        expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
    });

    it('AbortError sí es error de red', () => {
        expect(isNetworkError({ name: 'AbortError', message: 'aborted' })).toBe(true);
        expect(isNetworkError({ name: 'TypeError', message: 'x' })).toBe(true);
    });

    it('mensajes típicos de fallo de red', () => {
        expect(isNetworkError({ name: 'Error', message: 'Network request failed' })).toBe(true);
        expect(isNetworkError({ name: 'Error', message: 'Failed to fetch' })).toBe(true);
        expect(isNetworkError({ name: 'Error', message: 'Network Request Failed' })).toBe(true);
    });

    it('otros errores no son de red', () => {
        expect(isNetworkError(new Error('validacion'))).toBe(false);
        expect(isNetworkError('string')).toBe(false);
        expect(isNetworkError(null)).toBe(false);
        expect(isNetworkError(undefined)).toBe(false);
        expect(isNetworkError({ name: 'Error', message: 'algo' })).toBe(false);
    });
});
