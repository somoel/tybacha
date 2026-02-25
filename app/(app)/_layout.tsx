import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { useSyncStore } from '@/src/stores/syncStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * App layout with Bottom Navigation Bar (5 tabs).
 * Shows offline banner when disconnected.
 */
export default function AppLayout() {
    const theme = useTheme();
    const isOnline = useSyncStore((s) => s.isOnline);

    return (
        <View style={styles.container}>
            <OfflineBanner visible={!isOnline} />
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                    tabBarLabelStyle: {
                        fontFamily: 'Montserrat_600SemiBold',
                        fontSize: 11,
                    },
                    tabBarStyle: {
                        borderTopColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        height: 64,
                        paddingBottom: 8,
                        paddingTop: 4,
                    },
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
                        headerTitle: 'Tybachá',
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
                        title: 'Pacientes',
                        headerShown: false,
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name={focused ? 'account-group' : 'account-group-outline'}
                                size={24}
                                color={color}
                            />
                        ),
                        tabBarAccessibilityLabel: 'Pacientes',
                    }}
                />
                <Tabs.Screen
                    name="tests"
                    options={{
                        title: 'Pruebas',
                        headerShown: false,
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
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
