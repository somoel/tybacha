import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApiNotifications, markApiNotificationsRead } from '@/src/api/notificationsApi';
import { useNotificationStore } from '@/src/stores/notificationStore';
import type { ApiNotification } from '@/src/types/apiNotification.types';

vi.mock('@/src/api/notificationsApi', () => ({
    fetchApiNotifications: vi.fn(),
    markApiNotificationsRead: vi.fn(),
    registerApiPushToken: vi.fn(),
}));

const store = () => useNotificationStore.getState();

function notification(id: number, leidaEn: string | null = null): ApiNotification {
    return { idNotificacion: id, leidaEn } as unknown as ApiNotification;
}

describe('notificationStore', () => {
    beforeEach(() => {
        store().notifications = [];
        store().unreadCount = 0;
        store().isLoading = false;
        vi.mocked(fetchApiNotifications).mockReset();
        vi.mocked(markApiNotificationsRead).mockReset();
    });

    describe('fetchNotifications', () => {
        it('carga y recalcula el contador de no leídas', async () => {
            vi.mocked(fetchApiNotifications).mockResolvedValue([
                notification(1),
                notification(2),
                notification(3, '2026-01-01T00:00:00Z'),
            ] as never);

            await store().fetchNotifications();

            expect(fetchApiNotifications).toHaveBeenCalledWith(false, 100);
            expect(store().notifications).toHaveLength(3);
            expect(store().unreadCount).toBe(2);
            expect(store().isLoading).toBe(false);
        });

        it('marca isLoading mientras llama a la API', async () => {
            vi.mocked(fetchApiNotifications).mockResolvedValue([] as never);
            await store().fetchNotifications();
            expect(store().isLoading).toBe(false);
        });

        it('si la API falla deja isLoading en false', async () => {
            vi.mocked(fetchApiNotifications).mockRejectedValue(new Error('sin red'));

            await store().fetchNotifications();

            expect(store().isLoading).toBe(false);
            expect(store().notifications).toEqual([]);
        });

        it('pasa el filtro de no leídas cuando se pide', async () => {
            vi.mocked(fetchApiNotifications).mockResolvedValue([notification(1)] as never);

            await store().fetchNotifications(true);

            expect(fetchApiNotifications).toHaveBeenCalledWith(true, 100);
        });
    });

    describe('markAsRead', () => {
        it('actualiza de forma optimista las notificaciones marcadas', async () => {
            store().notifications = [notification(1), notification(2)];
            store().unreadCount = 2;
            vi.mocked(markApiNotificationsRead).mockResolvedValue(undefined as never);

            await store().markAsRead([1]);

            expect(markApiNotificationsRead).toHaveBeenCalledWith([1]);
            expect(store().notifications[0].leidaEn).not.toBeNull();
            expect(store().notifications[1].leidaEn).toBeNull();
            expect(store().unreadCount).toBe(1);
        });

        it('el contador nunca baja de cero', async () => {
            store().notifications = [notification(1), notification(2)];
            store().unreadCount = 1;
            vi.mocked(markApiNotificationsRead).mockResolvedValue(undefined as never);

            await store().markAsRead([1, 2]);

            expect(store().unreadCount).toBe(0);
        });

        it('no cambia nada si la API falla', async () => {
            store().notifications = [notification(1)];
            store().unreadCount = 1;
            vi.mocked(markApiNotificationsRead).mockRejectedValue(new Error('fallo'));

            await store().markAsRead([1]);

            expect(store().notifications[0].leidaEn).toBeNull();
            expect(store().unreadCount).toBe(1);
        });
    });

    describe('refreshUnreadCount', () => {
        it('cuenta solo las no leídas devueltas', async () => {
            vi.mocked(fetchApiNotifications).mockResolvedValue([
                notification(1),
                notification(2),
            ] as never);

            await store().refreshUnreadCount();

            expect(store().unreadCount).toBe(2);
        });

        it('conserva el contador si la API falla', async () => {
            store().unreadCount = 5;
            vi.mocked(fetchApiNotifications).mockRejectedValue(new Error('fallo'));

            await store().refreshUnreadCount();

            expect(store().unreadCount).toBe(5);
        });
    });

    describe('addNotification', () => {
        it('prepend y suma al contador', () => {
            store().addNotification(notification(10));
            store().addNotification(notification(11));

            expect(store().notifications.map((n) => n.idNotificacion)).toEqual([11, 10]);
            expect(store().unreadCount).toBe(2);
        });

        it('ignora duplicados por idNotificacion', () => {
            store().addNotification(notification(10));
            store().addNotification(notification(10));

            expect(store().notifications).toHaveLength(1);
            expect(store().unreadCount).toBe(1);
        });
    });
});
