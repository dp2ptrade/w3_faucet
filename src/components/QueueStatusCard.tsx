'use client';

import React from 'react';
import { Clock, Users, Activity, CheckCircle, XCircle, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { useQueueStats, formatDuration } from '@/hooks/useQueueStats';

interface QueueStatusCardProps {
  className?: string;
  refreshInterval?: number; // in milliseconds, default 5000
  userAddress?: string; // to show user-specific queue positions
}

export default function QueueStatusCard({ 
  className = '', 
  refreshInterval = 5000,
  userAddress 
}: QueueStatusCardProps) {
  const { stats, userJobs, loading, error, lastUpdated, refetch, clearHistory } = useQueueStats({
    refreshInterval,
    autoRefresh: true,
    userAddress
  });

  const getQueueStatus = () => {
    if (!userAddress) {
      return { 
        text: 'Connect Wallet', 
        color: 'text-gray-600', 
        icon: Users 
      };
    }
    
    const processingJobs = userJobs.filter(job => job.status === 'processing');
    const pendingJobs = userJobs.filter(job => job.status === 'pending');
    
    if (processingJobs.length > 0) {
      return { 
        text: 'Processing', 
        color: 'text-blue-600', 
        icon: RefreshCw,
        animate: true 
      };
    }
    
    if (pendingJobs.length > 0) {
      return { 
        text: 'In Queue', 
        color: 'text-yellow-600', 
        icon: Clock 
      };
    }
    
    return { 
      text: 'No Active Jobs', 
      color: 'text-green-600', 
      icon: CheckCircle 
    };
  };

  const queueStatus = getQueueStatus();
  const StatusIcon = queueStatus.icon;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Queue Status</h3>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon 
            className={`w-4 h-4 ${queueStatus.color} ${queueStatus.animate ? 'animate-spin' : ''}`} 
          />
          <span className={`text-sm font-medium ${queueStatus.color}`}>
            {queueStatus.text}
          </span>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">Failed to load queue data</span>
          </div>
          <button 
            onClick={refetch}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* User Queue Positions */}
          {userAddress ? (
            userJobs.length > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Your Queue Positions</span>
                </div>
                {userJobs.some(job => job.status === 'completed' || job.status === 'failed') && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-red-600 transition-colors"
                    title="Clear completed and failed jobs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {userJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between bg-white rounded p-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        job.status === 'pending' ? 'bg-yellow-500' :
                        job.status === 'processing' ? 'bg-blue-500' :
                        job.status === 'completed' ? 'bg-green-500' :
                        job.status === 'failed' ? 'bg-red-500' :
                        'bg-orange-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">
                        {job.type === 'ETH_CLAIM' ? 'ETH' : 'Token'} Claim
                      </span>
                      {job.position && job.position > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          #{job.position} in queue
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium capitalize ${
                        job.status === 'pending' ? 'text-yellow-600' :
                        job.status === 'processing' ? 'text-blue-600' :
                        job.status === 'completed' ? 'text-green-600' :
                        job.status === 'failed' ? 'text-red-600' :
                        'text-orange-600'
                      }`}>
                        {job.status}
                      </div>
                      {job.position && job.position > 0 && (
                        <div className="text-xs text-gray-500">
                          ~{formatDuration(job.position * 30000)} wait
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-center">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">No Active Jobs</span>
                </div>
                <p className="text-xs text-gray-500">You don't have any pending or processing transactions</p>
              </div>
            )
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Connect Wallet</span>
              </div>
              <p className="text-xs text-gray-500">Connect your wallet to see your queue positions</p>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}