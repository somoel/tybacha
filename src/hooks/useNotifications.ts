import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { addNotificationListeners } from '@/src/services/pushNotificationService';
import { useNotificationStore } from '@/src/stores/notificationStore';

export function useNotifications() {
    const router = useRouter();
    const addNotification = useNotificationStore((s) => s.addNotification);
    const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);
    const listenersRef = useRef<{ remove: () => void } | null>(null);

    useEffect(() => {
        listenersRef.current = addNotificationListeners({
            onReceived: (notification) => {
                const data = notification.request.content.data;
                addNotification({
                    idNotificacion: Date.now(),
                    idAlertaProgramada: null,
                    idUsuarioDestinatario: 0,
                    idAdultoMayor: typeof data?.idAdultoMayor === 'number' ? data.idAdultoMayor : null,
                    tipoNotificacion: (typeof data?.tipo === 'string' ? data.tipo : 'sistema') as 'sistema',
                    titulo: notification.request.content.title ?? '',
                    mensaje: notification.request.content.body ?? '',
                    canal: 'push',
                    estado: 'recibida',
                    enviadaEn: null,
                    recibidaEn: new Date().toISOString(),
                    leidaEn: null,
                    errorEnvio: null,
                    creadoEn: new Date().toISOString(),
                });
            },
            onTapped: (response) => {
                const data = response.notification.request.content.data;
                if (typeof data?.idAdultoMayor === 'number') {
                    router.push(`/(app)/patients/${data.idAdultoMayor}` as never);
                } else {
                    router.push('/(app)/notifications' as never);
                }
            },
        });

        refreshUnreadCount();

        return () => {
            listenersRef.current?.remove();
            listenersRef.current = null;
        };
    }, [addNotification, refreshUnreadCount, router]);
}
