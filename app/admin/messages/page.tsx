'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ConversationRow = {
  id: number;
  type: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
};

type ParticipantRow = {
  conversation_id: number;
  participant_id: number;
  participant_type: string | null;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_type: string | null;
  body: string | null;
  sent_at: string | null;
};

type PersonLite = {
  id: number;
  first_name: string | null;
  last_name: string | null;
};

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [people, setPeople] = useState<Map<string, PersonLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, type, last_message_at, last_message_preview')
        .order('last_message_at', { ascending: false });

      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id, participant_id, participant_type');

      const clientIds = (parts ?? [])
        .filter((p) => p.participant_type === 'client')
        .map((p) => p.participant_id);
      const trainerIds = (parts ?? [])
        .filter((p) => p.participant_type === 'trainer')
        .map((p) => p.participant_id);

      const peopleMap = new Map<string, PersonLite>();

      if (clientIds.length) {
        const { data: clientRows } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .in('id', clientIds);
        clientRows?.forEach((c) => peopleMap.set('client-' + c.id, c));
      }
      if (trainerIds.length) {
        const { data: trainerRows } = await supabase
          .from('trainers')
          .select('id, first_name, last_name')
          .in('id', trainerIds);
        trainerRows?.forEach((t) => peopleMap.set('trainer-' + t.id, t));
      }

      setConversations(convos ?? []);
      setParticipants(parts ?? []);
      setPeople(peopleMap);
      setLoading(false);
    }
    load();
  }, []);

  const participantsByConversation = useMemo(() => {
    const map = new Map<number, ParticipantRow[]>();
    participants.forEach((p) => {
      const list = map.get(p.conversation_id) ?? [];
      list.push(p);
      map.set(p.conversation_id, list);
    });
    return map;
  }, [participants]);

  function nameFor(participant: ParticipantRow) {
    const key = participant.participant_type + '-' + participant.participant_id;
    const person = people.get(key);
    if (!person) return 'Unknown';
    return ((person.first_name ?? '') + ' ' + (person.last_name ?? '')).trim() || 'Unknown';
  }

  function participantNames(conversationId: number) {
    const list = participantsByConversation.get(conversationId) ?? [];
    return list.map(nameFor).join(', ') || 'No participants';
  }

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    return participantNames(c.id).toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      setMessagesLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_type, body, sent_at')
        .eq('conversation_id', activeId)
        .order('sent_at', { ascending: true });
      setMessages(data ?? []);
      setMessagesLoading(false);
    }
    loadMessages();
  }, [activeId]);

  function senderName(message: MessageRow) {
    const key = message.sender_type + '-' + message.sender_id;
    const person = people.get(key);
    if (!person) return 'Unknown';
    return ((person.first_name ?? '') + ' ' + (person.last_name ?? '')).trim() || 'Unknown';
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Messages</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-full max-w-sm rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading conversations...
            </div>
          )}
          {!loading && filteredConversations.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No conversations found.
            </div>
          )}
          <ul className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {!loading && filteredConversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  onClick={() => setActiveId(conversation.id)}
                  className={
                    'w-full text-left px-4 py-3 hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50' +
                    (activeId === conversation.id ? ' bg-gray-100 dark:bg-gray-800' : '')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {participantNames(conversation.id)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {conversation.last_message_at
                        ? new Date(conversation.last_message_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {conversation.last_message_preview || 'No messages yet'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          {!activeConversation && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Select a conversation to view messages.
            </div>
          )}
          {activeConversation && (
            <>
              <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {participantNames(activeConversation.id)}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messagesLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages in this conversation.</p>
                )}
                {!messagesLoading && messages.map((message) => (
                  <div key={message.id} className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {senderName(message)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {message.sent_at ? new Date(message.sent_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                      {message.body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-jj-grey/10 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                Admin view is read-only.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
