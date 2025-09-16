'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, TOKEN_METADATA, ERC20_ABI } from '../lib/contracts';

interface TokenBalance {
  symbol: string;
  balance: string;
  formattedBalance: string;
  isLoading: boolean;
  error?: string;
}

interface FaucetBalances {
  [key: string]: TokenBalance;
}

export function useFaucetBalances() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [balances, setBalances] = useState<FaucetBalances>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenBalance = async (tokenSymbol: string, tokenAddress: string, decimals: number) => {
    if (!publicClient || !address) return null;

    try {
      let balance: bigint;
      
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // ETH balance - get balance from faucet contract
        balance = await publicClient.getBalance({ 
          address: CONTRACTS.FAUCET as `0x${string}` 
        });
      } else {
        // ERC20 token balance - get balance from faucet contract
        balance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [CONTRACTS.FAUCET as `0x${string}`]
        }) as bigint;
      }

      const formattedBalance = formatUnits(balance, decimals);
      
      return {
        symbol: tokenSymbol,
        balance: balance.toString(),
        formattedBalance: parseFloat(formattedBalance).toFixed(decimals === 18 ? 4 : 2),
        isLoading: false
      };
    } catch (err) {
      console.error(`Error fetching balance for ${tokenSymbol}:`, err);
      return {
        symbol: tokenSymbol,
        balance: '0',
        formattedBalance: '0',
        isLoading: false,
        error: `Failed to fetch ${tokenSymbol} balance`
      };
    }
  };

  const fetchAllBalances = async () => {
    if (!isConnected || !publicClient || !address) {
      setBalances({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenEntries = Object.entries(CONTRACTS.TOKENS);
      const balancePromises = tokenEntries.map(async ([symbol, tokenAddress]) => {
        const metadata = TOKEN_METADATA[symbol as keyof typeof TOKEN_METADATA];
        if (!metadata) return null;

        // Set loading state for this token
        setBalances(prev => ({
          ...prev,
          [symbol]: {
            symbol,
            balance: '0',
            formattedBalance: '0',
            isLoading: true
          }
        }));

        const result = await fetchTokenBalance(symbol, tokenAddress, metadata.decimals);
        return result ? { symbol, balance: result } : null;
      });

      const results = await Promise.all(balancePromises);
      const newBalances: FaucetBalances = {};

      results.forEach(result => {
        if (result) {
          newBalances[result.symbol] = result.balance;
        }
      });

      setBalances(newBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to fetch token balances');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balances when wallet connects or address changes
  useEffect(() => {
    fetchAllBalances();
  }, [isConnected, address, publicClient]);

  // Refresh balances function
  const refreshBalances = () => {
    fetchAllBalances();
  };

  return {
    balances,
    isLoading,
    error,
    refreshBalances
  };
}