import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Cache for blockchain events to reduce API calls
const eventCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 1000; // 10 seconds cache for faster updates
const providerCache = new Map<string, { provider: ethers.JsonRpcProvider; timestamp: number }>();

// Rate limiting and retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Check if it's a rate limit error
      if (error.code === 'BAD_DATA' || error.message?.includes('Too Many Requests')) {
        const delayTime = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.log(`Rate limited, retrying in ${delayTime}ms...`);
        await delay(delayTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

function getCachedProvider(): ethers.JsonRpcProvider {
  const cacheKey = 'sepolia_provider';
  const cached = providerCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
    return cached.provider;
  }
  
  const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/demo',
    {
      name: 'sepolia',
      chainId: 11155111
    }
  );
  
  // Reduce polling to minimize requests
  provider.pollingInterval = 30000; // 30 seconds instead of default 4 seconds
  
  providerCache.set(cacheKey, { provider, timestamp: Date.now() });
  return provider;
}

// Token addresses and symbols mapping
const TOKEN_INFO = {
  '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
  '0xd82183033422079e6281f350566Da971c13Cb1e7': { symbol: 'USDT', decimals: 6 },
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': { symbol: 'UNI', decimals: 18 },
  '0xA0b86a33E6441b8e8C7C7b0b8b8b8b8b8b8b8b8b': { symbol: 'USDC', decimals: 6 },
  '0xB0b86a33E6441b8e8C7C7b0b8b8b8b8b8b8b8b8b': { symbol: 'DAI', decimals: 18 },
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'WETH', decimals: 18 },
  '0x514910771AF9Ca656af840dff83E8264EcF986CA': { symbol: 'LINK', decimals: 18 },
};

async function getBlockchainEvents(userAddress?: string, forceRefresh: boolean = false) {
  // Create cache key
  const cacheKey = `events_${userAddress || 'global'}`;
  const cached = eventCache.get(cacheKey);
  
  // Return cached data if still valid and not forcing refresh
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached blockchain events');
    return cached.data;
  }
  
  try {
    const provider = getCachedProvider();
    const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_CONTRACT_ADDRESS;
    
    if (!faucetAddress) {
      throw new Error('Faucet contract address not configured');
    }

    // Define event signatures
    const ethClaimedTopic = ethers.id('EthClaimed(address,uint256,uint256)');
    const tokenClaimedTopic = ethers.id('TokenClaimed(address,address,uint256,uint256)');
    
    // Get recent blocks with retry logic (reduced range for rate limiting)
    const currentBlock = await retryWithBackoff(() => provider.getBlockNumber());
    const fromBlock = Math.max(0, currentBlock - 5000); // Reduced from 10000 to 5000
    
    // Fetch ETH claim events
    const ethClaimFilter = {
      address: faucetAddress,
      topics: [ethClaimedTopic, userAddress ? ethers.zeroPadValue(userAddress, 32) : null],
      fromBlock,
      toBlock: 'latest'
    };
    
    // Fetch Token claim events
    const tokenClaimFilter = {
      address: faucetAddress,
      topics: [tokenClaimedTopic, userAddress ? ethers.zeroPadValue(userAddress, 32) : null],
      fromBlock,
      toBlock: 'latest'
    };
    
    // Use retry logic for getLogs calls with sequential execution to avoid rate limits
    const ethLogs = await retryWithBackoff(() => provider.getLogs(ethClaimFilter));
    
    // Add small delay between requests
    await delay(100);
    
    const tokenLogs = await retryWithBackoff(() => provider.getLogs(tokenClaimFilter));
    
    const result = { ethLogs, tokenLogs };
    
    // Cache the result
    eventCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('Error fetching blockchain events:', error);
    
    // Return cached data if available, even if expired
    if (cached) {
      console.log('Returning expired cached data due to error');
      return cached.data;
    }
    
    return { ethLogs: [], tokenLogs: [] };
  }
}

