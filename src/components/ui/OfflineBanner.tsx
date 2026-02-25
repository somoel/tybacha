import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface OfflineBannerProps {
    visible: boolean;
}

/**
 * Amber banner displayed at top of screen when device is offline.
 * Shows cloud-off icon and message about local storage.
 */
export function OfflineBanner({ visible }: OfflineBannerProps) {
    if (!visible) return null;

    return (
        <View style={styles.banner} accessibilityRole="alert" accessibilityLabel="Sin conexión a internet">
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color="#7c4a00" />
            <Text style={styles.text}>Sin conexión – guardando localmente</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff3cd',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ffc107',
    },
    text: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#7c4a00',
    },
});
