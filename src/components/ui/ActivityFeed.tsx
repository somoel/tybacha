import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export interface ActivityItem {
    patientName: string;
    action: string;
    date: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconColor?: string;
}

interface ActivityFeedProps {
    items: ActivityItem[];
    maxItems?: number;
}

/**
 * Recent activity feed showing latest exercise completions and events.
 */
export function ActivityFeed({ items, maxItems = 5 }: ActivityFeedProps) {
    const visibleItems = items.slice(0, maxItems);

    if (visibleItems.length === 0) return null;

    return (
        <View style={styles.container}>
            {visibleItems.map((item, index) => (
                <View key={`${item.patientName}-${item.date}-${index}`} style={styles.item}>
                    <View style={[styles.iconContainer, { backgroundColor: item.iconColor ?? '#e8f5e9' }]}>
                        <MaterialCommunityIcons
                            name={item.icon}
                            size={16}
                            color={item.iconColor ? '#FFFFFF' : '#2e7d32'}
                        />
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.patientName} numberOfLines={1}>{item.patientName}</Text>
                        <Text style={styles.action} numberOfLines={1}>{item.action}</Text>
                    </View>
                    <Text style={styles.time}>
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: es })}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 0,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f3f6',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        gap: 1,
    },
    patientName: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#1f2937',
    },
    action: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
    },
    time: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 11,
        color: '#94a3b8',
    },
});
