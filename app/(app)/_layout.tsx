import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { useSyncStore } from '@/src/stores/syncStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * App layout with Bottom Navigation Bar (5 tabs).
 * Shows offline banner when disconnected.
 */
export default function AppLayout() {
    const theme = useTheme();
    const pathname = usePathname();
    const isOnline = useSyncStore((s) => s.isOnline);
    const isBatteryMode =
        /\/patients\/[^/]+\/batteries\/new/.test(pathname) ||
        /\/patients\/[^/]+\/batteries\/summary/.test(pathname) ||
        /\/tests\/[^/]+\/active/.test(pathname);
    const tabBarStyle = isBatteryMode
        ? { display: 'none' as const }
        : {
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
            height: 64,
            paddingBottom: 8,
            paddingTop: 4,
        };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
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
                    name="results/index"
                    options={{
                        title: 'Resultados',
                        headerTitle: 'Resultados',
                        href: null,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'chart-bar' : 'chart-line'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Resultados',
                    }}
                />
                <Tabs.Screen
                    name="profile/index"
                    options={{
                        title: 'Perfil',
                        headerTitle: 'Mi Perfil',
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
                    name="admin/index"
                    options={{
                        title: 'Admin',
                        headerTitle: 'Administracion',
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'shield-account' : 'shield-account-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Administracion',
                    }}
                />
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
