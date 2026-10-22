'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, User, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

export default function TopBar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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
          onClick={() => {
            setShowNotifs(!showNotifs);
            setShowUser(false);
          }}
          className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <Bell size={20} />
        </button>
        {showNotifs && (
          <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-jj-grey/40 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="px-4 py-3 border-b border-jj-grey/40 dark:border-gray-700">
              <p className="text-sm font-semibold dark:text-white">Notifications</p>
            </div>
            <div className="px-4 py-8 text-center">
              <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No new notifications</p>
            </div>
          </div>
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
          <div className="absolute right-0 top-12 w-52 bg-white dark:bg-gray-800 border border-jj-grey/40 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
            <Link
              href="/account"
              onClick={() => setShowUser(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
            >
              <User size={16} /> My Account
            </Link>
            <hr className="my-1 border-jj-grey/40 dark:border-gray-700" />
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-jj-neutral dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 w-full"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
