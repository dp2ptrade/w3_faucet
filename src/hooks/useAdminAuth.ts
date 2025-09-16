'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: false,
    error: null,
  });

  const checkAdminStatus = useCallback(async () => {
    if (!isConnected || !address) {
      setState({ isAdmin: false, isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setState({ isAdmin: false, isLoading: false, error: 'No authentication token found' });
        return;
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify admin status');
      }

      const data = await response.json();
      setState({
        isAdmin: data.isAdmin || false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      setState({
        isAdmin: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [address, isConnected]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setState({ isAdmin: false, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    checkAdminStatus,
    logout,
  };
}