'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Coins, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Server,
  Zap
} from 'lucide-react';

interface AdminStats {
  faucet: {
    status: string;
    pauseReason?: string;
    pausedAt?: number;
    pausedBy?: string;
  };
  tokens: {
    total: number;
    registered: Array<{
      address: string;
      symbol: string;
      name: string;
      amount: string;
      decimals: number;
    }>;
  };
  claims: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  users: {
    total: number;
    active: number;
    banned: number;
  };
  system: {
    uptime: number;
    version: string;
    nodeEnv: string;
  };
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">Error loading dashboard: {error}</p>
        </div>
        <button
          onClick={fetchStats}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total.toLocaleString(),
      icon: Users,
      color: 'blue',
      subtitle: `${stats.users.active} active, ${stats.users.banned} banned`
    },
    {
      title: 'Total Claims',
      value: stats.claims.total.toLocaleString(),
      icon: Activity,
      color: 'green',
      subtitle: `${stats.claims.today} today, ${stats.claims.thisWeek} this week`
    },
    {
      title: 'Registered Tokens',
      value: stats.tokens.total.toString(),
      icon: Coins,
      color: 'purple',
      subtitle: `${stats.tokens.registered.length} custom tokens`
    },
    {
      title: 'System Uptime',
      value: formatUptime(stats.system.uptime),
      icon: Server,
      color: 'orange',
      subtitle: `Version ${stats.system.version}`
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Status
          </h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            stats.faucet.status === 'active' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {stats.faucet.status === 'active' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span className="capitalize">{stats.faucet.status}</span>
          </div>
        </div>
        
        {stats.faucet.status === 'paused' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Faucet is currently paused
                </p>
                {stats.faucet.pauseReason && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                    Reason: {stats.faucet.pauseReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${getColorClasses(card.color)}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {card.value}
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Token Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Claims Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Today</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.claims.today.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">This Week</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.claims.thisWeek.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">This Month</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.claims.thisMonth.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white font-medium">Total Claims</span>
                <span className="font-bold text-xl text-gray-900 dark:text-white">
                  {stats.claims.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Token Registry */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Token Registry
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">ETH</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Native Token</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Native
              </span>
            </div>
            
            {stats.tokens.registered.slice(0, 3).map((token, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{token.name}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {token.amount}
                </span>
              </div>
            ))}
            
            {stats.tokens.registered.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  +{stats.tokens.registered.length - 3} more tokens
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}