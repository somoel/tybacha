import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

interface AppLoaderProps {
    message?: string;
    size?: 'small' | 'large';
}

/**
 * Centered loading indicator with optional message.
 */
export function AppLoader({ message, size = 'large' }: AppLoaderProps) {
    return (
        <View style={styles.container} accessibilityRole="progressbar">
            <ActivityIndicator
                animating
                size={size}
                color="#006d77"
            />
            {message && <Text style={styles.text}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    text: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        color: '#374151',
        marginTop: 16,
        textAlign: 'center',
    },
});
