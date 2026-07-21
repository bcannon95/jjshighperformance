'use client';

import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-jj-neutral dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
