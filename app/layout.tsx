import type { Metadata } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-display',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Robot Cooks Drawings',
  description: 'Generate printable A4 coloring pages for kids with AI.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎨</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-screen antialiased font-body" style={{ background: '#fdf8f0', color: '#2e2a27' }}>
        {/* Nav uses same warm cream as body — unified feel */}
        <nav className="sticky top-0 z-50 border-b-2 border-[#ede9e3] bg-[#fdf8f0]">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3">
            <a href="/" className="font-display text-xl font-semibold tracking-tight mr-4" style={{ color: '#1c1916' }}>
              🎨 <span style={{ color: '#f97316' }}>Robot</span> Cooks
            </a>
            <a
              href="/create"
              className="rounded-lg px-3 py-1.5 text-base font-semibold transition-all text-[#4a4440] hover:bg-[#ede9e3] hover:text-[#1c1916]"
            >
              Create
            </a>
            <a
              href="/library"
              className="rounded-lg px-3 py-1.5 text-base font-semibold transition-all text-[#4a4440] hover:bg-[#ede9e3] hover:text-[#1c1916]"
            >
              Library
            </a>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
