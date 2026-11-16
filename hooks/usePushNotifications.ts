'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function usePushNotifications(clientId: number | null) {
  const router = useRouter();

  // Navigate when user taps a notification — runs regardless of auth state
  useEffect(() => {
    let handle: { remove: () => void } | null = null;

    async function setupTapListener() {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { PushNotifications } = await import('@capacitor/push-notifications');
      handle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action.notification.data?.url as string | undefined;
        if (url) router.push(url);
      });
    }

    setupTapListener();
    return () => { handle?.remove(); };
  }, [router]);

  // Register device token when client is authenticated
  useEffect(() => {
    if (!clientId) return;

    async function register() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        PushNotifications.addListener('registration', async (token) => {
          await supabase.from('push_subscriptions').upsert(
            {
              user_id: clientId,
              user_type: 'client',
              platform: 'ios',
              apns_token: token.value,
              endpoint: `apns:${token.value}`,
            },
            { onConflict: 'endpoint' },
          );
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] registrationError:', JSON.stringify(err));
        });

        await PushNotifications.register();
      } catch (err) {
        console.error('[Push] unexpected error:', err);
      }
    }

    register();
  }, [clientId]);
}
