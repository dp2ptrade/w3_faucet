import { NextRequest, NextResponse } from 'next/server';
import { transactionQueue, QueueJob } from '@/lib/queue';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from request.nextUrl.searchParams
    const { searchParams } = request.nextUrl;
    const userAddress = searchParams.get('address');
    const includeJobs = searchParams.get('includeJobs') === 'true';
    const isAdmin = searchParams.get('admin') === 'true';
    
    // For admin requests, verify authentication
    if (isAdmin) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication token required for admin access',
          },
          { status: 401 }
        );
      }
      
      const token = authHeader.substring(7);
      try {
        const payload = verifyToken(token);
        if (!payload.isAdmin) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'Admin access required',
            },
            { status: 403 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Invalid or expired token',
          },
          { status: 401 }
        );
      }
    }

    // Get queue statistics
    const stats = transactionQueue.instance.getStats();
    
    const response: any = {
      success: true,
      stats,
      timestamp: Date.now(),
    };

    // Include user-specific jobs if address provided
    if (userAddress) {
      const userJobs = transactionQueue.instance.getJobsByAddress(userAddress);
      response.userJobs = userJobs.map((job: QueueJob) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        position: job.position,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        transactionHash: job.transactionHash,
        error: job.error,
        estimatedProcessingTime: job.estimatedProcessingTime,
      }));
    }

    // Include recent jobs for admin
    if (isAdmin && includeJobs) {
      const recentJobs = transactionQueue.instance.getRecentJobs(100);
      response.recentJobs = recentJobs.map((job: QueueJob) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        position: job.position,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        processedAt: job.processedAt,
        completedAt: job.completedAt,
        transactionHash: job.transactionHash,
        error: job.error,
        data: {
          address: job.data.address,
          tokenAddress: job.data.tokenAddress,
          amount: job.data.amount,
        }
      }));
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch queue statistics',
      },
      { status: 500 }
    );
  }
}