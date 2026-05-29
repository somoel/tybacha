import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

type BadgeStatus = 'healthy' | 'warning' | 'urgent' | 'neutral';

interface StatusBadgeProps {
    status: BadgeStatus;
    label: string;
    size?: 'small' | 'medium';
    style?: ViewStyle;
}

const STATUS_CONFIG: Record<BadgeStatus, { bg: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
    healthy: { bg: '#e8f5e9', color: '#2e7d32', icon: 'check-circle' },
    warning: { bg: '#fff3e0', color: '#f57c00', icon: 'alert-circle' },
    urgent: { bg: '#ffebee', color: '#c62828', icon: 'alert' },
    neutral: { bg: '#f0f3f6', color: '#6b7280', icon: 'minus-circle' },
};

/**
 * Color-coded status badge with icon and text label.
 * Uses redundant encoding (color + icon + text) for accessibility.
 */
export function StatusBadge({ status, label, size = 'small', style }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const iconSize = size === 'small' ? 12 : 14;
    const fontSize = size === 'small' ? 11 : 12;

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
            <MaterialCommunityIcons name={config.icon} size={iconSize} color={config.color} />
            <Text style={[styles.label, { color: config.color, fontSize }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    label: {
        fontFamily: 'Montserrat_600SemiBold',
    },
});
