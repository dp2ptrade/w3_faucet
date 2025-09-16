'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins
} from 'lucide-react';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  address: string;
  usdValue?: number;
}

interface ContractBalances {
  eth: {
    balance: string;
    usdValue?: number;
  };
  tokens: TokenBalance[];
  lastUpdated: string;
}

export function ContractBalance() {
  const [balances, setBalances] = useState<ContractBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = async () => {
    try {
      setError(null);
      // Using admin stats API route
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Please authenticate as an admin first');
      }

      const response = await fetch('/api/admin/contract-balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error('Failed to fetch contract balances');
      }
      
      const data = await response.json();
      setBalances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const formatBalance = (balance: string, decimals: number = 18) => {
    const value = parseFloat(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const formatUSD = (value?: number) => {
    if (!value) return 'N/A';
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contract Balance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contract Balance
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Failed to Load Balances
              </h3>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contract Balance
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor faucet contract ETH and token balances
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Last Updated */}
      {balances?.lastUpdated && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date(balances.lastUpdated).toLocaleString()}
        </div>
      )}

      {/* ETH Balance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ETH Balance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Native Ethereum balance
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {balances ? formatBalance(balances.eth.balance) : '0'} ETH
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatUSD(balances?.eth.usdValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Token Balances
        </h3>
        
        {balances?.tokens && balances.tokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balances.tokens.map((token, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Coins className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {token.symbol}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {token.name}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatBalance(token.balance, token.decimals)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {token.symbol}
                    </p>
                  </div>
                  
                  {token.usdValue && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {formatUSD(token.usdValue)}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                      {token.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center">
            <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              No Token Balances
            </h4>
            <p className="text-gray-500 dark:text-gray-500">
              No supported tokens found or all balances are zero
            </p>
          </div>
        )}
      </div>
    </div>
  );
}