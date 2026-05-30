import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ApiNotification } from '@/src/types/apiNotification.types';

interface NotificationItemProps {
    notification: ApiNotification;
    onPress: (notification: ApiNotification) => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
    recordatorio_ejercicio: { icon: 'calendar-clock', color: '#006d77' },
    cumplimiento: { icon: 'check-circle-outline', color: '#2e7d32' },
    progreso: { icon: 'trending-up', color: '#f59e0b' },
    sistema: { icon: 'information-outline', color: '#6b7280' },
    otro: { icon: 'bell-outline', color: '#6b7280' },
};

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    if (diffDay < 7) return `Hace ${diffDay}d`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
    const isUnread = !notification.leidaEn;
    const config = TYPE_CONFIG[notification.tipoNotificacion] ?? TYPE_CONFIG.otro;
    const relativeTime = useMemo(() => formatRelativeTime(notification.creadoEn), [notification.creadoEn]);

    return (
        <Pressable
            style={({ pressed }) => [styles.container, isUnread && styles.unread, pressed && styles.pressed]}
            onPress={() => onPress(notification)}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
                <MaterialCommunityIcons name={config.icon as never} size={22} color={config.color} />
            </View>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
                        {notification.titulo}
                    </Text>
                    <Text style={styles.time}>{relativeTime}</Text>
                </View>
                <Text style={styles.message} numberOfLines={2}>
                    {notification.mensaje}
                </Text>
            </View>
            {isUnread && <View style={styles.badge} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fafafa',
    },
    unread: {
        backgroundColor: '#f0f9ff',
    },
    pressed: {
        backgroundColor: '#e5e7eb',
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#374151',
        flex: 1,
        marginRight: 8,
    },
    titleUnread: {
        fontFamily: 'Montserrat_700Bold',
        color: '#1f2937',
    },
    time: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#9ca3af',
    },
    message: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    badge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#006d77',
        marginLeft: 8,
        marginTop: 6,
    },
});
