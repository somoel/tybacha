import { registerApiPushToken } from '@/src/api/notificationsApi';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'web') {
        return null;
    }

    if (!Device.isDevice) {
        return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
        return null;
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
    );

    await registerApiPushToken({
        tokenExpo: token.data,
        plataforma: 'android',
        dispositivo: Device.modelName ?? undefined,
    });

    return token.data;
}

