import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tokens = {
      ETH: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        amount: '0.1',
        decimals: 18,
      },
      USDT: {
        address: '0xd82183033422079e6281f350566Da971c13Cb1e7',
        symbol: 'USDT',
        name: 'Tether USD',
        amount: '100',
        decimals: 6,
      },
      USDC: {
        address: '0xD4547d4d0854D57f0b10A62BfB49261Ba133c46b',
        symbol: 'USDC',
        name: 'USD Coin',
        amount: '100',
        decimals: 6,
      },
      DAI: {
        address: '0xb748db3348b98E6c2A2dE268ed25b73f78490D25',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        amount: '100',
        decimals: 18,
      },
      WETH: {
        address: '0x395Eb6F0cAf9Df14a245A30e5fd685A1a13548c7',
        symbol: 'WETH',
        name: 'Wrapped Ethereum',
        amount: '0.1',
        decimals: 18,
      },
      LINK: {
        address: '0x02632700270A2c8419BCcAcE8196b7738F80c602',
        symbol: 'LINK',
        name: 'Chainlink',
        amount: '10',
        decimals: 18,
      },
      UNI: {
        address: '0x4c55c5a8D00079d678996431b8CD01B0b3aD2b0E',
        symbol: 'UNI',
        name: 'Uniswap',
        amount: '5',
        decimals: 18,
      },
      W3E: {
        address: '0x864e9B954247a260a9e912095cF2D0bfC99BFE27',
        symbol: 'W3E',
        name: 'W3 Energy Token',
        amount: '100',
        decimals: 18,
      },
    };

    return NextResponse.json({
      success: true,
      tokens,
    });
    
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch available tokens',
      },
      { status: 500 }
    );
  }
}