import { usePermissions } from '@/src/hooks/usePermissions';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

/**
 * Guard de rol para toda la seccion de administracion (index y [id]).
 * La pestana ya esta oculta para no-admins; este redirect cierra deep links
 * y cualquier acceso directo a la ruta. Fail-closed: sin rol resuelto, sale.
 */
export default function AdminLayout() {
    const { isAdmin } = usePermissions();

    if (!isAdmin) {
        return <Redirect href={'/(app)/home' as never} />;
    }

    return (
        <Stack
            screenOptions={{
                headerTitleStyle: { fontFamily: 'Montserrat_700Bold', fontSize: 20 },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Administración' }} />
            <Stack.Screen name="[id]" options={{ title: 'Editar usuario' }} />
        </Stack>
    );
}
