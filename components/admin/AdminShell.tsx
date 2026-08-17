'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthProvider';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { session, trainer, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (loading) return;

    if (!session && !isLoginPage) {
      router.replace('/admin/login');
      return;
    }

    if (session && isLoginPage) {
      router.replace('/admin');
    }
  }, [loading, session, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !session || !trainer) {
    return <div className="min-h-screen bg-jj-neutral dark:bg-gray-950" />;
  }

  return (
    <div className="flex min-h-screen bg-jj-neutral dark:bg-gray-950">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminAuthProvider>
  );
}
