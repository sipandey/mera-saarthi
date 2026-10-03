import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushRegistration =
  | { status: 'ready'; token: string }
  | { status: 'needs_project' | 'permission_denied' | 'unsupported' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerOwnerPushNotifications(): Promise<PushRegistration> {
  if (Platform.OS !== 'android') return { status: 'unsupported' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return { status: 'needs_project' };

  await Notifications.setNotificationChannelAsync('booking-requests', {
    name: 'Booking requests',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#15803D',
  });

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return { status: 'permission_denied' };

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: 'ready', token: result.data };
}
