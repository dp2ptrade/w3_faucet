'use client';

// Import EventEmitter fix FIRST before any other modules
import '../../lib/eventEmitterFix';

import React, { useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { sepolia, mainnet } from 'wagmi/chains';
import { http } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { RecentClaimsProvider } from '@/contexts/RecentClaimsContext';

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const infuraApiKey = process.env.NEXT_PUBLIC_INFURA_API_KEY || 'demo';

// Singleton pattern to prevent multiple wagmi config instances
let wagmiConfig: any = null;

function getWagmiConfig() {
  if (!wagmiConfig) {
    wagmiConfig = getDefaultConfig({
      appName: 'W3 Energy Faucet',
      projectId,
      chains: [sepolia, mainnet],
      transports: {
        [sepolia.id]: http(`https://sepolia.infura.io/v3/${infuraApiKey}`),
        [mainnet.id]: http(`https://mainnet.infura.io/v3/${infuraApiKey}`),
      },
      ssr: true,
    });
  }
  return wagmiConfig;
}

const config = getWagmiConfig();

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

// RainbowKit with default theme (independent of app theme)
function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RainbowKitProvider
      showRecentTransactions={true}
      coolMode
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={config as any}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RecentClaimsProvider>
            <RainbowKitWrapper>
              {children}
            </RainbowKitWrapper>
          </RecentClaimsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}