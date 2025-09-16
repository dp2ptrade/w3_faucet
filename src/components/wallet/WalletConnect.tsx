'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Copy, ExternalLink } from '../ui/ClientIcon';
import { toast } from 'react-hot-toast';

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className = '' }: WalletConnectProps) {
  const [isClient, setIsClient] = useState(false);
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard!');
    }
  };

  const openInExplorer = () => {
    if (address) {
      // Using Sepolia testnet explorer
      window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank');
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Prevent hydration mismatch by only rendering after client-side mount
  if (!isClient) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Loading Wallet...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Initializing wallet connection
          </p>
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Connected
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {connector?.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(address)}
              </p>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={copyAddress}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              <button
                onClick={openInExplorer}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="View in explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => disconnect()}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="text-center">
        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your wallet to start claiming testnet tokens
        </p>
        
        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors flex items-center justify-center">
                <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              
              <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {connector.name}
              </span>
              
              {isPending && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            By connecting your wallet, you agree to our terms of service.
            Make sure you're on the correct network (Sepolia testnet).
          </p>
        </div>
      </div>
    </div>
  );
}