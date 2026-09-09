import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
    return (
        <Stack
            screenOptions={{
                headerTitleStyle: { fontFamily: 'Montserrat_700Bold', fontSize: 20 },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Administracion' }} />
            <Stack.Screen name="[id]" options={{ title: 'Editar usuario' }} />
        </Stack>
    );
}
