'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RecentClaim {
  id: string;
  txHash: string;
  blockNumber: number;
  token: string;
  tokenAddress: string;
  amount: string;
  formattedAmount: string;
  timestamp: number;
  date: string;
  userAddress: string;
}

interface RecentClaimsContextType {
  recentClaims: RecentClaim[];
  addClaim: (claim: Omit<RecentClaim, 'id' | 'timestamp' | 'date'>) => void;
  clearClaims: () => void;
  deleteClaim: (claimId: string) => void;
  deleteClaimsForUser: (userAddress: string) => void;
  getClaimsForUser: (userAddress: string) => RecentClaim[];
}

const RecentClaimsContext = createContext<RecentClaimsContextType | undefined>(undefined);

const STORAGE_KEY = 'faucet_recent_claims';
const MAX_CLAIMS = 50; // Keep only the most recent 50 claims

export function RecentClaimsProvider({ children }: { children: ReactNode }) {
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadClaims = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentClaims(parsed);
        }
      } catch (error) {
        console.error('Error loading claims from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadClaims();
  }, []);

  // Save claims to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (isLoaded && recentClaims.length >= 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentClaims));
      } catch (error) {
        console.error('Error saving claims to localStorage:', error);
      }
    }
  }, [recentClaims, isLoaded]);

  const addClaim = (claimData: Omit<RecentClaim, 'id' | 'timestamp' | 'date'>) => {
    const timestamp = Date.now();
    const claim: RecentClaim = {
      ...claimData,
      id: `${claimData.txHash}-${timestamp}`,
      timestamp,
      date: new Date(timestamp).toISOString(),
    };

    setRecentClaims(prev => {
      // Add new claim and keep only the most recent ones
      const updated = [claim, ...prev].slice(0, MAX_CLAIMS);
      return updated;
    });
  };

  const clearClaims = () => {
    setRecentClaims([]);
  };

  const deleteClaim = (claimId: string) => {
    setRecentClaims(prev => prev.filter(claim => claim.id !== claimId));
  };

  const deleteClaimsForUser = (userAddress: string) => {
    setRecentClaims(prev => 
      prev.filter(claim => 
        claim.userAddress.toLowerCase() !== userAddress.toLowerCase()
      )
    );
  };

  const getClaimsForUser = (userAddress: string) => {
    return recentClaims.filter(claim => 
      claim.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
  };

  return (
    <RecentClaimsContext.Provider value={{
      recentClaims,
      addClaim,
      clearClaims,
      deleteClaim,
      deleteClaimsForUser,
      getClaimsForUser,
    }}>
      {children}
    </RecentClaimsContext.Provider>
  );
}

export function useRecentClaims() {
  const context = useContext(RecentClaimsContext);
  if (context === undefined) {
    throw new Error('useRecentClaims must be used within a RecentClaimsProvider');
  }
  return context;
}