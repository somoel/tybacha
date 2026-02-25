import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { fetchUserProfile, login } from '@/src/services/authService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email('Ingrese un correo electrónico válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * RF-01: Login screen for both roles (professional and caregiver).
 * Single login form with email validation and error handling.
 */
export default function LoginScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { setSession, setRole } = useAuthStore();

    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'error' as const });

    const { control, handleSubmit } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            const authData = await login(data.email, data.password);
            setSession(authData.session);

            if (authData.session?.user) {
                const profile = await fetchUserProfile(authData.session.user.id);
                if (profile) {
                    setRole(profile.role);
                }
            }

            router.replace('/(app)/home' as never);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error inesperado al iniciar sesión.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header gradient */}
                <LinearGradient
                    colors={['#006d77', '#80cbc4']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="heart-pulse" size={48} color="white" />
                    <Text style={styles.appName}>Tybachá</Text>
                    <Text style={styles.subtitle}>Senior Fitness Test</Text>
                </LinearGradient>

                {/* Login form */}
                <View style={styles.formContainer}>
                    <Text style={styles.welcomeText}>Bienvenido</Text>
                    <Text style={styles.instructions}>
                        Ingrese sus credenciales para continuar
                    </Text>

                    <AppInput
                        control={control}
                        name="email"
                        label="Correo electrónico"
                        placeholder="ejemplo@correo.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        accessibilityLabel="Correo electrónico"
                    />

                    <AppInput
                        control={control}
                        name="password"
                        label="Contraseña"
                        placeholder="Mínimo 8 caracteres"
                        secureTextEntry
                        accessibilityLabel="Contraseña"
                    />

                    <View style={styles.rememberRow}>
                        <Checkbox
                            status={rememberMe ? 'checked' : 'unchecked'}
                            onPress={() => setRememberMe(!rememberMe)}
                            color={theme.colors.primary}
                        />
                        <Text
                            style={styles.rememberText}
                            onPress={() => setRememberMe(!rememberMe)}
                        >
                            Recordarme
                        </Text>
                    </View>

                    <AppButton
                        label="Iniciar sesión"
                        onPress={handleSubmit(onSubmit)}
                        variant="filled"
                        loading={isLoading}
                        icon="login"
                        accessibilityLabel="Iniciar sesión"
                    />
                </View>
            </ScrollView>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scroll: {
        flexGrow: 1,
    },
    header: {
        paddingTop: 80,
        paddingBottom: 48,
        alignItems: 'center',
        gap: 8,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    appName: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 32,
        color: '#FFFFFF',
        marginTop: 8,
    },
    subtitle: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
    },
    formContainer: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    welcomeText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 24,
        color: '#1f2937',
        marginBottom: 4,
    },
    instructions: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 4,
    },
    rememberText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        color: '#374151',
    },
});
