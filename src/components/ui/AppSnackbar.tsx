import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';

interface AppSnackbarProps {
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
    onDismiss: () => void;
    duration?: number;
    action?: {
        label: string;
        onPress: () => void;
    };
}

/**
 * Themed Snackbar for success, error, and info messages.
 */
export function AppSnackbar({
    visible,
    message,
    type = 'info',
    onDismiss,
    duration = 3000,
    action,
}: AppSnackbarProps) {
    const getBackgroundColor = useCallback(() => {
        switch (type) {
            case 'success':
                return '#2e7d32';
            case 'error':
                return '#c62828';
            case 'info':
                return '#1f2937';
        }
    }, [type]);

    return (
        <Snackbar
            visible={visible}
            onDismiss={onDismiss}
            duration={duration}
            action={action}
            style={[styles.snackbar, { backgroundColor: getBackgroundColor() }]}
        >
            <Text style={styles.text}>{message}</Text>
        </Snackbar>
    );
}

const styles = StyleSheet.create({
    snackbar: {
        borderRadius: 12,
        marginBottom: 16,
    },
    text: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        color: '#FFFFFF',
    },
});
