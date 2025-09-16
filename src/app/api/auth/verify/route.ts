import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { generateToken, verifySignature, getNonce, removeNonce } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature, nonce } = body;
    
    // Validate inputs
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        {
          error: 'Invalid Address',
          message: 'Please provide a valid Ethereum address',
        },
        { status: 400 }
      );
    }
    
    if (!signature || !nonce) {
      return NextResponse.json(
        {
          error: 'Missing Data',
          message: 'Signature and nonce are required',
        },
        { status: 400 }
      );
    }
    
    // Check if nonce exists and is valid
    const storedNonce = getNonce(address);
    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json(
        {
          error: 'Invalid Nonce',
          message: 'Nonce not found or expired',
        },
        { status: 400 }
      );
    }
    
    // Verify signature
    if (!verifySignature(address, signature, nonce)) {
      return NextResponse.json(
        {
          error: 'Invalid Signature',
          message: 'Signature verification failed',
        },
        { status: 400 }
      );
    }
    
    // Remove used nonce
    removeNonce(address);
    
    // Generate JWT token
    const token = generateToken(address);
    
    console.log(`Authentication successful for address: ${address}`);
    
    return NextResponse.json({
      token,
      address: address.toLowerCase(),
      message: 'Authentication successful',
    });
    
  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to verify signature',
      },
      { status: 500 }
    );
  }
}