import { borderRadius } from '@/src/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface AppErrorScreenProps {
    error?: Error | null;
    onRetry?: () => void;
    onGoHome?: () => void;
}

/**
 * Pantalla de error recuperable. Evita que un fallo de render deje la app en blanco.
 */
export function AppErrorScreen({ error, onRetry, onGoHome }: AppErrorScreenProps) {
    const goHome = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.assign('/');
            return;
        }
        onGoHome?.();
    };

    return (
        <View style={styles.container} accessibilityRole="alert">
            <View style={styles.card}>
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#c62828" />
                <Text style={styles.title}>Algo salió mal</Text>
                <Text style={styles.message}>
                    No pudimos mostrar esta pantalla. Puedes reintentar o volver al inicio.
                </Text>
                {__DEV__ && !!error && <Text style={styles.detail}>{error.message}</Text>}
                <View style={styles.actions}>
                    {!!onRetry && (
                        <Pressable
                            onPress={onRetry}
                            style={styles.primaryButton}
                            accessibilityRole="button"
                            accessibilityLabel="Reintentar"
                        >
                            <Text style={styles.primaryButtonText}>Reintentar</Text>
                        </Pressable>
                    )}
                    <Pressable
                        onPress={goHome}
                        style={styles.secondaryButton}
                        accessibilityRole="button"
                        accessibilityLabel="Volver al inicio"
                    >
                        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

interface AppErrorBoundaryProps {
    children: React.ReactNode;
    onReset?: () => void;
}

interface AppErrorBoundaryState {
    error: Error | null;
}

/**
 * Captura errores de render, los registra y muestra una pantalla recuperable
 * en lugar de desmontar toda la app.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[AppErrorBoundary]', error, info.componentStack);
    }

    private handleRetry = () => {
        this.setState({ error: null });
        this.props.onReset?.();
    };

    private handleGoHome = () => {
        this.setState({ error: null });
        this.props.onReset?.();
    };

    render() {
        const { error } = this.state;
        if (!error) {
            return this.props.children;
        }

        return <AppErrorScreen error={error} onRetry={this.handleRetry} onGoHome={this.handleGoHome} />;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },
    card: {
        width: '100%',
        maxWidth: 480,
        alignItems: 'center',
        padding: 24,
        borderRadius: borderRadius.lg,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    title: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 18,
        color: '#374151',
        marginTop: 12,
    },
    message: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        lineHeight: 20,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    detail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#c62828',
        marginTop: 12,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
    },
    primaryButton: {
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: borderRadius.md,
        backgroundColor: '#006d77',
    },
    primaryButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#ffffff',
    },
    secondaryButton: {
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    secondaryButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#374151',
    },
});
