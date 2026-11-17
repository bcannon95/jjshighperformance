'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, User, LogOut, Sun, Moon, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function NotificationList({ notifications, onNavigate }: {
  notifications: NotificationItem[];
  onNavigate: () => void;
}) {
  if (notifications.length === 0) return (
    <div className="px-4 py-8 text-center">
      <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-sm text-gray-400 dark:text-gray-500">No new notifications</p>
    </div>
  );
  return (
    <div className="divide-y divide-jj-grey/20 dark:divide-gray-700 max-h-80 overflow-y-auto">
      {notifications.map((n) => (
        <button key={n.conversationId} onClick={onNavigate} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-jj-neutral dark:hover:bg-gray-700">
          <MessageSquare size={16} className="text-brand shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{n.name}</span>
              {n.lastAt && <span className="text-xs text-gray-400 shrink-0">{formatTime(n.lastAt)}</span>}
            </div>
            {n.preview && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.preview}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function TopBar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, isTrainer, clientId, signOut } = useAuth();
  const router = useRouter();
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount } = useNotifications(clientId ?? null);

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-jj-grey/40 dark:border-gray-700 shrink-0 relative z-40"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
    <div className="h-14 flex items-center justify-end px-6 gap-4">
      <button
        onClick={toggle}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        title="Toggle dark mode"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="relative" ref={notifsRef}>
        <button
          onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
          className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {showNotifs && (
          <>
            {/* Mobile: bottom sheet */}
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowNotifs(false)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl py-2"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-2 mb-3" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white px-4 mb-1">Notifications</p>
                <NotificationList
                  notifications={notifications}
                  onNavigate={() => { setShowNotifs(false); router.push('/messages'); }}
                />
              </div>
            </div>

            {/* Desktop: fixed dropdown */}
            <div className="hidden md:block fixed top-14 right-4 w-80 bg-white dark:bg-gray-800 border border-jj-grey/40 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 border-b border-jj-grey/40 dark:border-gray-700">
                <p className="text-sm font-semibold dark:text-white">Notifications</p>
              </div>
              <NotificationList
                notifications={notifications}
                onNavigate={() => { setShowNotifs(false); router.push('/messages'); }}
              />
            </div>
          </>
        )}
      </div>
      <div className="relative" ref={userRef}>
        <button
          onClick={() => {
            setShowUser(!showUser);
            setShowNotifs(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-jj-neutral dark:hover:bg-gray-800"
        >
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-brand text-sm font-semibold">{initials}</span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
            {displayName}
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>

        {showUser && (
          <>
            {/* Mobile: bottom sheet */}
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowUser(false)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl py-2"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                <div className="px-2 pb-2 text-sm font-medium text-gray-500 dark:text-gray-400 px-4">
                  {displayName}
                </div>
                <Link
                  href="/account"
                  onClick={() => setShowUser(false)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-base text-gray-700 dark:text-gray-200"
                >
                  <User size={18} /> My Account
                </Link>
                {isTrainer && (
                  <Link
                    href="/admin"
                    onClick={() => setShowUser(false)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-base text-gray-700 dark:text-gray-200"
                  >
                    <LayoutDashboard size={18} /> Switch to Admin
                  </Link>
                )}
                <hr className="my-2 border-jj-grey/40 dark:border-gray-700" />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-base text-gray-700 dark:text-gray-200 w-full"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>

            {/* Desktop: dropdown */}
            <div className="hidden md:block absolute right-0 top-12 w-52 bg-white dark:bg-gray-800 border border-jj-grey/40 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
              <Link
                href="/account"
                onClick={() => setShowUser(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
              >
                <User size={16} /> My Account
              </Link>
              {isTrainer && (
                <Link
                  href="/admin"
                  onClick={() => setShowUser(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                >
                  <LayoutDashboard size={16} /> Switch to Admin
                </Link>
              )}
              <hr className="my-1 border-jj-grey/40 dark:border-gray-700" />
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 w-full"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
