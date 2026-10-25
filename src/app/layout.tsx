import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { CursorReactiveLayer } from '@/components/visuals/CursorReactiveLayer';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Codio — Collaborative Code Editor',
  description: 'Fast, secure, browser-based collaborative code editor powered by Monaco, Yjs CRDTs, and Supabase. Share rooms, write code concurrently, and debug in real time.',
  keywords: ['collaborative code editor', 'pair programming', 'online IDE', 'monaco editor', 'Yjs', 'realtime CRDT', 'codio'],
  authors: [{ name: 'Codio Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('codio_theme');
                  var theme = stored === 'dark' || stored === 'light' || stored === 'codio' ? stored : 'codio';
                  var isDark = theme !== 'light';
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.setAttribute('data-theme', theme);
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                    root.setAttribute('data-theme', theme);
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f8fafc] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-150">
        <ThemeProvider>
          <div className="relative isolate flex min-h-screen flex-col">
            <CursorReactiveLayer />
            <div className="relative z-10 flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1 flex flex-col">{children}</main>
              <Footer />
              <Toaster position="bottom-right" closeButton richColors={false} />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
