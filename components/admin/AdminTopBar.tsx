'use client';

import { useState } from 'react';
import { Search, Sun, Moon, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAdminAuth } from './AdminAuthProvider';

interface AdminTopBarProps {
  onMenuOpen?: () => void;
}

export function AdminTopBar({ onMenuOpen }: AdminTopBarProps) {
  const { theme, toggle } = useTheme();
  const { trainer, signOut } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = trainer
    ? `${trainer.first_name?.[0] ?? ''}${trainer.last_name?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header className="h-16 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400"
        />
        <input
          type="text"
          placeholder="Find a client..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {initials || '?'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {trainer ? `${trainer.first_name} ${trainer.last_name}` : ''}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {trainer?.role}
              </span>
            </span>
            <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-20">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
