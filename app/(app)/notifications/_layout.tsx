import { Stack } from 'expo-router';
import React from 'react';

export default function NotificationsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: '#fafafa' },
                headerTitleStyle: {
                    fontFamily: 'Montserrat_700Bold',
                    fontSize: 20,
                    color: '#1f2937',
                },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Notificaciones' }} />
        </Stack>
    );
}
