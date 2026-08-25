'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCog,
  MessageSquare,
  Users2,
  Library,
  CalendarDays,
  BarChart2,
  Building2,
  Receipt,
  X,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Clients', href: '/admin/clients', icon: Users },
  { label: 'Team', href: '/admin/team', icon: UserCog },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'Groups', href: '/admin/groups', icon: Users2 },
  { label: 'Content Library', href: '/admin/content', icon: Library },
  { label: 'Billing', href: '/admin/billing', icon: Receipt },
  { label: 'Scheduling', href: '/admin/scheduling', icon: CalendarDays },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
  { label: 'Business', href: '/admin/business', icon: Building2 },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <div className="h-16 flex items-center px-5 border-b border-white/10 shrink-0">
        <img src="https://file.trainerize.com/10545129/banner/3d751025-ae5f-47db-b979-3052d4489009" alt="JJ High Performance" className="h-10 w-auto object-contain" />
      </div>
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-gray-900 text-white shrink-0">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative flex w-64 flex-col bg-gray-900 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
