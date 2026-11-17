'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type NotificationItem = {
  conversationId: number;
  name: string;
  preview: string | null;
  lastAt: string | null;
};

export function useNotifications(clientId: number | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (!clientId) { setNotifications([]); return; }

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, name, type, last_message_at, last_message_preview')
      .order('last_message_at', { ascending: false });

    if (!convs?.length) { setNotifications([]); return; }

    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('participant_id', clientId)
      .eq('participant_type', 'client')
      .in('conversation_id', convs.map((c) => c.id));

    if (!parts) { setNotifications([]); return; }

    const unread = convs
      .filter((c) => {
        if (!c.last_message_at) return false;
        const myPart = parts.find((p) => p.conversation_id === c.id);
        if (!myPart) return false;
        return !myPart.last_read_at || c.last_message_at > myPart.last_read_at;
      })
      .map((c) => ({
        conversationId: c.id,
        name: c.name || (c.type === 'group' ? 'Group Chat' : 'Coach'),
        preview: c.last_message_preview ?? null,
        lastAt: c.last_message_at ?? null,
      }));

    setNotifications(unread);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Refresh badge when new messages arrive or conversations are marked read
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`notifications:${clientId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => { load(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clientId, load]);

  return { notifications, unreadCount: notifications.length, reload: load };
}
