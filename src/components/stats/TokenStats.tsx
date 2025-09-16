'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Coins, Activity, RefreshCw, Wallet, Copy, ExternalLink } from '../ui/ClientIcon';
import { toast } from 'react-hot-toast';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACTS, FAUCET_ABI, ERC20_ABI, TOKEN_METADATA, NETWORK_CONFIG } from '@/lib/contracts';






interface FaucetStats {
  totalClaims: number;
  cooldownHours: number;
  tokenStats: Record<string, any>;
  dailyLimit: number;
  cooldownPeriod: number;
  lastUpdated: number;
  userAddress?: string;
  isUserSpecific?: boolean;
}

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  isLoading: boolean;
}

interface TokenStatsProps {
  className?: string;
  userAddress?: string;
}

export default function TokenStats({ className = '', userAddress }: TokenStatsProps) {
  // Don't render anything if no wallet is connected
  if (!userAddress) {
    return null;
  }


  const [stats, setStats] = useState<FaucetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<{address: string, symbol: string, name: string}[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [showTokenSelection, setShowTokenSelection] = useState(false);

  // Helper function to format addresses
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Helper function to check if string is an address
  const isAddress = (str: string) => {
    return str.startsWith('0x') && str.length === 42;
  };

  // Helper function to get display name for token
  const getTokenDisplayName = (key: string, tokenData: any) => {
    // Use token name if available, otherwise use symbol, fallback to formatted address
    if (tokenData?.name) {
      return tokenData.name;
    }
    if (tokenData?.symbol) {
      return tokenData.symbol;
    }
    return isAddress(key) ? formatAddress(key) : key;
  };

  // Helper function to get token symbol for avatar
  const getTokenSymbol = (key: string, tokenData: any) => {
    if (tokenData?.symbol) {
      return tokenData.symbol;
    }
    return isAddress(key) ? '0x' : key.slice(0, 2);
  };

  // Helper function to copy address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  // Helper function to add token to MetaMask
  const addToMetaMask = async (token: TokenBalance) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const wasAdded = await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              image: '', // Optional: could add token logo URL here
            },
          },
        });
        
        if (wasAdded) {
          toast.success(`${token.symbol} added to MetaMask!`);
        }
      } else {
        toast.error('MetaMask is not installed');
      }
    } catch (error) {
      console.error('Error adding token to MetaMask:', error);
      toast.error('Failed to add token to MetaMask');
    }
  };

  const fetchStats = async (forceRefresh: boolean = false) => {
    try {
      // Fetch basic stats (without recent claims) from API
      const url = new URL('/api/faucet/stats', window.location.origin);
      if (userAddress) {
        url.searchParams.append('address', userAddress);
      }
      if (forceRefresh) {
        url.searchParams.append('refresh', 'true');
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load faucet statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTokens = async () => {
    try {
      // Create public client for reading from blockchain
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(NETWORK_CONFIG.SEPOLIA.rpcUrl)
      });

      // Get supported tokens from faucet contract
      const supportedTokens = await publicClient.readContract({
        address: CONTRACTS.FAUCET as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: 'getSupportedTokens'
      }) as `0x${string}`[];

      const tokens: {address: string, symbol: string, name: string}[] = [];

      // Always add ETH first since it's supported but not returned by getSupportedTokens
      tokens.push({
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum'
      });

      // Get metadata for each supported token from the contract
      for (const tokenAddress of supportedTokens) {
        try {
          let symbol: string;
          let name: string;

          // ERC20 token
          try {
            symbol = await publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'symbol'
            }) as string;

            // Use name from TOKEN_METADATA or fallback to symbol
            const tokenMeta = Object.values(TOKEN_METADATA).find(t => 
              CONTRACTS.TOKENS[t.symbol as keyof typeof CONTRACTS.TOKENS] === tokenAddress
            );
            name = tokenMeta?.name || symbol;
          } catch {
            // Fallback if token metadata calls fail
            symbol = 'UNKNOWN';
            name = 'Unknown Token';
          }

          tokens.push({
            address: tokenAddress,
            symbol,
            name
          });
        } catch (error) {
          console.error(`Error fetching metadata for token ${tokenAddress}:`, error);
        }
      }

      setAvailableTokens(tokens);
    } catch (error) {
      console.error('Error fetching available tokens:', error);
    }
  };

  const fetchTokenBalances = async () => {
    if (!userAddress || selectedTokens.size === 0) return;
    
    setBalancesLoading(true);
    try {
      // Create public client for reading from blockchain
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(NETWORK_CONFIG.SEPOLIA.rpcUrl)
      });

      const balances: TokenBalance[] = [];

      // Fetch balance for each selected token
       for (const tokenAddress of Array.from(selectedTokens)) {
         try {
           let balance: bigint;
           let symbol: string;
           let decimals: number;
           let name: string;

           if (tokenAddress === '0x0000000000000000000000000000000000000000') {
             // ETH balance - fetch from user's wallet
             balance = await publicClient.getBalance({
               address: userAddress as `0x${string}`
             });
             symbol = 'ETH';
             decimals = 18;
             name = 'Ethereum';
           } else {
             // ERC20 token balance - fetch from user's wallet
             balance = await publicClient.readContract({
               address: tokenAddress as `0x${string}`,
               abi: ERC20_ABI,
               functionName: 'balanceOf',
               args: [userAddress as `0x${string}`]
             }) as bigint;

             // Get token metadata
             try {
               symbol = await publicClient.readContract({
                 address: tokenAddress as `0x${string}`,
                 abi: ERC20_ABI,
                 functionName: 'symbol'
               }) as string;

              decimals = await publicClient.readContract({
                 address: tokenAddress as `0x${string}`,
                 abi: ERC20_ABI,
                 functionName: 'decimals'
               }) as number;

              // Use name from TOKEN_METADATA or fallback to symbol
              const tokenMeta = Object.values(TOKEN_METADATA).find(t => 
                CONTRACTS.TOKENS[t.symbol as keyof typeof CONTRACTS.TOKENS] === tokenAddress
              );
              name = tokenMeta?.name || symbol;
            } catch {
              // Fallback if token metadata calls fail
              symbol = 'UNKNOWN';
              decimals = 18;
              name = 'Unknown Token';
            }
          }

          balances.push({
            address: tokenAddress,
            symbol,
            name,
            balance: formatUnits(balance, decimals),
            decimals,
            isLoading: false
          });
        } catch (error) {
          console.error(`Error fetching balance for token ${tokenAddress}:`, error);
          // Add token with error state
          balances.push({
            address: tokenAddress,
            symbol: 'ERROR',
            name: 'Error loading token',
            balance: '0',
            decimals: 18,
            isLoading: false
          });
        }
      }

      setTokenBalances(balances);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      toast.error('Failed to load faucet balances');
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchStats();
      fetchAvailableTokens();
    }
  }, [userAddress]); // Re-fetch when userAddress changes (wallet connects/disconnects)



  // Auto-refresh when page becomes visible (after successful claims)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userAddress) {
        // Force refresh when page becomes visible to catch new claims
        fetchStats(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userAddress]);

  // Periodic refresh every 2 minutes when user is active (less aggressive)
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchStats(false); // Don't force refresh, just update stats
      }
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [userAddress]);

  useEffect(() => {
    if (userAddress && selectedTokens.size > 0) {
      fetchTokenBalances();
    }
  }, [userAddress, selectedTokens]); // Re-fetch when userAddress or selectedTokens changes

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 ${className}`}>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load statistics</p>
          <button
            onClick={() => fetchStats()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.isUserSpecific ? 'Your Statistics' : 'Faucet Statistics'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats?.isUserSpecific && stats?.userAddress && (
                  <span className="block mb-1">
                    Address: {formatAddress(stats.userAddress)}
                  </span>
                )}
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              fetchStats(true); // Force refresh to bypass cache
              fetchAvailableTokens();
              if (userAddress && selectedTokens.size > 0) {
                fetchTokenBalances();
              }
            }}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Refresh stats (force update)"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl w-fit mx-auto mb-3">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.cooldownHours}h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Cooldown for same token
            </div>
          </div>

          <div className="text-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl w-fit mx-auto mb-3">
              <Coins className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.dailyLimit}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Limit
            </div>
          </div>

          <div className="text-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl w-fit mx-auto mb-3">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(() => {
                const minutes = Math.floor(stats.cooldownPeriod / 60000);
                if (minutes >= 60) {
                  const hours = Math.floor(minutes / 60);
                  return `${hours}h`;
                }
                return `${minutes}m`;
              })()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Cooldown for each token
            </div>
          </div>
        </div>

        {/* Your Wallet Token Balances */}
        {stats?.isUserSpecific && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Wallet Balances
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowTokenSelection(!showTokenSelection)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {showTokenSelection ? 'Hide Selection' : 'Select Tokens'}
                </button>
                <button
                  onClick={fetchTokenBalances}
                  disabled={balancesLoading || selectedTokens.size === 0}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                  title="Refresh balances"
                >
                  <RefreshCw className={`w-4 h-4 ${balancesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Token Selection */}
            {showTokenSelection && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Select tokens to check balances:
                </h5>
                <div className="space-y-2">
                  {availableTokens.map((token) => (
                    <label
                      key={token.address}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTokens.has(token.address)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTokens);
                          if (e.target.checked) {
                            newSelected.add(token.address);
                          } else {
                            newSelected.delete(token.address);
                          }
                          setSelectedTokens(newSelected);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                          <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {token.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {token.symbol} • {formatAddress(token.address)}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedTokens.size > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTokens.size} token{selectedTokens.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedTokens(new Set())}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              {selectedTokens.size === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Select tokens above to check faucet balances</p>
                </div>
              ) : balancesLoading ? (
                <div className="space-y-3">
                  {Array.from(selectedTokens).map((address, i) => (
                    <div key={address} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tokenBalances.length > 0 ? (
                tokenBalances.map((token) => (
                  <div
                    key={token.address}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                  >
                    {/* Mobile Layout: Single line responsive */}
                    <div className="block md:hidden">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full flex-shrink-0">
                          <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                              {token.name}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                              {parseFloat(token.balance).toLocaleString(undefined, {
                                maximumFractionDigits: 6
                              })} {token.symbol}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => copyToClipboard(token.address)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Copy contract address"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copy</span>
                        </button>
                        <button
                          onClick={() => addToMetaMask(token)}
                          className="flex items-center space-x-2 px-4 py-2 text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="Add to MetaMask"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm">Add</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Tablet & Desktop Layout: Horizontal */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                          <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {token.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {formatAddress(token.address)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {parseFloat(token.balance).toLocaleString(undefined, {
                              maximumFractionDigits: 6
                            })} {token.symbol}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Available
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => copyToClipboard(token.address)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Copy contract address"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => addToMetaMask(token)}
                            className="p-2 text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Add to MetaMask"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Failed to load balance data for selected tokens</p>
                </div>
              )}
            </div>
          </div>
        )}




        
      </div>
    </div>
  );
}