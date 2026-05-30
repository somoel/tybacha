import { registerApiPushToken } from '@/src/api/notificationsApi';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function configureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#006d77',
        sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('exercise-reminders', {
        name: 'Recordatorios de ejercicios',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#006d77',
        sound: 'default',
    });
}

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

    await configureAndroidChannel();

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

export function addNotificationListeners(handlers: {
    onReceived?: (notification: Notifications.Notification) => void;
    onTapped?: (response: Notifications.NotificationResponse) => void;
}): { remove: () => void } {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        handlers.onReceived?.(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        handlers.onTapped?.(response);
    });

    return {
        remove: () => {
            receivedSub.remove();
            responseSub.remove();
        },
    };
}
