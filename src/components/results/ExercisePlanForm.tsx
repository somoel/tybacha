import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { createExercisePlan, updateExercisePlan } from '@/src/services/exercisePlanService';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { z } from 'zod';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

const exerciseSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido').max(160),
    descripcion: z.string().optional(),
    series: z.string().optional(),
    repeticiones: z.string().optional(),
    duracionSegundos: z.string().optional(),
    descansoSegundos: z.string().optional(),
    dificultad: z.enum(['bajo', 'medio', 'alto']),
    instrucciones: z.string().optional(),
});

const planFormSchema = z.object({
    titulo: z.string().min(1, 'Titulo requerido').max(160),
    objetivo: z.string().optional(),
    nivelDificultad: z.enum(['bajo', 'medio', 'alto']),
    ejercicios: z.array(exerciseSchema).length(5),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export interface ExercisePlanFormData {
    titulo: string;
    objetivo?: string;
    nivelDificultad: 'bajo' | 'medio' | 'alto';
    ejercicios: {
        nombre: string;
        descripcion?: string;
        series?: number;
        repeticiones?: number;
        duracionSegundos?: number;
        descansoSegundos?: number;
        dificultad: 'bajo' | 'medio' | 'alto';
        instrucciones?: string;
    }[];
}

interface ExercisePlanFormProps {
    patientId: string;
    initialData?: ExercisePlanFormData | null;
    isAiFailed?: boolean;
    aiError?: string | null;
    editMode?: boolean;
    planId?: string;
    hideActions?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

function makeDefaultValues(data?: ExercisePlanFormData | null): PlanFormValues {
    const toStr = (v: number | null | undefined) => v != null ? String(v) : '';
    return {
        titulo: data?.titulo ?? 'Plan semanal personalizado',
        objetivo: data?.objetivo ?? '',
        nivelDificultad: data?.nivelDificultad ?? 'bajo',
        ejercicios: DIAS.map((_, i) => ({
            nombre: data?.ejercicios?.[i]?.nombre ?? '',
            descripcion: data?.ejercicios?.[i]?.descripcion ?? '',
            series: toStr(data?.ejercicios?.[i]?.series),
            repeticiones: toStr(data?.ejercicios?.[i]?.repeticiones),
            duracionSegundos: toStr(data?.ejercicios?.[i]?.duracionSegundos),
            descansoSegundos: toStr(data?.ejercicios?.[i]?.descansoSegundos),
            dificultad: data?.ejercicios?.[i]?.dificultad ?? 'bajo',
            instrucciones: data?.ejercicios?.[i]?.instrucciones ?? '',
        })),
    };
}

export interface ExercisePlanFormHandle {
    submit: () => void;
    isSaving: boolean;
}

export const ExercisePlanForm = forwardRef<ExercisePlanFormHandle, ExercisePlanFormProps>(function ExercisePlanForm(
    {
        patientId,
        initialData,
        isAiFailed = false,
        aiError,
        editMode = false,
        planId,
        hideActions = false,
        onSuccess,
        onCancel,
    },
    ref,
) {
    const theme = useTheme();
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit } = useForm<PlanFormValues>({
        resolver: zodResolver(planFormSchema),
        defaultValues: makeDefaultValues(initialData),
    });

    useImperativeHandle(ref, () => ({
        submit: handleSubmit(onSubmit),
        isSaving,
    }));

    const onSubmit = async (data: PlanFormValues) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const ejercicios = DIAS.map((dia, i) => {
                const ex = data.ejercicios[i];
                const parseNum = (v: string | undefined) => {
                    if (!v) return undefined;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : undefined;
                };
                return {
                    diaSemana: dia,
                    nombre: ex.nombre,
                    descripcion: ex.descripcion || undefined,
                    series: parseNum(ex.series),
                    repeticiones: parseNum(ex.repeticiones),
                    duracionSegundos: parseNum(ex.duracionSegundos),
                    descansoSegundos: parseNum(ex.descansoSegundos),
                    dificultad: ex.dificultad,
                    instrucciones: ex.instrucciones || undefined,
                };
            });

            const planData = {
                titulo: data.titulo,
                objetivo: data.objetivo || undefined,
                nivelDificultad: data.nivelDificultad,
                ejercicios,
            };

            if (editMode && planId) {
                await updateExercisePlan(planId, planData);
            } else {
                await createExercisePlan(patientId, {
                    ...planData,
                    origen: initialData ? 'mixto' : 'manual',
                });
            }

            setSnackbar({ visible: true, message: editMode ? 'Plan actualizado exitosamente' : 'Plan guardado exitosamente', type: 'success' });
            setTimeout(() => onSuccess?.(), 1000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al guardar el plan.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {isAiFailed && aiError && (
                <View style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{aiError}</Text>
                </View>
            )}

            <Text style={styles.sectionTitle}>
                {editMode ? 'Editar plan de ejercicios' : initialData ? 'Revisar plan generado' : 'Crear plan manual'}
            </Text>
            <Text style={styles.sectionSubtitle}>
                {editMode
                    ? 'Modifica los datos del plan y sus ejercicios.'
                    : initialData
                        ? 'Modifica los ejercicios antes de guardar.'
                        : 'Completa los datos de los 5 ejercicios semanales.'}
            </Text>

            <AppInput control={control} name="titulo" label="Titulo del plan *" accessibilityLabel="Titulo del plan" />
            <AppInput control={control} name="objetivo" label="Objetivo" multiline numberOfLines={2} accessibilityLabel="Objetivo del plan" />

            <Text style={styles.fieldLabel}>Dificultad general</Text>
            <Controller
                control={control}
                name="nivelDificultad"
                render={({ field: { onChange, value } }) => (
                    <SegmentedButtons
                        value={value}
                        onValueChange={onChange}
                        buttons={[
                            { value: 'bajo', label: 'Bajo' },
                            { value: 'medio', label: 'Medio' },
                            { value: 'alto', label: 'Alto' },
                        ]}
                        style={styles.segmented}
                    />
                )}
            />

            {DIAS.map((dia, index) => (
                <AppCard key={dia} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                        <View style={[styles.dayBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Text style={[styles.dayNumber, { color: theme.colors.onPrimaryContainer }]}>
                                {index + 1}
                            </Text>
                        </View>
                        <Text style={styles.dayName}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</Text>
                    </View>

                    <AppInput
                        control={control}
                        name={`ejercicios.${index}.nombre`}
                        label="Nombre del ejercicio *"
                        accessibilityLabel={`Nombre ejercicio ${dia}`}
                    />
                    <AppInput
                        control={control}
                        name={`ejercicios.${index}.descripcion`}
                        label="Descripcion"
                        multiline
                        numberOfLines={2}
                        accessibilityLabel={`Descripcion ejercicio ${dia}`}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <AppInput
                                control={control}
                                name={`ejercicios.${index}.series`}
                                label="Series"
                                keyboardType="numeric"
                                accessibilityLabel={`Series ejercicio ${dia}`}
                            />
                        </View>
                        <View style={styles.halfField}>
                            <AppInput
                                control={control}
                                name={`ejercicios.${index}.repeticiones`}
                                label="Repeticiones"
                                keyboardType="numeric"
                                accessibilityLabel={`Repeticiones ejercicio ${dia}`}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            <AppInput
                                control={control}
                                name={`ejercicios.${index}.duracionSegundos`}
                                label="Duracion (s)"
                                keyboardType="numeric"
                                accessibilityLabel={`Duracion ejercicio ${dia}`}
                            />
                        </View>
                        <View style={styles.halfField}>
                            <AppInput
                                control={control}
                                name={`ejercicios.${index}.descansoSegundos`}
                                label="Descanso (s)"
                                keyboardType="numeric"
                                accessibilityLabel={`Descanso ejercicio ${dia}`}
                            />
                        </View>
                    </View>

                    <Text style={styles.fieldLabel}>Dificultad</Text>
                    <Controller
                        control={control}
                        name={`ejercicios.${index}.dificultad`}
                        render={({ field: { onChange, value } }) => (
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: 'bajo', label: 'Bajo' },
                                    { value: 'medio', label: 'Medio' },
                                    { value: 'alto', label: 'Alto' },
                                ]}
                                style={styles.segmented}
                            />
                        )}
                    />

                    <AppInput
                        control={control}
                        name={`ejercicios.${index}.instrucciones`}
                        label="Instrucciones para el cuidador"
                        multiline
                        numberOfLines={2}
                        accessibilityLabel={`Instrucciones ejercicio ${dia}`}
                    />
                </AppCard>
            ))}

            {!hideActions && (
                <View style={styles.actions}>
                    {onCancel && (
                        <AppButton
                            label="Cancelar"
                            variant="outlined"
                            onPress={onCancel}
                            disabled={isSaving}
                            style={styles.cancelButton}
                        />
                    )}
                    <AppButton
                        label={isSaving ? (editMode ? 'Actualizando...' : 'Guardando...') : (editMode ? 'Actualizar plan' : 'Guardar plan')}
                        variant="filled"
                        icon="content-save"
                        onPress={handleSubmit(onSubmit)}
                        loading={isSaving}
                        disabled={isSaving}
                        accessibilityLabel={editMode ? 'Actualizar plan de ejercicios' : 'Guardar plan de ejercicios'}
                    />
                </View>
            )}

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: { marginTop: 16 },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, flex: 1 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937', marginBottom: 4 },
    sectionSubtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginBottom: 16 },
    fieldLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
        marginTop: 4,
    },
    segmented: { marginBottom: 16 },
    exerciseCard: { marginBottom: 12 },
    exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    dayBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    dayNumber: { fontFamily: 'Montserrat_700Bold', fontSize: 14 },
    dayName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    row: { flexDirection: 'row', gap: 8 },
    halfField: { flex: 1 },
    actions: { marginTop: 8, gap: 12 },
    cancelButton: { alignSelf: 'flex-start' },
});
