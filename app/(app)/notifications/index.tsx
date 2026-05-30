import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { NotificationItem } from '@/src/components/notifications/NotificationItem';
import { NotificationFilters } from '@/src/components/notifications/NotificationFilters';
import { AppLoader } from '@/src/components/ui/AppLoader';
import type { ApiNotification } from '@/src/types/apiNotification.types';

export default function NotificationsScreen() {
    const { notifications, isLoading, fetchNotifications, markAsRead } = useNotificationStore();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [refreshing, setRefreshing] = useState(false);

    const filteredNotifications = filter === 'unread'
        ? notifications.filter((n) => !n.leidaEn)
        : notifications;

    const load = useCallback(() => {
        fetchNotifications(filter === 'unread');
    }, [filter, fetchNotifications]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handlePress = useCallback((item: ApiNotification) => {
        if (!item.leidaEn) {
            markAsRead([item.idNotificacion]);
        }
    }, [markAsRead]);

    if (isLoading && notifications.length === 0) {
        return <AppLoader />;
    }

    return (
        <View style={styles.container}>
            <NotificationFilters active={filter} onChange={setFilter} />
            <FlatList
                data={filteredNotifications}
                keyExtractor={(item) => String(item.idNotificacion)}
                renderItem={({ item }) => (
                    <NotificationItem notification={item} onPress={handlePress} />
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>&#128276;</Text>
                        <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                        <Text style={styles.emptyMessage}>
                            {filter === 'unread'
                                ? 'No tienes notificaciones sin leer'
                                : 'Aun no tienes notificaciones'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    list: {
        paddingVertical: 8,
    },
    emptyContainer: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 64,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#1f2937',
        marginBottom: 8,
    },
    emptyMessage: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
});
