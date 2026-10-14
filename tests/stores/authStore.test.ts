import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changeEmailApi, changePasswordApi, logoutFromApi, updateMeApi } from '@/src/api/authApi';
import { setAuthTokens } from '@/src/api/httpClient';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import type { AuthUser } from '@/src/types/auth.types';

vi.mock('@/src/api/authApi', () => ({
    loginWithApi: vi.fn(),
    logoutFromApi: vi.fn(),
    fetchApiMe: vi.fn(),
    changeEmailApi: vi.fn(),
    changePasswordApi: vi.fn(),
    updateMeApi: vi.fn(),
}));

vi.mock('@/src/api/httpClient', () => ({
    setAuthTokens: vi.fn(),
}));

const store = () => useAuthStore.getState();

function user(overrides: Partial<AuthUser> = {}): AuthUser {
    return {
        id: '1',
        email: 'ana@correo.com',
        correo: 'ana@correo.com',
        role: 'profesional',
        ...overrides,
    } as AuthUser;
}

describe('authStore', () => {
    beforeEach(() => {
        store().setSession(null);
        store().setUser(null);
        store().setProfile(null);
        store().setRole(null);
        store().setLoading(false);
        useBatteryStore.getState().clearSession();
        vi.mocked(logoutFromApi).mockReset();
        vi.mocked(updateMeApi).mockReset();
        vi.mocked(changeEmailApi).mockReset();
        vi.mocked(changePasswordApi).mockReset();
        vi.mocked(setAuthTokens).mockReset();
    });

    describe('setters', () => {
        it('setSession / setUser / setProfile / setRole / setLoading', () => {
            store().setSession({ token: 't' } as never);
            store().setUser(user());
            store().setProfile({ nombres: 'Ana' } as never);
            store().setRole('profesional');
            store().setLoading(true);

            expect(store().session).toEqual({ token: 't' });
            expect(store().user?.email).toBe('ana@correo.com');
            expect(store().profile).toEqual({ nombres: 'Ana' });
            expect(store().role).toBe('profesional');
            expect(store().isLoading).toBe(true);
        });
    });

    describe('updateProfile', () => {
        it('persiste el perfil devuelto por la API', async () => {
            vi.mocked(updateMeApi).mockResolvedValue({ nombres: 'Ana Maria' } as never);

            await store().updateProfile({ nombres: 'Ana Maria' } as never);

            expect(updateMeApi).toHaveBeenCalledWith({ nombres: 'Ana Maria' });
            expect(store().profile).toEqual({ nombres: 'Ana Maria' });
        });

        it('propaga el error de la API', async () => {
            vi.mocked(updateMeApi).mockRejectedValue(new Error('400'));

            await expect(store().updateProfile({} as never)).rejects.toThrow('400');
        });
    });

    describe('changeEmail', () => {
        it('renueva los tokens y actualiza el correo del usuario', async () => {
            store().setUser(user());
            vi.mocked(changeEmailApi).mockResolvedValue({
                accessToken: 'nuevo-access',
                refreshToken: 'nuevo-refresh',
                user: { correo: 'nueva@correo.com' },
            } as never);

            await store().changeEmail({ email: 'nueva@correo.com' } as never);

            expect(setAuthTokens).toHaveBeenCalledWith('nuevo-access', 'nuevo-refresh');
            expect(store().user?.email).toBe('nueva@correo.com');
            expect(store().user?.correo).toBe('nueva@correo.com');
        });

        it('no rompe si no hay usuario en sesion', async () => {
            store().setUser(null);
            vi.mocked(changeEmailApi).mockResolvedValue({
                accessToken: 'a',
                refreshToken: 'r',
                user: { correo: 'x@y.z' },
            } as never);

            await store().changeEmail({ email: 'x@y.z' } as never);

            expect(store().user).toBeNull();
        });

        it('propaga el error sin actualizar el usuario', async () => {
            store().setUser(user());
            vi.mocked(changeEmailApi).mockRejectedValue(new Error('correo en uso'));

            await expect(store().changeEmail({} as never)).rejects.toThrow('correo en uso');
            expect(store().user?.email).toBe('ana@correo.com');
        });
    });

    describe('changePassword', () => {
        it('delega en la API', async () => {
            vi.mocked(changePasswordApi).mockResolvedValue(undefined as never);

            await store().changePassword({ current: 'a', next: 'b' } as never);

            expect(changePasswordApi).toHaveBeenCalledTimes(1);
        });

        it('propaga el error', async () => {
            vi.mocked(changePasswordApi).mockRejectedValue(new Error('contraseña incorrecta'));

            await expect(store().changePassword({} as never)).rejects.toThrow(
                'contraseña incorrecta',
            );
        });
    });

    describe('logout', () => {
        it('limpia la sesión y la batería activa', async () => {
            store().setUser(user());
            store().setRole('profesional');
            store().setProfile({ nombres: 'Ana' } as never);
            store().setLoading(true);
            useBatteryStore.getState().startBattery('99');

            await store().logout();

            expect(logoutFromApi).toHaveBeenCalledTimes(1);
            expect(store().session).toBeNull();
            expect(store().user).toBeNull();
            expect(store().profile).toBeNull();
            expect(store().role).toBeNull();
            expect(store().isLoading).toBe(false);
            expect(useBatteryStore.getState().activeBatteryId).toBeNull();
            expect(useBatteryStore.getState().patientId).toBeNull();
        });

        it('limpia igualmente si la llamada a la API falla', async () => {
            store().setUser(user());
            vi.mocked(logoutFromApi).mockRejectedValue(new Error('sin red'));

            await store().logout();

            expect(store().user).toBeNull();
            expect(store().role).toBeNull();
        });
    });
});
