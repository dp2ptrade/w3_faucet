import { NextRequest, NextResponse } from 'next/server';
import { transactionQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    // Validate address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Valid Ethereum address is required',
        },
        { status: 400 }
      );
    }

    // Clear user jobs (only completed and failed)
    const clearedCount = transactionQueue.instance.clearUserJobs(address);

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} completed/failed jobs`,
      clearedCount,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Error clearing user jobs:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to clear user jobs',
      },
      { status: 500 }
    );
  }
}