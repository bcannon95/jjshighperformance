'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function usePushNotifications(clientId: number | null) {
  const router = useRouter();

  // Navigate when user taps a notification; clear tray when app comes to foreground
  useEffect(() => {
    let tapHandle: { remove: () => void } | null = null;
    let visibilityCleanup: (() => void) | null = null;

    async function setupListeners() {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { PushNotifications } = await import('@capacitor/push-notifications');

      tapHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action.notification.data?.url as string | undefined;
        if (url) router.push(url);
      });

      function onVisibilityChange() {
        if (document.visibilityState === 'visible') {
          PushNotifications.removeAllDeliveredNotifications().catch(() => {});
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange);
      visibilityCleanup = () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    setupListeners();
    return () => {
      tapHandle?.remove();
      visibilityCleanup?.();
    };
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
