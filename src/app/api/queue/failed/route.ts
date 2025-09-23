import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { transactionQueue, QueueJob } from '@/lib/queue';
import { verifyToken } from '@/lib/auth';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get failed jobs from dead letter queue
    const failedJobs = transactionQueue.instance.getDeadLetterQueue();

    return NextResponse.json({
      success: true,
      failedJobs: failedJobs.map((job: QueueJob) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        error: job.error,
        data: job.data
      })),
      total: failedJobs.length
    });
  } catch (error: any) {
    console.error('Error fetching failed jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failed jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, jobId } = await request.json();

    if (action === 'retry' && jobId) {
      const success = transactionQueue.instance.retryFailedJob(jobId);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Job queued for retry'
        });
      } else {
        return NextResponse.json(
          { error: 'Failed job not found' },
          { status: 404 }
        );
      }
    } else if (action === 'clear') {
      // Clear all failed jobs (admin only)
      const failedJobs = transactionQueue.instance.getDeadLetterQueue();
      const clearedCount = failedJobs.length;
      
      // Clear the dead letter queue
      failedJobs.forEach((job: QueueJob) => {
        transactionQueue.instance.getDeadLetterQueue().splice(0);
      });
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${clearedCount} failed jobs`
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing jobId' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error managing failed jobs:', error);
    return NextResponse.json(
      { error: 'Failed to manage failed jobs' },
      { status: 500 }
    );
  }
}