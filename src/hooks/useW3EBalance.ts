'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';

// Faucet ABI for checkW3EBalance function
const FAUCET_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'checkW3EBalance',
    outputs: [
      { internalType: 'bool', name: 'hasBalance', type: 'bool' },
      { internalType: 'uint256', name: 'currentBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'requiredBalance', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface W3EBalanceData {
  hasMinBalance: boolean;
  currentBalance: string;
  requiredBalance: string;
  isLoading: boolean;
  error: string | null;
}

export function useW3EBalance(): W3EBalanceData {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Check W3E balance using faucet contract
  const {
    data: balanceData,
    isLoading,
    error: faucetError,
  } = useReadContract({
    address: CONTRACTS.FAUCET as `0x${string}`,
    abi: FAUCET_ABI,
    functionName: 'checkW3EBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  });

  useEffect(() => {
    if (faucetError) {
      setError('Failed to check W3E balance requirement');
    } else {
      setError(null);
    }
  }, [faucetError]);

  // If not connected, return default values
  if (!isConnected || !address) {
    return {
      hasMinBalance: false,
      currentBalance: '0',
      requiredBalance: '10000000000000000000', // 10 W3E tokens
      isLoading: false,
      error: null
    };
  }

  // If W3E token is not set, allow access
  if (CONTRACTS.TOKENS.W3E === '0x0000000000000000000000000000000000000000') {
    return {
      hasMinBalance: true,
      currentBalance: '0',
      requiredBalance: '0',
      isLoading: false,
      error: null
    };
  }

  // Use faucet contract data if available
  if (balanceData && !faucetError) {
    const [hasBalance, currentBalance, requiredBalance] = balanceData;
    return {
      hasMinBalance: hasBalance,
      currentBalance: currentBalance.toString(),
      requiredBalance: requiredBalance.toString(),
      isLoading,
      error
    };
  }

  // Default state while loading or on error
  return {
    hasMinBalance: false,
    currentBalance: '0',
    requiredBalance: '10000000000000000000',
    isLoading,
    error
  };
}