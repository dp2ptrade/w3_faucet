import { NextRequest, NextResponse } from 'next/server';
import { transactionQueue } from '@/lib/queue';
import { verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
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
    
    if (!jobId) {
      return NextResponse.json(
        {
          error: 'Missing Job ID',
          message: 'Job ID is required',
        },
        { status: 400 }
      );
    }

    const job = transactionQueue.instance.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          error: 'Job Not Found',
          message: 'The specified job was not found',
        },
        { status: 404 }
      );
    }

    // Check if user owns this job (unless admin)
    if (!payload.isAdmin && job.data.address.toLowerCase() !== payload.address.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You can only cancel your own jobs',
        },
        { status: 403 }
      );
    }

    // Check if job can be cancelled
    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Cannot Cancel',
          message: `Job cannot be cancelled. Current status: ${job.status}`,
        },
        { status: 400 }
      );
    }

    // Cancel the job
    const cancelled = transactionQueue.instance.cancelJob(jobId);
    
    if (!cancelled) {
      return NextResponse.json(
        {
          error: 'Cancellation Failed',
          message: 'Failed to cancel the job',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      jobId,
    });
    
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to cancel job',
      },
      { status: 500 }
    );
  }
}