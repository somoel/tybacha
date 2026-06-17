import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDays, format, isAfter, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type DayState =
    | 'completed'
    | 'omitted'
    | 'pending'
    | 'empty'
    | 'future'
    | 'no-exercise';

interface MonthlyCalendarProps {
    month: Date;
    onMonthChange: (date: Date) => void;
    dayStates: Record<string, DayState>;
    selectedDate: string | null;
    onSelectDate: (dateKey: string | null) => void;
    todayKey: string;
    hasTodayButton?: boolean;
    onTodayPress?: () => void;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getDateKey(d: Date): string {
    return format(d, 'yyyy-MM-dd');
}

function getMonthGrid(month: Date): Date[] {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
        days.push(addDays(gridStart, i));
    }
    return days;
}

function getDotColor(state: DayState): string | null {
    switch (state) {
        case 'completed': return '#2e7d32';
        case 'omitted': return '#9ca3af';
        case 'pending': return '#2563eb';
        case 'empty': return '#dc2626';
        default: return null;
    }
}

export function MonthlyCalendar({
    month,
    onMonthChange,
    dayStates,
    selectedDate,
    onSelectDate,
    todayKey,
    hasTodayButton = false,
    onTodayPress,
}: MonthlyCalendarProps) {
    const theme = useTheme();
    const monthGrid = useMemo(() => getMonthGrid(month), [month]);
    const todayDate = useMemo(() => new Date(todayKey + 'T00:00:00'), [todayKey]);

    return (
        <View>
            <View style={styles.header}>
                <Pressable
                    onPress={() => onMonthChange(addDays(startOfMonth(month), -1))}
                    hitSlop={8}
                    style={styles.navButton}
                    accessibilityLabel="Mes anterior"
                >
                    <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.primary} />
                </Pressable>

                <Text style={styles.monthLabel}>
                    {format(month, 'MMMM yyyy', { locale: es })}
                </Text>

                <Pressable
                    onPress={() => onMonthChange(addDays(startOfMonth(month), 35))}
                    hitSlop={8}
                    style={styles.navButton}
                    accessibilityLabel="Mes siguiente"
                >
                    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
                </Pressable>

                {hasTodayButton && onTodayPress && (
                    <Pressable
                        onPress={onTodayPress}
                        style={[styles.todayButton, { borderColor: theme.colors.primary }]}
                        accessibilityLabel="Ir al día de hoy"
                    >
                        <Text style={[styles.todayButtonText, { color: theme.colors.primary }]}>Hoy</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.weekLabelsRow}>
                {DAY_LABELS.map((label) => (
                    <Text key={label} style={styles.weekLabel}>
                        {label}
                    </Text>
                ))}
            </View>

            <View style={styles.grid}>
                {monthGrid.map((day) => {
                    const dayKey = getDateKey(day);
                    const inMonth = isSameMonth(day, month);
                    const isToday = isSameDay(day, todayDate);
                    const isSelected = selectedDate === dayKey;
                    const state: DayState = inMonth ? (dayStates[dayKey] ?? 'no-exercise') : 'no-exercise';
                    const dotColor = getDotColor(state);
                    const isFuture = isAfter(startOfDay(day), todayDate);
                    const isSelectable = inMonth && !isFuture;

                    const cellStyle = [
                        styles.dayCell,
                        isSelected && { backgroundColor: theme.colors.primaryContainer },
                        isToday && !isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                    ];

                    const numberStyle = [
                        styles.dayNumber,
                        !inMonth && styles.outOfMonthText,
                        isFuture && inMonth && styles.futureText,
                        isSelected && { color: theme.colors.primary, fontFamily: 'Montserrat_700Bold' },
                        isToday && !isSelected && { color: theme.colors.primary },
                    ];

                    const dotStyle = [
                        styles.dot,
                        !inMonth && styles.hiddenDot,
                    ];

                    return (
                        <Pressable
                            key={dayKey}
                            onPress={() => {
                                if (!isSelectable) return;
                                if (isSelected) onSelectDate(null);
                                else onSelectDate(dayKey);
                            }}
                            disabled={!isSelectable}
                            style={cellStyle}
                            accessibilityLabel={`${format(day, 'EEEE dd MMMM', { locale: es })}${isToday ? ', hoy' : ''}${isSelected ? ', seleccionado' : ''}`}
                        >
                            <Text style={numberStyle}>{format(day, 'd')}</Text>
                            <View
                                style={[
                                    dotStyle,
                                    dotColor ? { backgroundColor: dotColor } : null,
                                ]}
                            />
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
                    <Text style={styles.legendText}>Completado</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
                    <Text style={styles.legendText}>No realizado</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#9ca3af' }]} />
                    <Text style={styles.legendText}>Omitido</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                    <Text style={styles.legendText}>Pendiente</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    navButton: { padding: 4 },
    monthLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
        textTransform: 'capitalize',
        marginHorizontal: 8,
        minWidth: 130,
        textAlign: 'center',
    },
    todayButton: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    todayButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 11,
    },
    weekLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    weekLabel: {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 11,
        color: '#9ca3af',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingVertical: 4,
    },
    dayNumber: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#1f2937',
    },
    outOfMonthText: {
        color: '#d1d5db',
    },
    futureText: {
        color: '#9ca3af',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 3,
    },
    hiddenDot: {
        opacity: 0,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 11,
        color: '#6b7280',
    },
});
