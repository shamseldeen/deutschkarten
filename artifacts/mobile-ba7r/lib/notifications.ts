import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_ID = "daily-review";

const MESSAGES = [
  { title: "Time for German! 🇩🇪", body: "Your daily 10 cards are waiting." },
  { title: "Don't break the streak!", body: "Just 5 minutes keeps your progress alive." },
  { title: "Neue Wörter warten 📚", body: "Quick review — let's go!" },
  { title: "Sprachen lernen!", body: "Your flashcards are ready for today." },
  { title: "Daily German time ⏰", body: "Tap to start your review session." },
];

function randomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!;
}

let handlerSet = false;
export function configureNotificationHandler(): void {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

type LoosePermResponse = {
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: { status?: number };
};

function isGranted(s: LoosePermResponse): boolean {
  if (s.granted === true) return true;
  const ios = s.ios?.status;
  return (
    ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function ensurePermission(): Promise<boolean> {
  const current = (await Notifications.getPermissionsAsync()) as unknown as LoosePermResponse;
  if (isGranted(current)) return true;
  if (current.canAskAgain === false) return false;
  const req = (await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  })) as unknown as LoosePermResponse;
  return isGranted(req);
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_ID, {
    name: "Daily Review",
    importance: Notifications.AndroidImportance.DEFAULT,
    enableVibrate: true,
    showBadge: false,
  });
}

export async function cancelDailyReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  await cancelDailyReminder();
  await ensureAndroidChannel();
  const msg = randomMessage();
  await Notifications.scheduleNotificationAsync({
    identifier: `${REMINDER_ID}-${Date.now()}`,
    content: {
      title: msg.title,
      body: msg.body,
      sound: false,
      data: { kind: "daily-review" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
      channelId: REMINDER_ID,
    },
  });
  return true;
}
