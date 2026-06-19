// Server-side store for push notification subscriptions
import { promises as fs } from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'push-subscriptions.json');

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

type SubscriptionStore = Record<string, PushSubscription[]>; // keyed by member id

async function readStore(): Promise<SubscriptionStore> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeStore(store: SubscriptionStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function saveSubscription(memberId: string, subscription: PushSubscription): Promise<void> {
  const store = await readStore();
  if (!store[memberId]) store[memberId] = [];

  // Replace existing subscription with same endpoint, or add new
  const idx = store[memberId].findIndex(s => s.endpoint === subscription.endpoint);
  if (idx >= 0) {
    store[memberId][idx] = subscription;
  } else {
    store[memberId].push(subscription);
  }

  await writeStore(store);
}

export async function getSubscriptions(memberId: string): Promise<PushSubscription[]> {
  const store = await readStore();
  return store[memberId] || [];
}

export async function getAllSubscriptions(): Promise<Record<string, PushSubscription[]>> {
  return readStore();
}

export async function removeSubscription(memberId: string, endpoint: string): Promise<void> {
  const store = await readStore();
  if (store[memberId]) {
    store[memberId] = store[memberId].filter(s => s.endpoint !== endpoint);
    await writeStore(store);
  }
}
