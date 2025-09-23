'use client';

import { useEffect, useState, useRef } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Hash } from 'viem';

interface UseTransactionConfirmationOptions {
  hash?: Hash;
  enabled?: boolean;
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
  confirmations?: number; // Number of confirmations to wait for
}

interface UseTransactionConfirmationReturn {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  receipt: any;
  confirmations: number;
}

export function useTransactionConfirmation({
  hash,
  enabled = true,
  onSuccess,
  onError,
  confirmations = 1
}: UseTransactionConfirmationOptions): UseTransactionConfirmationReturn {
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const callbacksCalledRef = useRef(false);
  const publicClient = usePublicClient();

  // Use wagmi's built-in transaction receipt hook
  const {
    data: receipt,
    isLoading,
    isSuccess: receiptSuccess,
    isError,
    error
  } = useWaitForTransactionReceipt({
    hash,
    confirmations,
    query: {
      enabled: enabled && !!hash
    }
  });

  // Watch for additional confirmations if needed
  useEffect(() => {
    if (!receiptSuccess || !receipt || !publicClient || confirmations <= 1) {
      return;
    }

    if (isWatching) return;
    setIsWatching(true);

    let unwatch: (() => void) | undefined;

    const watchConfirmations = async () => {
      try {
        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();
        const transactionBlock = BigInt(receipt.blockNumber);
        const currentConfirmations = Number(currentBlock - transactionBlock + BigInt(1));
        
        setConfirmationCount(currentConfirmations);

        if (currentConfirmations >= confirmations) {
          if (!callbacksCalledRef.current && onSuccess) {
            callbacksCalledRef.current = true;
            onSuccess(receipt);
          }
          return;
        }

        // Watch for new blocks to update confirmation count
        unwatch = publicClient.watchBlocks({
          onBlock: async (block) => {
            const newConfirmations = Number(block.number - transactionBlock + BigInt(1));
            setConfirmationCount(newConfirmations);

            if (newConfirmations >= confirmations) {
              if (!callbacksCalledRef.current && onSuccess) {
                callbacksCalledRef.current = true;
                onSuccess(receipt);
              }
              unwatch?.();
            }
          }
        });
      } catch (err) {
        console.error('Error watching confirmations:', err);
        if (onError) {
          onError(err as Error);
        }
      }
    };

    watchConfirmations();

    return () => {
      unwatch?.();
      setIsWatching(false);
    };
  }, [receiptSuccess, receipt, publicClient, confirmations, onSuccess, onError, isWatching]);

  // Handle single confirmation case
  useEffect(() => {
    if (receiptSuccess && receipt && confirmations === 1) {
      setConfirmationCount(1);
      if (!callbacksCalledRef.current && onSuccess) {
        callbacksCalledRef.current = true;
        onSuccess(receipt);
      }
    }
  }, [receiptSuccess, receipt, confirmations, onSuccess]);

  // Handle errors
  useEffect(() => {
    if (isError && error && onError) {
      onError(error);
    }
  }, [isError, error, onError]);

  // Reset callbacks when hash changes
  useEffect(() => {
    callbacksCalledRef.current = false;
    setConfirmationCount(0);
    setIsWatching(false);
  }, [hash]);

  return {
    isLoading,
    isSuccess: receiptSuccess && confirmationCount >= confirmations,
    isError,
    error,
    receipt,
    confirmations: confirmationCount
  };
}