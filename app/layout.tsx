import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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
        <style>{`
          .font-bebas-fallback { --font-bebas: 'Bebas Neue', 'Arial Narrow', 'Oswald', system-ui, sans-serif; }
          .font-rubik-fallback { --font-rubik: 'Rubik', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        `}</style>
      </head>
      <body className={`${bebasNeue.variable} ${rubik.variable} font-body bg-jj-neutral dark:bg-gray-950`}>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
