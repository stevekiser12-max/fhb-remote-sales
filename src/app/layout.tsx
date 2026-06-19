import type { Metadata, Viewport } from 'next';
import './globals.css';
import PushManager from '@/components/PushManager';

export const metadata: Metadata = {
  title: 'FHB Lead Pilot',
  description: 'Favored Home Buyers — Mobile Lead Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lead Pilot',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <PushManager />
        {children}
      </body>
    </html>
  );
}
