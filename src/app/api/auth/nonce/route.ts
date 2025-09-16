import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { storeNonce } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;
    
    // Validate Ethereum address
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        {
          error: 'Invalid Address',
          message: 'Please provide a valid Ethereum address',
        },
        { status: 400 }
      );
    }
    
    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store nonce with timestamp
    storeNonce(address, nonce);
    
    console.log(`Generated nonce for address: ${address}`);
    
    return NextResponse.json({
      nonce,
      message: `Please sign this message to authenticate with the faucet: ${nonce}`,
    });
    
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate nonce',
      },
      { status: 500 }
    );
  }
}