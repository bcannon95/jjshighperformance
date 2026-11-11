'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Library,
  BarChart2,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, href: '/admin', label: 'Overview' },
  { icon: Users, href: '/admin/clients', label: 'Clients' },
  { icon: MessageSquare, href: '/admin/messages', label: 'Messages' },
  { icon: Library, href: '/admin/content', label: 'Content' },
  { icon: BarChart2, href: '/admin/analytics', label: 'Analytics' },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 flex items-stretch z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-2 gap-1 text-xs transition-colors ${
              isActive ? 'text-brand' : 'text-gray-400'
            }`}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
