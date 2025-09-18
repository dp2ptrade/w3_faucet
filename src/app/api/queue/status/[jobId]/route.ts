import { NextRequest, NextResponse } from 'next/server';
import { getTransactionQueue } from '@/lib/queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        {
          error: 'Missing Job ID',
          message: 'Job ID is required',
        },
        { status: 400 }
      );
    }

    // Get queue instance and job
    const queue = getTransactionQueue();
    const job = queue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          error: 'Job Not Found',
          message: 'The specified job was not found',
        },
        { status: 404 }
      );
    }

    // Calculate queue position (fallback if job.position is not available)
    const queuePosition = job.position || queue.getPendingJobs().findIndex((j: any) => j.id === jobId) + 1;

    // Calculate estimated completion time
    let estimatedCompletionTime: number | undefined;
    if (job.status === 'pending' && queuePosition) {
      const avgProcessingTime = 30; // 30 seconds average per job
      estimatedCompletionTime = Date.now() + (queuePosition * avgProcessingTime * 1000);
    }

    return NextResponse.json({
      success: true,
      id: job.id,
      type: job.type,
      status: job.status,
      position: queuePosition,
      estimatedTime: estimatedCompletionTime ? Math.ceil((estimatedCompletionTime - Date.now()) / 1000) : null,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      processedAt: job.processedAt,
      completedAt: job.completedAt,
      transactionHash: job.transactionHash,
      error: job.error,
      estimatedProcessingTime: job.estimatedProcessingTime,
      estimatedCompletionTime,
      data: {
        address: job.data.address,
        tokenAddress: job.data.tokenAddress,
        amount: job.data.amount,
      }
    });
    
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch job status',
      },
      { status: 500 }
    );
  }
}