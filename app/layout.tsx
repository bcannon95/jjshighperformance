import type { Metadata } from 'next';
import { Bebas_Neue, Rubik } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { ThemeProvider } from '@/components/ThemeProvider';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
});

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
