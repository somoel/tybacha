import { AppDialogActions } from '@/src/components/ui/AppDialogActions';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { GlobalSnackbar } from '@/src/components/ui/GlobalSnackbar';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchPatientById } from '@/src/services/patientService';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Patient } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, useTheme } from 'react-native-paper';

/**
 * App layout with Bottom Navigation Bar (5 tabs).
 * Shows offline banner when disconnected.
 * Guards every route in the group: without a valid session it bounces to login.
 * Offers to resume an unfinished SFT battery draft after a reload/restart.
 */
export default function AppLayout() {
    const { isLoading, isAuthenticated } = useAuthGuard();
    const theme = useTheme();
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin, isCaregiver, isProfessional } = usePermissions();
    const isOnline = useSyncStore((s) => s.isOnline);

    // Auto-sincroniza la cola offline al recuperar conexión desde cualquier pantalla.
    useSyncQueue();

    const activeBatteryId = useBatteryStore((s) => s.activeBatteryId);
    const patientId = useBatteryStore((s) => s.patientId);
    const completedTests = useBatteryStore((s) => s.completedTests);
    const clearSession = useBatteryStore((s) => s.clearSession);

    const [batteryHydrated, setBatteryHydrated] = useState(() =>
        useBatteryStore.persist.hasHydrated(),
    );
    // Posposición del aviso (X o clic fuera): solo dura esta carga de la app.
    const [resumeLater, setResumeLater] = useState(false);
    const [patient, setPatient] = useState<Patient | null>(null);

    useEffect(() => {
        const unsubscribe = useBatteryStore.persist.onFinishHydration(() => {
            setBatteryHydrated(true);
        });
        if (useBatteryStore.persist.hasHydrated()) {
            setBatteryHydrated(true);
        }
        return unsubscribe;
    }, []);

    // Al desaparecer el borrador (descartado o batería finalizada) el aviso
    // vuelve a estar en oferta por si aparece una sesión nueva en esta carga.
    useEffect(() => {
        if (!activeBatteryId) setResumeLater(false);
    }, [activeBatteryId]);

    const dismissResumeDialog = () => setResumeLater(true);

    const isBatteryFlowRoute =
        pathname.includes('/tests/') ||
        pathname.endsWith('/batteries/new') ||
        pathname.endsWith('/batteries/summary');
    // Solo quien puede registrar SFT retoma borradores (los cuidadores no).
    const canRegisterSft = isAdmin || isProfessional;
    const showResumeDialog = Boolean(
        batteryHydrated &&
            activeBatteryId &&
            patientId &&
            canRegisterSft &&
            !isBatteryFlowRoute &&
            !resumeLater,
    );

    // Best-effort: si no hay red o falla, el dialogo usa "este adulto mayor".
    const fetchedPatientRef = useRef<string | null>(null);
    useEffect(() => {
        if (!showResumeDialog || !patientId) return;
        if (fetchedPatientRef.current === patientId) return;
        fetchedPatientRef.current = patientId;
        let cancelled = false;
        setPatient(null);
        fetchPatientById(patientId)
            .then((fetched) => {
                if (!cancelled) setPatient(fetched);
            })
            .catch((error) => {
                console.error('No se pudo cargar el nombre del adulto mayor:', error);
            });
        return () => {
            cancelled = true;
        };
    }, [showResumeDialog, patientId]);

    const patientName =
        patient == null
            ? null
            : [
                patient.first_name,
                patient.second_name,
                patient.first_lastname,
                patient.second_lastname,
            ]
                .filter(Boolean)
                .join(' ') || null;

    if (isLoading) {
        return <AppLoader message="Cargando Tybacha..." />;
    }

    if (!isAuthenticated) {
        return <Redirect href={'/(auth)/login' as never} />;
    }

    const isHome = pathname === '/home' || pathname === '/';
    const hideTabBar =
        /\/patients\/[^/]+/.test(pathname) ||
        /\/caregivers\/[^/]+/.test(pathname) ||
        /\/tests\/[^/]+\/active/.test(pathname);
    const tabBarStyle = hideTabBar
        ? { display: 'none' as const }
        : {
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
            height: 64,
            paddingBottom: 8,
            paddingTop: 4,
        };

    // El snackbar vive en este layout (no en cada pantalla) para sobrevivir a
    // la navegación. Se posiciona al borde inferior del contenedor, que incluye
    // la tab bar: con 64 (su altura) queda justo encima, igual que antes, cuando
    // el snackbar estaba al final de cada pantalla.
    const snackbarBottomOffset = hideTabBar ? 0 : 64;

    return (
        <View style={styles.container}>
            <StatusBar style={isHome ? 'light' : 'dark'} />
            <OfflineBanner visible={!isOnline} />
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                    tabBarLabelStyle: {
                        fontFamily: 'Montserrat_600SemiBold',
                        fontSize: 11,
                    },
                    tabBarStyle,
                    headerStyle: {
                        backgroundColor: theme.colors.surface,
                    },
                    headerTitleStyle: {
                        fontFamily: 'Montserrat_700Bold',
                        fontSize: 20,
                        color: theme.colors.onSurface,
                    },
                    headerShadowVisible: false,
                }}
            >
                <Tabs.Screen
                    name="home/index"
                    options={{
                        title: 'Inicio',
                      headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'home' : 'home-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Inicio',
                    }}
                />
                <Tabs.Screen
                    name="patients"
                    options={{
                        title: 'Adultos mayores',
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'account-group' : 'account-group-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Adultos mayores',
                    }}
                />
                <Tabs.Screen
                    name="caregivers"
                    options={{
                        title: 'Cuidadores',
                        headerShown: false,
                        href: isCaregiver ? null : undefined,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'account-heart' : 'account-heart-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Cuidadores',
                    }}
                />
                <Tabs.Screen
                    name="notifications/index"
                    options={{
                        title: 'Notificaciones',
                        headerTitle: 'Notificaciones',
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="tests"
                    options={{
                        title: 'Pruebas',
                        headerShown: false,
                        href: null,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'clipboard-list' : 'clipboard-list-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Pruebas',
                    }}
                />
                <Tabs.Screen
                    name="profile/index"
                    options={{
                        title: 'Perfil',
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'account-circle' : 'account-circle-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Perfil',
                    }}
                />
                <Tabs.Screen
                    name="admin"
                    options={{
                        title: 'Administración',
                        headerShown: false,
                        href: isCaregiver || isProfessional ? null : undefined,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'account-cog' : 'account-cog-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Administracion',
                    }}
                />
            </Tabs>
            <GlobalSnackbar bottomOffset={snackbarBottomOffset} />
            <Portal>
                <Dialog visible={showResumeDialog} onDismiss={dismissResumeDialog}>
                    <View style={styles.titleRow}>
                        <Text
                            variant="headlineSmall"
                            style={styles.titleText}
                            numberOfLines={2}
                        >
                            Batería SFT sin terminar
                        </Text>
                        <IconButton
                            icon="close"
                            onPress={dismissResumeDialog}
                            accessibilityLabel="Cerrar aviso de batería sin terminar"
                        />
                    </View>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            {`Tienes una batería sin finalizar para ${patientName ?? 'este adulto mayor'} (${completedTests.length} de ${SFT_TESTS.length} pruebas completadas). El borrador está guardado en este dispositivo.`}
                        </Text>
                    </Dialog.Content>
                    <AppDialogActions>
                        <PaperButton onPress={clearSession}>Descartar batería</PaperButton>
                        <PaperButton
                            onPress={() => {
                                if (!patientId) return;
                                router.replace(`/(app)/patients/${patientId}/batteries/new` as never);
                            }}
                        >
                            Retomar batería
                        </PaperButton>
                    </AppDialogActions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Equivale a Dialog.Title (headlineSmall) pero con sitio para la X de cierre.
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        marginBottom: 16,
        paddingHorizontal: 24,
    },
    titleText: {
        flex: 1,
    },
});
