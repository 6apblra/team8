import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { storage } from "./storage";
import { log } from "./logger";

// Create a new Expo SDK client
const expo = new Expo();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload,
): Promise<boolean> {
  try {
    const pushToken = await storage.getPushToken(userId);

    if (!pushToken) {
      log.info({ userId }, "No push token found for user");
      return false;
    }

    // Check if the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      log.error({ userId, pushToken }, "Invalid push token for user");
      return false;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    };

    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      for (const ticket of ticketChunk) {
        if (ticket.status === "error") {
          log.error({ message: ticket.message }, "Push notification error");
          if (ticket.details?.error === "DeviceNotRegistered") {
            // Token is no longer valid, remove it
            await storage.removePushToken(userId);
          }
        }
      }
    }

    return true;
  } catch (error) {
    log.error({ err: error }, "Failed to send push notification");
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotifications(
  userIds: string[],
  payload: PushNotificationPayload,
): Promise<void> {
  const messages: ExpoPushMessage[] = [];

  for (const userId of userIds) {
    const pushToken = await storage.getPushToken(userId);

    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      messages.push({
        to: pushToken,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      });
    }
  }

  if (messages.length === 0) {
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      log.error({ err: error }, "Failed to send push notifications");
    }
  }
}

/**
 * Notification types for the app
 */
export const NotificationTypes = {
  NEW_MATCH: "new_match",
  NEW_MESSAGE: "new_message",
  PROFILE_LIKE: "profile_like",
  SUPER_LIKE: "super_like",
} as const;

/**
 * Send new match notification
 */
export async function notifyNewMatch(
  userId: string,
  matchedUserNickname: string,
): Promise<void> {
  await sendPushNotification(userId, {
    title: "New Match! 🎮",
    body: `You matched with ${matchedUserNickname}! Start chatting now.`,
    data: { type: NotificationTypes.NEW_MATCH },
  });
}

/**
 * Send super like notification
 */
export async function notifySuperLike(
  userId: string,
  fromNickname: string,
): Promise<void> {
  await sendPushNotification(userId, {
    title: "Super Like! ⭐",
    body: `${fromNickname} super-liked you!`,
    data: { type: NotificationTypes.SUPER_LIKE },
  });
}

/**
 * Send new message notification
 */
export async function notifyNewMessage(
  userId: string,
  senderNickname: string,
  messagePreview: string,
): Promise<void> {
  const preview =
    messagePreview.length > 50
      ? messagePreview.substring(0, 47) + "..."
      : messagePreview;

  await sendPushNotification(userId, {
    title: `${senderNickname}`,
    body: preview,
    data: { type: NotificationTypes.NEW_MESSAGE },
  });
}
