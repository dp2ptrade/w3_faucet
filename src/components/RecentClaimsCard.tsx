'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRecentClaims } from '@/contexts/RecentClaimsContext';
import { formatDistanceToNow } from 'date-fns';
import { X, AlertCircle, Clock, Activity } from '@/components/ui/ClientIcon';

interface RecentClaimsCardProps {
  userAddress?: string;
}

export default function RecentClaimsCard({ userAddress }: RecentClaimsCardProps) {
  const { address } = useAccount();
  const { recentClaims, deleteClaim, deleteClaimsForUser } = useRecentClaims();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null);

  const currentAddress = userAddress || address;

  // Don't render if no wallet connected
  if (!currentAddress) {
    return null;
  }

  // Filter claims for current user
  const userClaims = recentClaims.filter(claim => 
    claim.userAddress.toLowerCase() === currentAddress.toLowerCase()
  );

  if (userClaims.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Recent Claims
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-secondary-500 dark:text-secondary-400">
            No recent claims found. Start claiming tokens to see your transaction history here.
          </p>
        </div>
      </div>
    );
  }

  const handleDeleteClaim = (claimId: string) => {
    setClaimToDelete(claimId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (claimToDelete) {
      deleteClaim(claimToDelete);
      setClaimToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const handleClearAll = () => {
    deleteClaimsForUser(currentAddress);
    setShowClearAllConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Recent Claims ({userClaims.length})
        </h3>
        {userClaims.length > 0 && (
          <button
            onClick={() => setShowClearAllConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete all your claims"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Delete Single Claim Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-md mx-4 border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Delete Claim
              </h4>
            </div>
            <p className="text-secondary-600 dark:text-secondary-300 mb-6">
              Are you sure you want to delete this claim? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Claims Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-md mx-4 border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Clear All Claims
              </h4>
            </div>
            <p className="text-secondary-600 dark:text-secondary-300 mb-6">
              Are you sure you want to delete all your recent claims? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="px-4 py-2 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {userClaims.map((claim) => (
          <div
            key={claim.id}
            className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg border border-secondary-200 dark:border-secondary-600"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-secondary-900 dark:text-secondary-100">
                  {claim.formattedAmount}
                </span>
                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  Claimed
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
                <span>
                  {formatDistanceToNow(new Date(claim.timestamp), { addSuffix: true })}
                </span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${claim.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View on Etherscan
                </a>
              </div>
            </div>
            <button
              onClick={() => handleDeleteClaim(claim.id)}
              className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete this claim"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-600">
        <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center">
          Claims are automatically removed after 24 hours. You can manually delete individual claims or clear all at once.
        </p>
      </div>
    </div>
  );
}