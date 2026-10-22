'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Registers for push notifications on native iOS (via APNs through Capacitor).
 * Stores the device token in push_subscriptions so the server can send notifications.
 *
 * On web/non-native: does nothing (Web Push not supported in WKWebView).
 */
export function usePushNotifications(clientId: number | null) {
  useEffect(() => {
    if (!clientId) return;

    async function register() {
      // Only run on native Capacitor — skip in browser/dev
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Check / request permission
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;

      // Register with APNs
      await PushNotifications.register();

      // Handle successful registration — store token in DB
      PushNotifications.addListener('registration', async (token) => {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: clientId,
            user_type: 'client',
            platform: 'ios',
            apns_token: token.value,
            // endpoint is required by schema — use token as a stable unique key
            endpoint: `apns:${token.value}`,
          },
          { onConflict: 'endpoint' },
        );
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('APNs registration error:', err);
      });
    }

    register();
  }, [clientId]);
}
