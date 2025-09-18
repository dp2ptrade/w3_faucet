'use client';

import { useState, useEffect, useCallback } from 'react';

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueLength: number;
}

export interface QueueJob {
  id: string;
  type: 'ETH_CLAIM' | 'TOKEN_CLAIM';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  position?: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  completedAt?: number;
  transactionHash?: string;
  error?: string;
  estimatedProcessingTime?: number;
  data: {
    address: string;
    tokenAddress?: string;
    amount?: string;
  };
}

export interface UseQueueStatsOptions {
  refreshInterval?: number; // in milliseconds
  userAddress?: string; // to get user-specific jobs
  autoRefresh?: boolean;
}

export interface UseQueueStatsReturn {
  stats: QueueStats | null;
  userJobs: QueueJob[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  refetch: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useQueueStats(options: UseQueueStatsOptions = {}): UseQueueStatsReturn {
  const {
    refreshInterval = 5000,
    userAddress,
    autoRefresh = true
  } = options;

  const [stats, setStats] = useState<QueueStats | null>(null);
  const [userJobs, setUserJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [inactiveCount, setInactiveCount] = useState(0);

  const fetchQueueStats = useCallback(async () => {
    // Only fetch if userAddress is provided
    if (!userAddress) {
      setLoading(false);
      setStats(null);
      setUserJobs([]);
      setError(null);
      setLastUpdated(Date.now());
      return;
    }

    try {
      const url = new URL('/api/queue/stats', window.location.origin);
      url.searchParams.set('address', userAddress);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch queue statistics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch queue statistics');
      }

      setStats(data.stats);
      setUserJobs(data.userJobs || []);
      setError(null);
      setLastUpdated(Date.now());
      
      // Check if there are active jobs (pending or processing)
      const activeJobs = (data.userJobs || []).filter((job: QueueJob) => 
        job.status === 'pending' || job.status === 'processing'
      );
      
      if (activeJobs.length > 0) {
        // Reset inactive counter when active jobs are found
        setInactiveCount(0);
      } else {
        // Increment inactive counter when no active jobs
        setInactiveCount(prev => prev + 1);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching queue stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Initial fetch
  useEffect(() => {
    fetchQueueStats();
  }, [fetchQueueStats]);

  // Smart auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !userAddress) return;

    // Determine polling interval based on job activity
    const getPollingInterval = () => {
      const hasActiveJobs = userJobs.some(job => 
        job.status === 'pending' || job.status === 'processing'
      );
      
      if (hasActiveJobs) {
        // Normal polling for active jobs
        return refreshInterval;
      } else if (inactiveCount < 6) {
        // Slower polling for first 3 minutes after jobs complete (6 * 30s = 3min)
        return 30000; // 30 seconds
      } else if (inactiveCount < 12) {
        // Even slower polling for next 3 minutes (6 * 60s = 6min total)
        return 60000; // 1 minute
      } else {
        // Stop polling after 6 minutes of inactivity
        return null;
      }
    };

    const pollingInterval = getPollingInterval();
    
    if (pollingInterval === null) {
      // Stop polling after extended inactivity
      return;
    }

    const interval = setInterval(fetchQueueStats, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchQueueStats, refreshInterval, autoRefresh, userAddress, userJobs, inactiveCount]);

  // Manual refetch that resets inactive counter
  const manualRefetch = useCallback(async () => {
    setInactiveCount(0); // Reset inactive counter on manual refresh
    await fetchQueueStats();
  }, [fetchQueueStats]);

  const clearHistory = useCallback(async () => {
    if (!userAddress) {
      return;
    }

    try {
      const response = await fetch('/api/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: userAddress }),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to clear history');
      }

      // Refresh the data after clearing
      await fetchQueueStats();
    } catch (err: any) {
      setError(err.message);
      console.error('Error clearing history:', err);
    }
  }, [userAddress, fetchQueueStats]);

  return {
    stats,
    userJobs,
    loading,
    error,
    lastUpdated,
    refetch: manualRefetch,
    clearHistory
  };
}

// Utility functions for queue data
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return '< 1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
};

export const getQueuePosition = (jobs: QueueJob[], jobId: string): number => {
  const job = jobs.find(j => j.id === jobId);
  return job?.position || 0;
};

export const getEstimatedWaitTime = (stats: QueueStats | null, position: number): number => {
  if (!stats || position <= 0) return 0;
  const avgTime = stats.averageProcessingTime || 30000; // Default 30s
  return position * avgTime;
};

export const getJobStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'processing':
      return 'text-blue-600 bg-blue-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    case 'retrying':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};