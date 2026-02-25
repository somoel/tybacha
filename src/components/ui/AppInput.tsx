import { borderRadius } from '@/src/constants/theme';
import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

interface AppInputProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
    multiline?: boolean;
    numberOfLines?: number;
    disabled?: boolean;
    accessibilityLabel?: string;
    left?: React.ReactNode;
    right?: React.ReactNode;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

/**
 * TextInput integrated with React Hook Form and validation display.
 * Shows error messages from Zod validation below the input.
 */
export function AppInput<T extends FieldValues>({
    control,
    name,
    label,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    disabled = false,
    accessibilityLabel,
    left,
    right,
    autoCapitalize = 'sentences',
}: AppInputProps<T>) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={styles.container}>
                    <TextInput
                        mode="outlined"
                        label={label}
                        placeholder={placeholder}
                        value={typeof value === 'string' ? value : String(value ?? '')}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={secureTextEntry}
                        keyboardType={keyboardType}
                        multiline={multiline}
                        numberOfLines={numberOfLines}
                        disabled={disabled}
                        error={!!error}
                        accessibilityLabel={accessibilityLabel ?? label}
                        style={styles.input}
                        outlineStyle={styles.outline}
                        left={left}
                        right={right}
                        autoCapitalize={autoCapitalize}
                    />
                    {error && (
                        <HelperText type="error" visible={!!error} style={styles.error}>
                            {error.message}
                        </HelperText>
                    )}
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
    },
    input: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
    },
    outline: {
        borderRadius: borderRadius.md,
    },
    error: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
    },
});
