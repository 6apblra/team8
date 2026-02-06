import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { storage } from "./storage";

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
      console.log(`No push token found for user ${userId}`);
      return false;
    }

    // Check if the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token for user ${userId}: ${pushToken}`);
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
          console.error(`Push notification error:`, ticket.message);
          if (ticket.details?.error === "DeviceNotRegistered") {
            // Token is no longer valid, remove it
            await storage.removePushToken(userId);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
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
      console.error("Failed to send push notifications:", error);
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
