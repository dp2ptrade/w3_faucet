'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  isAuthenticating: boolean;
  error: string | null;
}

export function useUserAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    isAuthenticating: false,
    error: null,
  });

  // Check for existing token on mount and address change
  useEffect(() => {
    if (address && isConnected) {
      const storedToken = localStorage.getItem(`authToken_${address.toLowerCase()}`);
      if (storedToken) {
        // Verify token is still valid by checking expiration
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp > currentTime) {
            setAuthState({
              isAuthenticated: true,
              token: storedToken,
              isAuthenticating: false,
              error: null,
            });
          } else {
            // Token expired, remove it
            localStorage.removeItem(`authToken_${address.toLowerCase()}`);
          }
        } catch (error) {
          // Invalid token, remove it
          localStorage.removeItem(`authToken_${address.toLowerCase()}`);
        }
      }
    } else {
      // Clear auth state when wallet disconnects
      setAuthState({
        isAuthenticated: false,
        token: null,
        isAuthenticating: false,
        error: null,
      });
    }
  }, [address, isConnected]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      setAuthState(prev => ({
        ...prev,
        error: 'Please connect your wallet first',
      }));
      return false;
    }

    setAuthState(prev => ({
      ...prev,
      isAuthenticating: true,
      error: null,
    }));

    try {
      // Get nonce
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }

      const { nonce } = await nonceResponse.json();
      
      // Sign message
      const message = `Please sign this message to authenticate with the faucet: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // Verify signature
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          nonce,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication failed');
      }

      const { token } = await verifyResponse.json();
      
      // Store token with address-specific key
      localStorage.setItem(`authToken_${address.toLowerCase()}`, token);
      
      setAuthState({
        isAuthenticated: true,
        token,
        isAuthenticating: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Authentication failed';
      setAuthState({
        isAuthenticated: false,
        token: null,
        isAuthenticating: false,
        error: errorMessage,
      });
      return false;
    }
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(() => {
    if (address) {
      localStorage.removeItem(`authToken_${address.toLowerCase()}`);
    }
    setAuthState({
      isAuthenticated: false,
      token: null,
      isAuthenticating: false,
      error: null,
    });
  }, [address]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...authState,
    authenticate,
    logout,
    clearError,
  };
}