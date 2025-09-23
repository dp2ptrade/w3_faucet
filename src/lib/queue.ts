import { EventEmitter } from 'events';

export interface QueueJob {
  id: string;
  type: 'ETH_CLAIM' | 'TOKEN_CLAIM';
  data: {
    address: string;
    tokenAddress?: string;
    amount?: string;
    userAgent?: string;
    timestamp: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: number; // Lower number = higher priority
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  completedAt?: number;
  error?: string;
  transactionHash?: string;
  estimatedProcessingTime?: number;
  position?: number;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueLength: number;
}

export class TransactionQueue extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map();
  private pendingQueue: QueueJob[] = [];
  private processingJobs: Set<string> = new Set();
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private maxConcurrentJobs: number = 3; // Process up to 3 transactions simultaneously
  private processingDelay: number = 2000; // 2 seconds between job processing
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startProcessing();
    this.startCleanup();
  }

  /**
   * Add a new job to the queue
   */
  addJob(jobData: Omit<QueueJob, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt' | 'position'>): string {
    const jobId = this.generateJobId();
    const job: QueueJob = {
      id: jobId,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      position: this.pendingQueue.length + 1,
      ...jobData,
    };

    this.jobs.set(jobId, job);
    this.pendingQueue.push(job);
    this.updateQueuePositions();

    // Emit job added event
    this.emit('jobAdded', job);
    
    console.log(`📝 Job ${jobId} added to queue (${job.type})`);
    return jobId;
  }

  /**
   * Get job by ID (checks both active jobs and dead letter queue)
   */
  getJob(jobId: string): QueueJob | undefined {
    // First check active jobs
    const activeJob = this.jobs.get(jobId);
    if (activeJob) {
      return activeJob;
    }
    
    // If not found in active jobs, check dead letter queue
    return this.deadLetterQueue.get(jobId);
  }

  /**
   * Get jobs by address
   */
  getJobsByAddress(address: string): QueueJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.data.address.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Clear completed and failed jobs for a specific user address
   */
  clearUserJobs(address: string): number {
    const userJobs = this.getJobsByAddress(address);
    let clearedCount = 0;

    userJobs.forEach(job => {
      // Only clear completed and failed jobs, not pending or processing
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(job.id);
        clearedCount++;
      }
    });

    // Also clear from dead letter queue
    const deadLetterJobs = Array.from(this.deadLetterQueue.entries());
    deadLetterJobs.forEach(([jobId, job]) => {
      if (job.data.address.toLowerCase() === address.toLowerCase()) {
        this.deadLetterQueue.delete(jobId);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} completed/failed jobs for address ${address}`);
    }

    return clearedCount;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const allJobs = Array.from(this.jobs.values());
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          return sum + ((job.completedAt || 0) - job.createdAt);
        }, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: allJobs.length,
      pendingJobs: allJobs.filter(job => job.status === 'pending').length,
      processingJobs: allJobs.filter(job => job.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      averageProcessingTime,
      queueLength: this.pendingQueue.length,
    };
  }

  /**
   * Get recent jobs for monitoring
   */
  getRecentJobs(limit: number = 50): QueueJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get pending jobs in queue order
   */
  getPendingJobs(): QueueJob[] {
    return [...this.pendingQueue];
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.updatedAt = Date.now();

    // Remove from pending queue
    const index = this.pendingQueue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.pendingQueue.splice(index, 1);
      this.updateQueuePositions();
    }

    this.emit('jobCancelled', job);
    return true;
  }

  /**
   * Start the queue processing
   */
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNextJobs();
    }, this.processingDelay);

    console.log('🚀 Transaction queue processing started');
  }

  /**
   * Stop the queue processing
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('⏹️ Transaction queue processing stopped');
  }

  /**
   * Process next jobs in the queue
   */
  private async processNextJobs(): Promise<void> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return; // Already processing maximum concurrent jobs
    }

    // Sort pending jobs by priority (lower number = higher priority) and creation time
    this.pendingQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt - b.createdAt;
    });

    const jobsToProcess = this.pendingQueue.splice(0, this.maxConcurrentJobs - this.processingJobs.size);
    
    for (const job of jobsToProcess) {
      this.processJob(job);
    }

    this.updateQueuePositions();
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob): Promise<void> {
    if (this.processingJobs.has(job.id)) {
      return; // Already processing
    }

    this.processingJobs.add(job.id);
    job.status = 'processing';
    job.processedAt = Date.now();
    job.updatedAt = Date.now();
    job.attempts++;

    this.emit('jobStarted', job);
    console.log(`⚡ Processing job ${job.id} (${job.type}) - Attempt ${job.attempts}`);

    try {
      // Validate job data before processing
      this.validateJobData(job);

      // Add processing timeout - reduced since we only wait for transaction submission
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction submission timeout - network may be congested')), 60000); // 60 second timeout
      });

      // Import blockchain service dynamically to avoid circular dependencies
      const { blockchainService } = await import('./blockchain');
      
      let transactionHash: string;
      
      // Execute transaction with timeout
      if (job.type === 'ETH_CLAIM') {
        transactionHash = await Promise.race([
          blockchainService.claimEth(job.data.address),
          timeoutPromise
        ]) as string;
      } else if (job.type === 'TOKEN_CLAIM' && job.data.tokenAddress) {
        transactionHash = await Promise.race([
          blockchainService.claimToken(job.data.address, job.data.tokenAddress),
          timeoutPromise
        ]) as string;
      } else {
        throw new Error('Invalid job type or missing token address');
      }

      // Job completed successfully
      job.status = 'completed';
      job.transactionHash = transactionHash;
      job.completedAt = Date.now();
      job.updatedAt = Date.now();

      this.emit('jobCompleted', job);
      console.log(`✅ Job ${job.id} completed successfully - TX: ${transactionHash}`);

    } catch (error: any) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      
      const errorMessage = this.categorizeError(error);
      job.error = errorMessage;
      
      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      
      if (!isRetryable || job.attempts >= job.maxAttempts) {
        // Job failed permanently
        job.status = 'failed';
        job.updatedAt = Date.now();
        this.moveToDeadLetterQueue(job);
        
        this.emit('jobFailed', job);
        console.log(`💀 Job ${job.id} failed permanently: ${errorMessage}`);
      } else {
        // Retry the job
        job.status = 'retrying';
        job.updatedAt = Date.now();
        
        // Add exponential backoff delay with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = baseDelay + jitter;
        
        // Add back to pending queue with delay
        setTimeout(() => {
          if (job.status === 'retrying') {
            job.status = 'pending';
            this.pendingQueue.push(job);
            this.updateQueuePositions();
          }
        }, delay);

        this.emit('jobRetrying', job);
        console.log(`🔄 Job ${job.id} will retry in ${Math.round(delay)}ms (attempt ${job.attempts}/${job.maxAttempts})`);
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  private validateJobData(job: QueueJob): void {
    if (!job.data.address || !/^0x[a-fA-F0-9]{40}$/.test(job.data.address)) {
      throw new Error('Invalid recipient address');
    }

    if (job.type === 'TOKEN_CLAIM') {
      if (!job.data.tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(job.data.tokenAddress)) {
        throw new Error('Invalid token address');
      }
    }
  }

  private categorizeError(error: any): string {
    const message = error.message || error.toString();
    
    // Transaction timeout errors - more specific handling
    if (message.includes('Transaction submission timeout - network may be congested')) {
      return `Network congestion: Transaction submission took too long. Please try again.`;
    }
    
    // Legacy timeout message (keeping for backward compatibility)
    if (message.includes('Transaction timeout - blockchain confirmation took too long')) {
      return `Transaction timeout: Blockchain confirmation took longer than expected. Your transaction may still succeed.`;
    }
    
    // Network errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return `Network error: ${message}`;
    }
    
    // Blockchain errors
    if (message.includes('insufficient funds') || message.includes('balance')) {
      return `Insufficient funds: ${message}`;
    }
    
    if (message.includes('gas') || message.includes('Gas')) {
      return `Gas error: ${message}`;
    }
    
    if (message.includes('nonce') || message.includes('Nonce')) {
      return `Nonce error: ${message}`;
    }
    
    if (message.includes('revert') || message.includes('Revert')) {
      return `Transaction reverted: ${message}`;
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return `Rate limited: ${message}`;
    }
    
    // Cooldown errors
    if (message.includes('cooldown') || message.includes('Cooldown')) {
      return `Cooldown period not met: ${message}`;
    }
    
    return `Unknown error: ${message}`;
  }

  private isRetryableError(error: any): boolean {
    const message = error.message || error.toString();
    
    // Non-retryable errors
    const nonRetryablePatterns = [
      'insufficient funds',
      'cooldown',
      'blacklisted',
      'invalid address',
      'invalid token',
      'unauthorized',
      'forbidden',
      'not supported'
    ];
    
    for (const pattern of nonRetryablePatterns) {
      if (message.toLowerCase().includes(pattern)) {
        return false;
      }
    }
    
    // Retryable errors
    const retryablePatterns = [
      'network',
      'connection',
      'timeout',
      'rate limit',
      'gas',
      'nonce',
      'temporary'
    ];
    
    for (const pattern of retryablePatterns) {
      if (message.toLowerCase().includes(pattern)) {
        return true;
      }
    }
    
    // Default to retryable for unknown errors
    return true;
  }

  private deadLetterQueue: Map<string, QueueJob> = new Map();

  private moveToDeadLetterQueue(job: QueueJob): void {
    this.deadLetterQueue.set(job.id, {
      ...job,
      status: 'failed',
      updatedAt: Date.now()
    });
    
    // Keep only last 100 failed jobs
    if (this.deadLetterQueue.size > 100) {
      const oldestKey = this.deadLetterQueue.keys().next().value;
      if (oldestKey) {
        this.deadLetterQueue.delete(oldestKey);
      }
    }
    
    console.log(`Job ${job.id} moved to dead letter queue`);
  }

  getDeadLetterQueue(): QueueJob[] {
    return Array.from(this.deadLetterQueue.values());
  }

  retryFailedJob(jobId: string): boolean {
    const failedJob = this.deadLetterQueue.get(jobId);
    if (!failedJob) {
      return false;
    }

    // Reset job for retry
    const retryJob: QueueJob = {
      ...failedJob,
      id: this.generateJobId(),
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: undefined,
      processedAt: undefined,
      completedAt: undefined,
      transactionHash: undefined
    };

    this.jobs.set(retryJob.id, retryJob);
    this.pendingQueue.push(retryJob);
    this.updateQueuePositions();
    this.deadLetterQueue.delete(jobId);
    
    console.log(`Retrying failed job ${jobId} as new job ${retryJob.id}`);
    return true;
  }

  /**
   * Update queue positions for all pending jobs
   */
  private updateQueuePositions(): void {
    this.pendingQueue.forEach((job, index) => {
      job.position = index + 1;
      job.estimatedProcessingTime = (index + 1) * (this.processingDelay / 1000); // Rough estimate in seconds
    });
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup process for old completed/failed jobs
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up old completed and failed jobs (keep for 24 hours)
   */
  private cleanupOldJobs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    Array.from(this.jobs.entries()).forEach(([jobId, job]) => {
      if ((job.status === 'completed' || job.status === 'failed') && job.updatedAt < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old jobs`);
    }
  }

  /**
   * Destroy the queue and clean up resources
   */
  destroy(): void {
    this.stopProcessing();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.jobs.clear();
    this.pendingQueue = [];
    this.processingJobs.clear();
    this.removeAllListeners();
  }
}

// Global singleton instance to survive Next.js hot reloads
declare global {
  var __transactionQueue: TransactionQueue | undefined;
}

export function getTransactionQueue(): TransactionQueue {
  if (!global.__transactionQueue) {
    global.__transactionQueue = new TransactionQueue();
    console.log('🚀 Transaction queue initialized');
    
    // Graceful shutdown handlers (only set once)
    const shutdownHandler = () => {
      if (global.__transactionQueue) {
        console.log('🛑 Shutting down transaction queue...');
        global.__transactionQueue.destroy();
        global.__transactionQueue = undefined;
      }
    };

    process.once('SIGTERM', shutdownHandler);
    process.once('SIGINT', shutdownHandler);
  }
  return global.__transactionQueue;
}

// Export a lazy getter for the singleton instance to prevent immediate initialization
export const transactionQueue = {
  get instance() {
    return getTransactionQueue();
  }
};

// Note: Use getTransactionQueue() or transactionQueue.instance to ensure proper singleton behavior