import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Codio (CODENEST) — Real-Time Collaborative Code Editor',
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
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
