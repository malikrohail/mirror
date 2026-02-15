import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { Sidebar } from '@/components/layout/sidebar';
import { NavigationFade } from '@/components/layout/navigation-progress';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'miror | Our AI testers don\'t just analyze websites. They become people.',
  description: 'Our AI testers don\'t just analyze websites. They become people.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Red+Hat+Display:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className={`${geistMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <NavigationFade>
              {children}
            </NavigationFade>
          </div>
        </Providers>
      </body>
    </html>
  );
}
