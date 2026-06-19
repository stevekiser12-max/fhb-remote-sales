'use client';

import { useEffect, useState } from 'react';

export default function PushManager() {
  const [permission, setPermission] = useState<string>('default');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setPermission(Notification.permission);

    // Register service worker and subscribe to push
    async function setup() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Push] SW registered');

        // Check if already subscribed
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Re-send to server in case it's a new session
          await sendSubscription(existing);
          setRegistered(true);
          return;
        }

        // Request permission if not already granted
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          setPermission(result);
          if (result !== 'granted') return;
        } else if (Notification.permission !== 'granted') {
          return;
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
          ).buffer as ArrayBuffer,
        });

        await sendSubscription(subscription);
        setRegistered(true);
        console.log('[Push] Subscribed successfully');
      } catch (e) {
        console.error('[Push] Setup failed:', e);
      }
    }

    // Only setup if user is logged in
    fetch('/api/auth/me')
      .then(r => {
        if (r.ok) setup();
      })
      .catch(() => {});
  }, []);

  return null; // No UI — runs silently
}

async function sendSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
