'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthProvider';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { session, trainer, loading, signOut } = useAdminAuth();
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

  if (loading || !session) {
    return <div className="min-h-screen bg-jj-neutral dark:bg-gray-950" />;
  }

  if (!trainer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-jj-neutral dark:bg-gray-950 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Access not available
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            This account isn&apos;t set up for admin access. Contact an administrator if you believe this is a mistake.
          </p>
          <button
            onClick={signOut}
            className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-jj-neutral dark:bg-gray-950">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
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
