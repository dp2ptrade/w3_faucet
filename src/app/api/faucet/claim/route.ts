import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ethers } from 'ethers';
import { verifyToken } from '@/lib/auth';
import { blockchainService } from '@/lib/blockchain';
import { getTransactionQueue } from '@/lib/queue';

// Rate limiting storage (in production, use Redis)
const dailyClaims = new Map<string, { count: number; lastClaim: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, tokenAddress, useQueue = true } = body; // Queue enabled by default
    
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
    
    // Check if the authenticated user matches the claim address
    if (payload.address !== address.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You can only claim tokens for your own address',
        },
        { status: 403 }
      );
    }
    
    // Check daily claim limit (5 claims per day to match smart contract)
    const today = new Date().toDateString();
    const claimKey = `${address.toLowerCase()}-${today}`;
    const claimData = dailyClaims.get(claimKey);
    
    if (claimData && claimData.count >= 5) { // 5 claims per day (matches smart contract maxDailyClaims)
      return NextResponse.json(
        {
          error: 'Rate Limited',
          message: 'Daily claim limit reached (5 claims per day). Try again tomorrow.',
        },
        { status: 429 }
      );
    }
    
    // Check if queue processing is enabled
    if (useQueue) {
      try {
        // Validate token address for token claims
        if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
          if (!ethers.isAddress(tokenAddress)) {
            return NextResponse.json(
              {
                error: 'Invalid Token Address',
                message: 'Please provide a valid token address',
              },
              { status: 400 }
            );
          }
        }

        // Determine job type and priority
        const jobType = (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') 
          ? 'ETH_CLAIM' 
          : 'TOKEN_CLAIM';
        
        // Higher priority for ETH claims (lower number = higher priority)
        const priority = jobType === 'ETH_CLAIM' ? 1 : 2;

        // Get queue instance
        const queue = getTransactionQueue();
        
        // Add job to queue
        const jobId = queue.addJob({
          type: jobType,
          data: {
            address,
            tokenAddress: tokenAddress || undefined,
            timestamp: Date.now(),
            userAgent: headersList.get('user-agent') || undefined,
          },
          priority,
          maxAttempts: 3,
        });

        // Update daily claim count
        dailyClaims.set(claimKey, {
          count: (claimData?.count || 0) + 1,
          lastClaim: Date.now(),
        });

        console.log(`Claim queued for ${address}: Job ID ${jobId}`);

        // Get job details for response
        const job = queue.getJob(jobId);
        
        return NextResponse.json({
          success: true,
          jobId,
          message: 'Claim request queued successfully',
          position: job?.position || 0,
          estimatedTime: job?.estimatedProcessingTime || 0,
          status: 'queued',
        });

      } catch (error: any) {
        console.error('Queue processing failed, falling back to direct processing:', error);
        // Fall through to direct processing
      }
    }

    // Direct processing (fallback or when queue is disabled)
    let transactionHash: string;
    
    try {
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Claim ETH
        transactionHash = await blockchainService.claimEth(address);
      } else {
        // Claim token
        if (!ethers.isAddress(tokenAddress)) {
          return NextResponse.json(
            {
              error: 'Invalid Token Address',
              message: 'Please provide a valid token address',
            },
            { status: 400 }
          );
        }
        
        transactionHash = await blockchainService.claimToken(address, tokenAddress);
      }
      
      // Update daily claim count
      dailyClaims.set(claimKey, {
        count: (claimData?.count || 0) + 1,
        lastClaim: Date.now(),
      });
      
      console.log(`Direct claim successful for ${address}: ${transactionHash}`);
      
      return NextResponse.json({
        success: true,
        transactionHash,
        message: 'Tokens claimed successfully',
        status: 'completed',
      });
      
    } catch (error: any) {
      console.error('Claim failed:', error);
      
      return NextResponse.json(
        {
          error: 'Claim Failed',
          message: error.message || 'Failed to claim tokens',
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error processing claim:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process claim request',
      },
      { status: 500 }
    );
  }
}