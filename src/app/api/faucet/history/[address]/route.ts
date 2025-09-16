import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    
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
    
    // Mock claim history (in production, this would come from a database or blockchain events)
    const history = [
      {
        id: '1',
        address: address.toLowerCase(),
        tokenSymbol: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        amount: '0.1',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        timestamp: Date.now() - 86400000, // 1 day ago
        status: 'completed',
      },
      {
        id: '2',
        address: address.toLowerCase(),
        tokenSymbol: 'USDT',
        tokenAddress: '0xd82183033422079e6281f350566Da971c13Cb1e7',
        amount: '100',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now() - 172800000, // 2 days ago
        status: 'completed',
      },
    ];
    
    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      history,
      totalClaims: history.length,
    });
    
  } catch (error) {
    console.error('Error fetching claim history:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch claim history',
      },
      { status: 500 }
    );
  }
}