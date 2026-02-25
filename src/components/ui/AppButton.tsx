import { borderRadius } from '@/src/constants/theme';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

type ButtonVariant = 'filled' | 'outlined' | 'text' | 'outlined-error';

interface AppButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    icon?: string;
    accessibilityLabel?: string;
    style?: object;
}

/**
 * Themed button with filled, outlined, text, and outlined-error variants.
 * Includes loading spinner and disabled state with proper opacity.
 */
export function AppButton({
    label,
    onPress,
    variant = 'filled',
    loading = false,
    disabled = false,
    icon,
    accessibilityLabel,
    style,
}: AppButtonProps) {
    const getMode = (): 'contained' | 'outlined' | 'text' => {
        switch (variant) {
            case 'filled':
                return 'contained';
            case 'outlined':
            case 'outlined-error':
                return 'outlined';
            case 'text':
                return 'text';
        }
    };

    const isError = variant === 'outlined-error';

    return (
        <Button
            mode={getMode()}
            onPress={onPress}
            loading={loading}
            disabled={disabled || loading}
            icon={icon}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityRole="button"
            style={[
                styles.button,
                isError && styles.errorButton,
                disabled && styles.disabled,
                style,
            ]}
            labelStyle={[
                styles.label,
                isError && styles.errorLabel,
            ]}
            contentStyle={styles.content}
            buttonColor={isError ? 'transparent' : undefined}
            textColor={isError ? '#c62828' : undefined}
        >
            {loading ? '' : label}
        </Button>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.md,
        minWidth: 120,
    },
    content: {
        minHeight: 48,
        paddingHorizontal: 16,
    },
    label: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    errorButton: {
        borderColor: '#c62828',
        borderWidth: 1,
    },
    errorLabel: {
        color: '#c62828',
    },
    disabled: {
        opacity: 0.38,
    },
});
