'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Utensils,
  BarChart2,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, href: '/', label: 'Home' },
  { icon: FolderOpen, href: '/training', label: 'Training' },
  { icon: MessageSquare, href: '/messages', label: 'Messages' },
  { icon: Utensils, href: '/meal-plan', label: 'Meals' },
  { icon: BarChart2, href: '/progress', label: 'Progress' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 flex items-stretch z-50 md:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
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
