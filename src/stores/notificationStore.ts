import { create } from 'zustand';
import { fetchApiNotifications, markApiNotificationsRead } from '@/src/api/notificationsApi';
import type { ApiNotification } from '@/src/types/apiNotification.types';

interface NotificationState {
    notifications: ApiNotification[];
    unreadCount: number;
    isLoading: boolean;

    fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
    markAsRead: (ids: number[]) => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
    addNotification: (notification: ApiNotification) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async (unreadOnly = false) => {
        set({ isLoading: true });
        try {
            const notifications = await fetchApiNotifications(unreadOnly, 100);
            const unreadCount = notifications.filter((n) => !n.leidaEn).length;
            set({ notifications, unreadCount, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    markAsRead: async (ids: number[]) => {
        try {
            await markApiNotificationsRead(ids);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    ids.includes(n.idNotificacion)
                        ? { ...n, leidaEn: new Date().toISOString() }
                        : n,
                ),
                unreadCount: Math.max(0, state.unreadCount - ids.length),
            }));
        } catch {
            // silent
        }
    },

    refreshUnreadCount: async () => {
        try {
            const notifications = await fetchApiNotifications(true, 100);
            set({ unreadCount: notifications.length });
        } catch {
            // silent
        }
    },

    addNotification: (notification: ApiNotification) => {
        set((state) => {
            if (state.notifications.some((n) => n.idNotificacion === notification.idNotificacion)) {
                return state;
            }
            return {
                notifications: [notification, ...state.notifications],
                unreadCount: state.unreadCount + 1,
            };
        });
    },
}));
