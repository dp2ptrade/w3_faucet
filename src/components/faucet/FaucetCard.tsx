'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { Coins, Clock, Zap, AlertCircle, CheckCircle, RefreshCw } from '../ui/ClientIcon';

import { useUserAuth } from '../../hooks/useUserAuth';
import { useRecentClaims } from '@/contexts/RecentClaimsContext';
import { useW3EBalance } from '../../hooks/useW3EBalance';

interface Token {
  address: string;
  symbol: string;
  name: string;
  amount: string;
  decimals: number;
}

interface FaucetCardProps {
  className?: string;
}

export default function FaucetCard({ className = '' }: FaucetCardProps) {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<string>('ETH');
  const [tokens, setTokens] = useState<Record<string, Token>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [actualCooldownPeriod, setActualCooldownPeriod] = useState(1 * 60); // Default to 1 minute, will be updated from API
  // Queue-related state
  const [queueJobId, setQueueJobId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  // Removed PoW-related state variables
  const [isClient, setIsClient] = useState(false);

  const { isAuthenticated, token, isAuthenticating, error: authError, authenticate, clearError } = useUserAuth();
  const { addClaim } = useRecentClaims();
  const { hasMinBalance, currentBalance, requiredBalance, isLoading: w3eLoading, error: w3eError } = useW3EBalance();

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Poll queue status when we have a job ID
  useEffect(() => {
    if (!queueJobId || queueStatus === 'completed' || queueStatus === 'failed') {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/queue/status/${queueJobId}`);
        if (response.ok) {
          const data = await response.json();
          setQueueStatus(data.status);
          setQueuePosition(data.position);
          setEstimatedTime(data.estimatedTime);

          if (data.status === 'completed') {
            // Handle successful completion
            if (data.transactionHash) {
              const tokenSymbol = selectedToken === 'ETH' ? 'ETH' : tokens[selectedToken]?.symbol || selectedToken;
              const tokenAddress = selectedToken === 'ETH' ? '0x0000000000000000000000000000000000000000' : tokens[selectedToken]?.address;
              const amount = selectedToken === 'ETH' ? '0.1' : tokens[selectedToken]?.amount || '0';
              
              addClaim({
                txHash: data.transactionHash,
                blockNumber: data.blockNumber || 0,
                token: tokenSymbol,
                tokenAddress: tokenAddress || '',
                amount: amount,
                formattedAmount: `${amount} ${tokenSymbol}`,
                userAddress: address || '',
              });

              toast.success(
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Claim Completed!</p>
                    <p className="text-sm text-gray-600">
                      {tokenSymbol} tokens sent to your wallet
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      TX: {data.transactionHash.slice(0, 10)}...
                    </p>
                  </div>
                </div>,
                { duration: 5000 }
              );
            }
            
            // Clear queue state and set cooldown
            setQueueJobId(null);
            setQueueStatus(null);
            setQueuePosition(null);
            setEstimatedTime(null);
            setCooldownTime(actualCooldownPeriod);
          } else if (data.status === 'failed') {
            const errorMessage = data.error || 'Transaction failed';
            
            // Check if error is due to cooldown and extract time
            const cooldownMatch = errorMessage.match(/Try again in (\d+) minutes/);
            if (cooldownMatch) {
              const cooldownMinutes = parseInt(cooldownMatch[1]);
              const cooldownSeconds = cooldownMinutes * 60;
              setCooldownTime(cooldownSeconds);
              
              toast.error(
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Cooldown Active</p>
                    <p className="text-sm text-gray-600">
                      Please wait {cooldownMinutes} minutes before claiming again
                    </p>
                  </div>
                </div>,
                { duration: 5000 }
              );
            } else {
              toast.error(errorMessage);
            }
            
            setQueueJobId(null);
            setQueueStatus(null);
            setQueuePosition(null);
            setEstimatedTime(null);
          }
        }
      } catch (error) {
        console.error('Error polling queue status:', error);
      }
    };

    const interval = setInterval(() => {
      // Only poll if page is visible to reduce unnecessary API calls
      if (!document.hidden) {
        pollStatus();
      }
    }, 5000); // Poll every 5 seconds instead of 2 seconds
    return () => clearInterval(interval);
  }, [queueJobId, queueStatus, selectedToken, tokens, address, addClaim, actualCooldownPeriod]);

  // Fetch actual cooldown period from API
  useEffect(() => {
    const fetchCooldownPeriod = async () => {
      try {
        const response = await fetch('/api/faucet/stats');
        if (response.ok) {
          const data = await response.json();
          const cooldownMs = data.cooldownPeriod || 1 * 60 * 1000; // Default to 1 minute if not available
          setActualCooldownPeriod(Math.ceil(cooldownMs / 1000)); // Convert to seconds
        }
      } catch (error) {
        console.error('Failed to fetch cooldown period:', error);
      }
    };
    
    fetchCooldownPeriod();
  }, []);

  // Check for existing cooldown on mount
  useEffect(() => {
    const lastClaim = localStorage.getItem('lastClaimTime');
    if (lastClaim) {
      const timeSinceLastClaim = Date.now() - parseInt(lastClaim);
      const cooldownPeriod = actualCooldownPeriod * 1000; // Convert to milliseconds
      
      if (timeSinceLastClaim < cooldownPeriod) {
        setCooldownTime(Math.ceil((cooldownPeriod - timeSinceLastClaim) / 1000));
      }
    }
  }, [actualCooldownPeriod]);

  // Fetch available tokens
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/faucet/tokens');
        const data = await response.json();
        
        if (data.tokens) {
          setTokens(data.tokens);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        toast.error('Failed to load available tokens');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldownTime]);

  // Removed PoW challenge function

  // Removed PoW solving function

  // Handle token claim
  const handleClaim = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (cooldownTime > 0) {
      const minutes = Math.ceil(cooldownTime / 60);
      const timeUnit = minutes >= 60 ? `${Math.ceil(minutes / 60)} hour(s)` : `${minutes} minute(s)`;
      toast.error(`Please wait ${timeUnit} before claiming again`);
      return;
    }

    try {
      setIsClaiming(true);
      
      // Authenticate user if not already authenticated
      if (!isAuthenticated || !token) {
        const authSuccess = await authenticate();
        if (!authSuccess) {
          return; // Authentication failed, error is handled by the hook
        }
      }

      // Prepare claim request
      const claimData = {
        address,
        tokenAddress: selectedToken === 'ETH' ? '0x0000000000000000000000000000000000000000' : tokens[selectedToken]?.address
      };

      // Submit claim with authentication token
      const response = await fetch('/api/faucet/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(claimData),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if this is a queue response or direct transaction response
        if (result.jobId) {
          // Queue response - set up queue tracking
          setQueueJobId(result.jobId);
          setQueueStatus(result.status);
          setQueuePosition(result.position);
          setEstimatedTime(result.estimatedTime);
          
          toast.success(
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">Claim Queued!</p>
                <p className="text-sm text-gray-600">
                  Position #{result.position} in queue
                </p>
                {result.estimatedTime && (
                  <p className="text-xs text-gray-500">
                    Est. time: {Math.ceil(result.estimatedTime / 1000)}s
                  </p>
                )}
              </div>
            </div>,
            { duration: 4000 }
          );
        } else {
          // Direct transaction response (fallback mode)
          const tokenSymbol = selectedToken === 'ETH' ? 'ETH' : tokens[selectedToken]?.symbol || selectedToken;
          const tokenAddress = selectedToken === 'ETH' ? '0x0000000000000000000000000000000000000000' : tokens[selectedToken]?.address;
          const amount = selectedToken === 'ETH' ? '0.1' : tokens[selectedToken]?.amount || '0';
          
          // Add claim to in-memory storage for instant display
          if (address && result.transactionHash) {
            addClaim({
              txHash: result.transactionHash,
              blockNumber: result.blockNumber || 0, // Will be updated when available
              token: tokenSymbol,
              tokenAddress: tokenAddress || '',
              amount: amount,
              formattedAmount: `${amount} ${tokenSymbol}`,
              userAddress: address,
            });
          }
          
          toast.success(
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Claim Successful!</p>
                <p className="text-sm text-gray-600">
                  {tokenSymbol} tokens sent to your wallet
                </p>
                {result.transactionHash && (
                  <p className="text-xs text-gray-500 font-mono">
                    TX: {result.transactionHash.slice(0, 10)}...
                  </p>
                )}
              </div>
            </div>,
            { duration: 5000 }
          );
          
          // Set cooldown using actual period
          setCooldownTime(actualCooldownPeriod);
        }
      } else {
        if (result.retryAfter) {
          setCooldownTime(result.retryAfter);
        }
        toast.error(result.message || 'Claim failed');
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error('An error occurred while claiming tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4 sm:mb-6">
        <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-xl flex-shrink-0">
          <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Claim Tokens
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Get free testnet tokens for development
          </p>
        </div>
      </div>

      {/* Token Selection */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Token
        </label>

        {/* Mobile and Tablet List View */}
        <div className="block lg:hidden space-y-2">
          {Object.entries(tokens).map(([symbol, token]) => {
            return (
              <button
                key={symbol}
                onClick={() => setSelectedToken(symbol)}
                className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedToken === symbol
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="font-semibold text-base text-gray-900 dark:text-white">
                        {symbol}
                      </div>
                      {selectedToken === symbol && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Claim: {token.amount} {symbol}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop Grid View */}
        <div className="hidden lg:grid grid-cols-1 xl:grid-cols-3 gap-3">
          {Object.entries(tokens).map(([symbol, token]) => {
            return (
              <button
                key={symbol}
                onClick={() => setSelectedToken(symbol)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedToken === symbol
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-base text-gray-900 dark:text-white">
                      {symbol}
                    </div>
                    {selectedToken === symbol && (
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Claim: {token.amount} {symbol}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wallet Connection Status */}
      {!isClient ? (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to claim tokens
            </p>
          </div>
        </div>
      ) : !isConnected ? (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to claim tokens
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200">
              Wallet connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      )}

      {/* Authentication Status */}
      {isConnected && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-800 dark:text-blue-200">
                    Authenticated for claiming
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-800 dark:text-blue-200">
                    Authentication required to claim tokens
                  </p>
                </>
              )}
            </div>
            {!isAuthenticated && !isAuthenticating && (
              <button
                onClick={authenticate}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Authenticate
              </button>
            )}
            {isAuthenticating && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Authenticating...</span>
              </div>
            )}
          </div>
          {authError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* W3E Token Balance Requirement */}
      {isConnected && (
        <div className={`mb-6 p-4 border rounded-xl ${
          hasMinBalance 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasMinBalance ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-200">
                    W3E Token Requirement Met
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-200">
                    W3E Token Requirement Not Met
                  </p>
                </>
              )}
            </div>
            {w3eLoading && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Checking...</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-sm">
            {w3eError ? (
              <p className="text-red-600 dark:text-red-400">{w3eError}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-gray-600 dark:text-gray-400">
                  Current Balance: {parseFloat(currentBalance) / Math.pow(10, 18)} W3E
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Required: {parseFloat(requiredBalance) / Math.pow(10, 18)} W3E
                </p>
                {!hasMinBalance && (
                  <p className="text-red-600 dark:text-red-400 font-medium">
                    You need at least {parseFloat(requiredBalance) / Math.pow(10, 18)} W3E tokens to use this faucet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Status */}
      {queueJobId && queueStatus && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
               {queueStatus === 'pending' && <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
               {queueStatus === 'processing' && <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />}
               {queueStatus === 'retrying' && <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
               <div>
                 <p className="text-blue-800 dark:text-blue-200 font-medium">
                   {queueStatus === 'pending' && 'Transaction Queued'}
                   {queueStatus === 'processing' && 'Processing Transaction'}
                   {queueStatus === 'retrying' && 'Retrying Transaction'}
                 </p>
                {queuePosition !== null && queueStatus === 'pending' && (
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Position #{queuePosition} in queue
                  </p>
                )}
                {estimatedTime && queueStatus === 'pending' && (
                  <p className="text-xs text-blue-500 dark:text-blue-400">
                    Estimated time: {Math.ceil(estimatedTime / 1000)} seconds
                  </p>
                )}
              </div>
            </div>
            {queueStatus === 'pending' && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/queue/cancel/${queueJobId}`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });
                    if (response.ok) {
                      setQueueJobId(null);
                      setQueueStatus(null);
                      setQueuePosition(null);
                      setEstimatedTime(null);
                      toast.success('Transaction cancelled');
                    }
                  } catch (error) {
                    toast.error('Failed to cancel transaction');
                  }
                }}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cooldown Timer */}
      {cooldownTime > 0 && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <p className="text-orange-800 dark:text-orange-200">
              Next claim available in: <span className="font-mono font-bold">{formatTime(cooldownTime)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Removed PoW status display */}

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={!isClient || !isConnected || isClaiming || cooldownTime > 0 || !hasMinBalance || !!queueJobId}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
          !isClient || !isConnected || isClaiming || cooldownTime > 0 || !hasMinBalance || !!queueJobId
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isClaiming ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Claiming...</span>
          </div>
        ) : queueJobId && queueStatus === 'pending' ? (
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Queued (#{queuePosition})</span>
          </div>
        ) : queueJobId && queueStatus === 'processing' ? (
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : queueJobId && queueStatus === 'retrying' ? (
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Retrying...</span>
          </div>
        ) : cooldownTime > 0 ? (
          `Wait ${formatTime(cooldownTime)}`
        ) : !isClient || !isConnected ? (
          'Connect Wallet'
        ) : !hasMinBalance ? (
          'Need W3E Tokens'
        ) : (
          `Claim ${tokens[selectedToken]?.amount || '0'} ${selectedToken}`
        )}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Connect your wallet to claim free testnet tokens</li>
          <li>• Each address can claim once every 1 minute</li>
          <li>• Each address can claim upto 5 claims per day different token</li>
          <li className="font-semibold text-orange-600 dark:text-orange-400">• 24-hour cooldown period for same token claims</li>
          <li>• Tokens are sent directly to your wallet</li>
          <li>• Use these tokens for testing and development</li>
        </ul>
      </div>
      
      {/* Cooldown Info Card */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">Cooldown Policy</h4>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          After claiming a token, you must wait <span className="font-bold">24 hours</span> before claiming the same token again. 
          You can claim different tokens without waiting.
        </p>
      </div>
    </div>
  );
}