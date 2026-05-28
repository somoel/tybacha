import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PatientAvatarProps {
    photoData?: string | null;
    firstName: string;
    firstLastname: string;
    size?: number;
}

export function PatientAvatar({
    photoData,
    firstName,
    firstLastname,
    size = 48,
}: PatientAvatarProps) {
    const theme = useTheme();
    const initials = `${firstName[0]}${firstLastname[0]}`.toUpperCase();
    const fontSize = size * 0.375;

    if (photoData) {
        return (
            <Image
                source={{ uri: photoData }}
                style={[
                    styles.photo,
                    { width: size, height: size, borderRadius: size / 2 },
                ]}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Foto de perfil del adulto mayor"
            />
        );
    }

    return (
        <View
            style={[
                styles.placeholder,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: theme.colors.primaryContainer,
                },
            ]}
        >
            <Text
                style={[
                    styles.initials,
                    { color: theme.colors.onPrimaryContainer, fontSize },
                ]}
            >
                {initials}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    photo: {
        overflow: 'hidden',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        fontFamily: 'Montserrat_700Bold',
    },
});
