import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface AppDialogActionsProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/**
 * Acciones de diálogo apiladas a ancho completo: cada opción en su propia
 * línea para que nunca desborden en pantallas estrechas.
 *
 * No reutiliza Dialog.Actions de Paper porque fuerza flexDirection: 'row'
 * y añade marginRight: 8 a cada botón (menos al último), lo que desalinearía
 * los botones al apilarlos.
 */
export function AppDialogActions({ children, style }: AppDialogActionsProps) {
    return <View style={[styles.actions, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    actions: {
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        rowGap: 8,
    },
});
