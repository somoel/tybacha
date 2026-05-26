import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppButton } from './AppButton';

interface DateFieldProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    maximumDate?: Date;
    accessibilityLabel?: string;
}

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string): Date | null {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatDisplayDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function DateField({
    label,
    value,
    onChange,
    maximumDate,
    accessibilityLabel,
}: DateFieldProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            {Platform.OS === 'web' ? (
                React.createElement('input', {
                    'aria-label': accessibilityLabel ?? label,
                    max: maximumDate ? toDateInputValue(maximumDate) : undefined,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        const date = fromDateInputValue(event.target.value);
                        if (date) onChange(date);
                    },
                    style: webInputStyle,
                    type: 'date',
                    value: toDateInputValue(value),
                })
            ) : (
                <>
                    <AppButton
                        label={formatDisplayDate(value)}
                        variant="outlined"
                        icon="calendar"
                        onPress={() => setShowDatePicker(true)}
                        accessibilityLabel={accessibilityLabel ?? label}
                        style={styles.dateButton}
                    />
                    {showDatePicker && (
                        <DateTimePicker
                            value={value}
                            mode="date"
                            maximumDate={maximumDate}
                            onChange={(_, date) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (date) onChange(date);
                            }}
                        />
                    )}
                </>
            )}
        </View>
    );
}

const webInputStyle: React.CSSProperties = {
    borderColor: '#b8c3cc',
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    color: '#1f2937',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    minHeight: 50,
    outlineColor: '#006d77',
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 12,
    width: 210,
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
        marginTop: 4,
    },
    dateButton: {
        alignSelf: 'flex-start',
    },
});
