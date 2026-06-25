'use client'
import { useState } from 'react'
import { Send, Search } from 'lucide-react'

export default function MessagesPage() {
  const [sel, setSel] = useState(0)
  const [msg, setMsg] = useState('')
  const threads = [
    {
      id: 0, name: 'Coach Sarah', avatar: 'CS', last: 'Great job on your workout today!', time: '2m ago', unread: 2,
      msgs: [
        { from: 'coach', text: 'Hey Jaimee! How did the workout feel today?', time: '10:30 AM' },
        { from: 'me', text: 'It was tough but I pushed through!', time: '10:35 AM' },
        { from: 'coach', text: 'Great job on your workout today!', time: '10:40 AM' },
      ],
    },
    {
      id: 1, name: 'Trainer Mike', avatar: 'TM', last: 'Check your meal plan update', time: '1h ago', unread: 0,
      msgs: [
        { from: 'coach', text: 'I updated your meal plan for next week.', time: '9:00 AM' },
        { from: 'coach', text: 'Check your meal plan update', time: '9:05 AM' },
      ],
    },
    {
      id: 2, name: 'Support Team', avatar: 'ST', last: 'Your query has been resolved', time: 'Yesterday', unread: 0,
      msgs: [{ from: 'coach', text: 'Your query has been resolved', time: 'Yesterday' }],
    },
  ]
  const active = threads[sel]

  return (
    <div className="flex h-full bg-jj-neutral dark:bg-gray-950">
      {/* Thread list */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-jj-grey/40 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-jj-grey/40 dark:border-gray-700">
          <h2 className="font-heading text-2xl mb-3 text-gray-900 dark:text-white">Messages</h2>
          <div className="flex items-center gap-2 bg-jj-neutral dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search size={16} className="text-jj-grey" />
            <input
              placeholder="Search messages..."
              className="border-none bg-transparent outline-none text-sm w-full text-gray-900 dark:text-white placeholder-jj-grey"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSel(t.id)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-jj-grey/20 dark:border-gray-800 text-left transition-colors ${
                sel === t.id ? 'bg-brand/10 dark:bg-brand/10' : 'hover:bg-jj-neutral dark:hover:bg-gray-800'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold text-[13px] shrink-0">
                {t.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</span>
                  <span className="text-xs text-jj-grey dark:text-gray-500">{t.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{t.last}</span>
                  {t.unread > 0 && (
                    <span className="bg-brand text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {t.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-jj-grey/40 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold">
            {active.avatar}
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">{active.name}</div>
            <div className="text-xs text-jj-forest">Online</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {active.msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[60%] px-3.5 py-2.5 text-sm ${
                  m.from === 'me'
                    ? 'bg-gray-900 text-brand rounded-2xl rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-jj-grey/30 dark:border-gray-700 rounded-2xl rounded-bl-sm'
                }`}
              >
                <div>{m.text}</div>
                <div className="text-[11px] opacity-70 mt-1 text-right">{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-jj-grey/40 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-2.5 items-center">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-jj-grey/40 dark:border-gray-600 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand placeholder-jj-grey"
          />
          <button
            onClick={() => setMsg('')}
            className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center shrink-0"
          >
            <Send size={18} color="#d4de26" />
          </button>
        </div>
      </div>
    </div>
  )
}
