// Import EventEmitter fix FIRST before any other modules
import '@/lib/eventEmitterFix';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
};

export const metadata: Metadata = {
  title: 'W3 Energy Faucet DApp',
  description: 'W3 Energy\'s comprehensive faucet DApp for Sepolia ETH testnet that allows users to mint various testnet tokens and claim Sepolia ETH.',
  keywords: ['faucet', 'ethereum', 'sepolia', 'testnet', 'tokens', 'web3', 'dapp', 'w3energy'],
  authors: [{ name: 'W3 Energy' }],
  icons: {
    icon: '/w3-logo.png',
    shortcut: '/w3-logo.png',
    apple: '/w3-logo.png',
  },
  openGraph: {
    title: 'W3 Energy Faucet DApp',
    description: 'Claim Sepolia ETH and various testnet tokens for development and testing with W3 Energy.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'W3 Energy Faucet DApp',
    description: 'Claim Sepolia ETH and various testnet tokens for development and testing with W3 Energy.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}