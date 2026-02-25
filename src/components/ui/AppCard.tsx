import { borderRadius } from '@/src/constants/theme';
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';

interface AppCardProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    elevation?: 0 | 1 | 2 | 3 | 4 | 5;
    accessibilityLabel?: string;
}

/**
 * MD3 Card with subtle elevation and rounded corners.
 */
export function AppCard({
    children,
    onPress,
    style,
    elevation = 1,
    accessibilityLabel,
}: AppCardProps) {
    return (
        <Card
            mode="elevated"
            elevation={elevation}
            onPress={onPress}
            style={[styles.card, style]}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={onPress ? 'button' : undefined}
        >
            <Card.Content style={styles.content}>{children}</Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        marginVertical: 6,
    },
    content: {
        paddingVertical: 12,
    },
});