function parseClaimEvents(ethLogs: any[], tokenLogs: any[], includeRecentClaims: boolean = false) {
  const tokenStats: any = {};
  let totalClaims = 0;
  const recentClaims: any[] = [];
  
  // Process ETH claims
  // EthClaimed(address indexed user, uint256 amount, uint256 timestamp)
  // topics[0] = event signature, topics[1] = user address
  // data contains: amount, timestamp
  ethLogs.forEach(log => {
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256'],
        log.data
      );
      const amount = ethers.formatEther(decoded[0]);
      const timestamp = Number(decoded[1]) * 1000;
      
      if (!tokenStats.ETH) {
        tokenStats.ETH = {
          symbol: 'ETH',
          totalClaimed: '0',
          cooldownHours: 24,
          lastClaim: '',
        };
      }
      
      tokenStats.ETH.totalClaimed = (parseFloat(tokenStats.ETH.totalClaimed) + parseFloat(amount)).toString();
      tokenStats.ETH.lastClaim = new Date(timestamp).toISOString();
      totalClaims++;

      // Add to recent claims if requested
      if (includeRecentClaims) {
        recentClaims.push({
          id: log.transactionHash + '_' + log.logIndex,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          token: 'ETH',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          amount: amount,
          formattedAmount: parseFloat(amount).toFixed(4),
          timestamp: timestamp,
          date: new Date(timestamp).toISOString(),
        });
      }
    } catch (error) {
      console.error('Error parsing ETH claim event:', error);
    }
  });
  
  // Process Token claims
  // TokenClaimed(address indexed user, address indexed token, uint256 amount, uint256 timestamp)
  // topics[0] = event signature, topics[1] = user address, topics[2] = token address
  // data contains: amount, timestamp
  tokenLogs.forEach(log => {
    try {
      // Extract token address from topics[2] (indexed parameter)
      const tokenAddress = log.topics[2].toLowerCase();
      // Remove the leading zeros padding to get the actual address
      const cleanTokenAddress = '0x' + tokenAddress.slice(26);
      
      // Decode non-indexed parameters from data
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256'],
        log.data
      );
      const amount = decoded[0];
      const timestamp = Number(decoded[1]) * 1000;
      
      const tokenInfo = TOKEN_INFO[cleanTokenAddress as keyof typeof TOKEN_INFO];
      if (!tokenInfo) return;
      
      const formattedAmount = ethers.formatUnits(amount, tokenInfo.decimals);
      
      if (!tokenStats[tokenInfo.symbol]) {
        tokenStats[tokenInfo.symbol] = {
          symbol: tokenInfo.symbol,
          totalClaimed: '0',
          cooldownHours: 24,
          lastClaim: '',
        };
      }
      
      tokenStats[tokenInfo.symbol].totalClaimed = (
        parseFloat(tokenStats[tokenInfo.symbol].totalClaimed) + parseFloat(formattedAmount)
      ).toString();
      tokenStats[tokenInfo.symbol].lastClaim = new Date(timestamp).toISOString();
      totalClaims++;

      // Add to recent claims if requested
      if (includeRecentClaims) {
        recentClaims.push({
          id: log.transactionHash + '_' + log.logIndex,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          token: tokenInfo.symbol,
          tokenAddress: cleanTokenAddress,
          amount: amount.toString(),
          formattedAmount: parseFloat(formattedAmount).toFixed(tokenInfo.decimals === 18 ? 4 : 2),
          timestamp: timestamp,
          date: new Date(timestamp).toISOString(),
        });
      }
    } catch (error) {
      console.error('Error parsing token claim event:', error);
    }
  });

  // Sort recent claims by timestamp (newest first) and limit to 5
  if (includeRecentClaims) {
    recentClaims.sort((a, b) => b.timestamp - a.timestamp);
    return { tokenStats, totalClaims, recentClaims: recentClaims.slice(0, 5) };
  }
  
  return { tokenStats, totalClaims };
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');
    const refresh = searchParams.get('refresh') === 'true';
    
    // Fetch actual blockchain events
    const { ethLogs, tokenLogs } = await getBlockchainEvents(userAddress || undefined, refresh);
    
    // Include recent claims only when user address is provided
    const includeRecentClaims = !!userAddress;
    const parseResult = parseClaimEvents(ethLogs, tokenLogs, includeRecentClaims);
    const { tokenStats, totalClaims } = parseResult;
    const recentClaims = 'recentClaims' in parseResult ? parseResult.recentClaims : undefined;
    
    // If no actual data found, provide minimal structure
    if (Object.keys(tokenStats).length === 0) {
      const defaultTokenStats = {
        ETH: {
          symbol: 'ETH',
          totalClaimed: '0',
          cooldownHours: 24,
          lastClaim: '',
        }
      };
      
      const response: any = {
        totalClaims: 0,
        cooldownHours: 24,
        tokenStats: defaultTokenStats,
        dailyLimit: 5,
        cooldownPeriod: 1 * 60 * 1000,
        lastUpdated: Date.now(),
        userAddress: userAddress || undefined,
        isUserSpecific: !!userAddress,
      };

      // Add empty recent claims for user-specific requests
      if (includeRecentClaims) {
        response.recentClaims = [];
      }
      
      return NextResponse.json(response);
    }
    
    // Base statistics structure that matches FaucetStats interface
    const baseStats: any = {
      totalClaims,
      cooldownHours: 24, // 24 hours cooldown
      tokenStats,
      dailyLimit: 5, // Maximum 5 claims per day
      cooldownPeriod: 1 * 60 * 1000, // 1 minute in milliseconds
      lastUpdated: Date.now(),
      userAddress: userAddress || undefined,
      isUserSpecific: !!userAddress,
    };

    // Add recent claims for user-specific requests
    if (includeRecentClaims && recentClaims) {
      baseStats.recentClaims = recentClaims;
    }

    return NextResponse.json(baseStats);
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch faucet statistics',
      },
      { status: 500 }
    );
  }
}