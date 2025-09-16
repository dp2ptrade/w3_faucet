import jwt, { SignOptions } from 'jsonwebtoken';
import { ethers } from 'ethers';
import { config } from './config';

export interface JWTPayload {
  address: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export function generateToken(address: string): string {
  const payload: JWTPayload = {
    address: address.toLowerCase(),
    isAdmin: isAdmin(address),
  };

  return jwt.sign(payload, config.jwt.secret as string, {
    expiresIn: '24h',
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret as string) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function isAdmin(address: string): boolean {
  return address.toLowerCase() === config.faucet.adminAddress.toLowerCase();
}

export function verifySignature(address: string, signature: string, nonce: string): boolean {
  try {
    const message = `Please sign this message to authenticate with the faucet: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// In-memory nonce storage (in production, use Redis or database)
const nonces = new Map<string, { nonce: string; timestamp: number }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(nonces.entries()).forEach(([address, data]) => {
    if (now - data.timestamp > 300000) { // 5 minutes
      nonces.delete(address);
    }
  });
}, 300000);

export function storeNonce(address: string, nonce: string): void {
  nonces.set(address.toLowerCase(), { nonce, timestamp: Date.now() });
}

export function getNonce(address: string): string | null {
  const data = nonces.get(address.toLowerCase());
  return data ? data.nonce : null;
}

export function removeNonce(address: string): void {
  nonces.delete(address.toLowerCase());
}