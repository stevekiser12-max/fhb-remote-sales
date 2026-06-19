// Server-side push notification sender
import webpush from 'web-push';
import { getSubscriptions, removeSubscription } from './push-store';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'stephen@favoredhomebuyers.com'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPush(memberId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await getSubscriptions(memberId);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        JSON.stringify(payload)
      );
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired, remove it
        await removeSubscription(memberId, sub.endpoint);
      }
      console.error(`Push failed for ${memberId}:`, err);
    }
  }
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const { getAllSubscriptions } = await import('./push-store');
  const allSubs = await getAllSubscriptions();

  for (const [memberId, subs] of Object.entries(allSubs)) {
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removeSubscription(memberId, sub.endpoint);
        }
      }
    }
  }
}
