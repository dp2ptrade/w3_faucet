import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication token required',
        },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    if (!payload.isAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }
    
    // Mock admin statistics (in production, these would come from a database)
    const adminStats = {
      totalUsers: 890,
      totalClaims: 1250,
      totalVolume: {
        ETH: '125.5',
        USDT: '125000',
        USDC: '89000',
        DAI: '67500',
        WETH: '45.2',
        LINK: '8900',
        UNI: '4450',
      },
      dailyMetrics: {
        newUsers: 12,
        claims: 45,
        volume: '15.8 ETH',
        uniqueAddresses: 38,
      },
      systemHealth: {
        status: 'healthy',
        uptime: '99.9%',
        lastDowntime: null,
        contractBalance: '1000 ETH',
      },
      recentActivity: [
        {
          type: 'claim',
          address: '0x1234...5678',
          token: 'ETH',
          amount: '0.1',
          timestamp: Date.now() - 300000, // 5 minutes ago
        },
        {
          type: 'claim',
          address: '0xabcd...efgh',
          token: 'USDT',
          amount: '100',
          timestamp: Date.now() - 600000, // 10 minutes ago
        },
      ],
    };

    return NextResponse.json({
      success: true,
      stats: adminStats,
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch admin statistics',
      },
      { status: 500 }
    );
  }
}