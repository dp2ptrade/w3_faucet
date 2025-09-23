'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface QueueStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  position?: number;
  estimatedTime?: number;
  transactionHash?: string;
  error?: string;
  data?: any;
}

interface UseSmartQueuePollingProps {
  jobId: string | null;
  enabled?: boolean;
  onCompleted?: (data: QueueStatus) => void;
  onFailed?: (data: QueueStatus) => void;
  pollingInterval?: number;
  maxRetries?: number;
}

interface UseSmartQueuePollingReturn {
  status: string | null;
  position: number | null;
  estimatedTime: number | null;
  error: string | null;
  isPolling: boolean;
}

export function useSmartQueuePolling({
  jobId,
  enabled = true,
  onCompleted,
  onFailed,
  pollingInterval = 2000,
  maxRetries = 30
}: UseSmartQueuePollingProps): UseSmartQueuePollingReturn {
  const [status, setStatus] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Use refs to track polling state and avoid stale closures
  const isPollingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const shouldTerminateRef = useRef(false);
  const lastDataRef = useRef<string>('');

  // Clear any existing timeout
  const clearPollingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset polling state
  const resetPollingState = useCallback(() => {
    clearPollingTimeout();
    isPollingRef.current = false;
    shouldTerminateRef.current = false;
    retryCountRef.current = 0;
    lastDataRef.current = '';
    setIsPolling(false);
  }, [clearPollingTimeout]);

  const pollStatus = useCallback(async () => {
    if (!jobId || !enabled || shouldTerminateRef.current) {
      return;
    }

    try {
      const response = await fetch(`/api/queue/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: QueueStatus = await response.json();
      
      if (data) {
        // Only update state if data has actually changed
        const currentDataString = JSON.stringify({
          status: data.status,
          position: data.position,
          estimatedTime: data.estimatedTime,
          transactionHash: data.transactionHash
        });

        if (currentDataString !== lastDataRef.current) {
          lastDataRef.current = currentDataString;
          
          setStatus(data.status);
          setPosition(data.position || null);
          setEstimatedTime(data.estimatedTime || null);
          setError(null);
        }

        // Check for completion - either status is completed OR we have a transaction hash
        if (data.status === 'completed' || data.transactionHash) {
          // Immediately stop polling
          isPollingRef.current = false;
          shouldTerminateRef.current = true;
          clearPollingTimeout();
          
          // Clear cache and update state
          lastDataRef.current = '';
          setIsPolling(false);
          
          // Call onCompleted callback last
          if (onCompleted) {
            onCompleted(data);
          }
          return;
        }

        // Check for failure
        if (data.status === 'failed') {
          isPollingRef.current = false;
          shouldTerminateRef.current = true;
          clearPollingTimeout();
          setIsPolling(false);
          
          if (onFailed) {
            onFailed(data);
          }
          return;
        }

        // Reset retry count on successful response
        retryCountRef.current = 0;
      }
    } catch (error) {
      retryCountRef.current++;
      
      if (retryCountRef.current >= maxRetries) {
        isPollingRef.current = false;
        shouldTerminateRef.current = true;
        clearPollingTimeout();
        setIsPolling(false);
        setError('Max retries exceeded');
        
        if (onFailed) {
          onFailed({
            id: jobId,
            status: 'failed',
            error: 'Max retries exceeded'
          } as QueueStatus);
        }
        return;
      }
    }

    // Continue polling if we haven't terminated
    if (isPollingRef.current && !shouldTerminateRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (isPollingRef.current && !shouldTerminateRef.current) {
          pollStatus();
        }
      }, pollingInterval);
    }
  }, [jobId, enabled, onCompleted, onFailed, pollingInterval, maxRetries, clearPollingTimeout]);

  // Main effect to control polling
  useEffect(() => {
    // Reset state when jobId or enabled changes
    if (!jobId || !enabled) {
      resetPollingState();
      setStatus(null);
      setPosition(null);
      setEstimatedTime(null);
      setError(null);
      return;
    }

    // Start polling if not already polling
    if (!isPollingRef.current && !shouldTerminateRef.current) {
      isPollingRef.current = true;
      setIsPolling(true);
      pollStatus();
    }

    // Cleanup function
    return () => {
      resetPollingState();
    };
  }, [jobId, enabled, pollStatus, resetPollingState]);

  return {
    status,
    position,
    estimatedTime,
    error,
    isPolling
  };
}