'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Users,
  Utensils,
  BarChart2,
  Award,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, href: '/', label: 'Dashboard' },
  { icon: FolderOpen, href: '/training', label: 'Training Program' },
  { icon: MessageSquare, href: '/messages', label: 'Messages' },
  { icon: Users, href: '/groups', label: 'Groups' },
  { icon: Utensils, href: '/meal-plan', label: 'Meal Plan' },
  { icon: BarChart2, href: '/progress', label: 'Progress' },
  { icon: Award, href: '/badges', label: 'Badges Earned' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-2 shrink-0">
      <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center mb-4">
        <span className="text-gray-900 font-bold text-lg">J</span>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group ${
              isActive
                ? 'bg-yellow-400 text-gray-900'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Icon size={20} />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
