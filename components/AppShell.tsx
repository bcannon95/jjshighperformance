'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { usePathname, useRouter } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Supabase sends auth errors (e.g. expired reset link) to the site root URL,
  // not to /reset-password. Detect and forward them so the page can display them.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=') && pathname !== '/reset-password') {
      router.replace('/reset-password' + hash);
    }
  }, [pathname, router]);

  const publicPaths = ['/login', '/reset-password'];
  const isPublic = publicPaths.includes(pathname);

  // Always render public pages immediately (login, reset-password).
  if (isPublic) return <>{children}</>;

  // Block protected pages while loading or unauthenticated to prevent any
  // content flash before the redirect to /login fires.
  if (loading || !session) {
    return <div className="min-h-screen bg-jj-neutral dark:bg-gray-950" />;
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
