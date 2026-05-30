import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotificationStore } from '@/src/stores/notificationStore';

interface NotificationFiltersProps {
    active: 'all' | 'unread';
    onChange: (filter: 'all' | 'unread') => void;
}

export function NotificationFilters({ active, onChange }: NotificationFiltersProps) {
    const unreadCount = useNotificationStore((s) => s.unreadCount);

    return (
        <View style={styles.container}>
            <Pressable
                style={[styles.chip, active === 'all' && styles.chipActive]}
                onPress={() => onChange('all')}
            >
                <Text style={[styles.chipText, active === 'all' && styles.chipTextActive]}>
                    Todas
                </Text>
            </Pressable>
            <Pressable
                style={[styles.chip, active === 'unread' && styles.chipActive]}
                onPress={() => onChange('unread')}
            >
                <Text style={[styles.chipText, active === 'unread' && styles.chipTextActive]}>
                    No leidas
                </Text>
                {unreadCount > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        gap: 6,
    },
    chipActive: {
        backgroundColor: '#006d77',
    },
    chipText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#4b5563',
    },
    chipTextActive: {
        color: '#ffffff',
    },
    countBadge: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    countText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 11,
        color: '#006d77',
    },
});
