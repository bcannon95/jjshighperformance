import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import AppShell from '@/components/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';

// NOTE: next/font/google fetches fonts from Google's servers at build/dev time.
// In an offline or firewalled environment that fetch hangs and the dev server
// never finishes compiling. We use local CSS-variable classes with system-font
// fallbacks instead, so no network access is required. The class names below
// map to the same --font-bebas / --font-rubik variables used by Tailwind.
const bebasNeue = { variable: 'font-bebas-fallback' };
const rubik = { variable: 'font-rubik-fallback' };

export const metadata: Metadata = {
  title: "JJ's High Performance - Client Portal",
  description: 'Your personal high performance coaching platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style dangerouslySetInnerHTML={{ __html: `
          .font-bebas-fallback { --font-bebas: 'Bebas Neue', 'Arial Narrow', 'Oswald', system-ui, sans-serif; }
          .font-rubik-fallback { --font-rubik: 'Rubik', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        ` }} />
        {/* Apply theme before first paint to avoid flash of wrong colour scheme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('theme');
              if (t !== 'light') {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        ` }} />
      </head>
      <body className={`${bebasNeue.variable} ${rubik.variable} font-body bg-jj-neutral dark:bg-gray-950`}>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
