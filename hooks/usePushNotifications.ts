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
    console.log('[Push] hook called, clientId=', clientId);
    if (!clientId) return;

    async function register() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        console.log('[Push] isNativePlatform=', Capacitor.isNativePlatform(), 'platform=', Capacitor.getPlatform());
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        let permStatus = await PushNotifications.checkPermissions();
        console.log('[Push] permission status=', permStatus.receive);
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
          console.log('[Push] after request, status=', permStatus.receive);
        }
        if (permStatus.receive !== 'granted') {
          console.warn('[Push] permission not granted, bailing');
          return;
        }

        // Add listeners BEFORE register() so we don't miss the event
        PushNotifications.addListener('registration', async (token) => {
          console.log('[Push] registration token received:', token.value.slice(0, 20) + '…');
          const { error } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: clientId,
              user_type: 'client',
              platform: 'ios',
              apns_token: token.value,
              endpoint: `apns:${token.value}`,
            },
            { onConflict: 'endpoint' },
          );
          if (error) {
            console.error('[Push] upsert error:', JSON.stringify(error));
          } else {
            console.log('[Push] token saved successfully for clientId=', clientId);
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] registrationError:', JSON.stringify(err));
        });

        console.log('[Push] calling PushNotifications.register()…');
        await PushNotifications.register();
        console.log('[Push] register() resolved');
      } catch (err) {
        console.error('[Push] unexpected error:', err);
      }
    }

    register();
  }, [clientId]);
}
