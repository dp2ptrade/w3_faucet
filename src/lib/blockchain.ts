import { ethers } from 'ethers';
import { config } from './config';

// Cache for blockchain calls to reduce API requests
const callCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

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

// Faucet contract ABI (simplified for the main functions)
const FAUCET_ABI = [
  'function claimEth() external',
  'function claimEthFor(address recipient) external',
  'function claimToken(address token) external',
  'function claimTokenFor(address token, address recipient) external',
  'function ethAmount() external view returns (uint256)',
  'function supportedTokens(address) external view returns (uint256 amount, uint256 cooldown, bool active)',
  'function lastEthClaimTime(address) external view returns (uint256)',
  'function lastClaimTime(address, address) external view returns (uint256)',
  'function blacklisted(address) external view returns (bool)',
  'event EthClaimed(address indexed user, uint256 amount, uint256 timestamp)',
  'event TokenClaimed(address indexed user, address indexed token, uint256 amount, uint256 timestamp)'
];

export class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private faucetContract!: ethers.Contract;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    try {
      // Initialize provider with Sepolia network
      this.provider = new ethers.JsonRpcProvider(config.blockchain.sepoliaRpcUrl, 'sepolia');
      
      // Set polling interval to reduce API calls (increased from 4s to 30s)
      this.provider.pollingInterval = 30000;
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(config.blockchain.privateKey, this.provider);
      
      // Initialize contract
      this.faucetContract = new ethers.Contract(
        config.blockchain.faucetContractAddress,
        FAUCET_ABI,
        this.wallet
      );
      
      console.log('✅ Blockchain service initialized');
      console.log(`📍 Faucet contract: ${config.blockchain.faucetContractAddress}`);
    } catch (error: unknown) {
      console.error('❌ Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async claimEth(recipientAddress: string): Promise<string> {
    try {
      // Validate address
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Check if address is blacklisted
      const isBlacklisted = await this.faucetContract.blacklisted(recipientAddress);
      if (isBlacklisted) {
        throw new Error('Address is blacklisted');
      }

      // Check cooldown
      const canClaim = await this.canClaimEth(recipientAddress);
      if (!canClaim.canClaim) {
        throw new Error(`Cooldown active. Try again in ${Math.ceil((canClaim.remainingTime || 0) / 60)} minutes`);
      }

      // Execute claim transaction
      const tx = await this.faucetContract.claimEthFor(recipientAddress);
      console.log(`🚀 ETH claim transaction sent: ${tx.hash}`);
      
      // Return transaction hash immediately - don't wait for confirmation
      // The transaction will be confirmed in the background
      return tx.hash;
    } catch (error: unknown) {
      console.error('❌ ETH claim failed:', error);
      throw error;
    }
  }

  async claimToken(recipientAddress: string, tokenAddress: string): Promise<string> {
    try {
      // Validate addresses
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      // Check if address is blacklisted
      const isBlacklisted = await this.faucetContract.blacklisted(recipientAddress);
      if (isBlacklisted) {
        throw new Error('Address is blacklisted');
      }

      // Check if token is supported
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      if (!tokenInfo.active) {
        throw new Error('Token not supported');
      }

      // Check cooldown
      const canClaim = await this.canClaimToken(recipientAddress, tokenAddress);
      if (!canClaim.canClaim) {
        throw new Error(`Cooldown active. Try again in ${Math.ceil((canClaim.remainingTime || 0) / 60)} minutes`);
      }

      // Execute claim transaction
      const tx = await this.faucetContract.claimTokenFor(tokenAddress, recipientAddress);
      console.log(`🚀 Token claim transaction sent: ${tx.hash}`);
      
      // Return transaction hash immediately - don't wait for confirmation
      // The transaction will be confirmed in the background
      return tx.hash;
    } catch (error: unknown) {
      console.error('❌ Token claim failed:', error);
      throw error;
    }
  }

  async getEthAmount(): Promise<string> {
    const cacheKey = 'eth_amount';
    const cached = callCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      const amount = await retryWithBackoff(() => this.faucetContract.ethAmount());
      const result = ethers.formatEther(amount);
      
      // Cache the result
      callCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error: unknown) {
      console.error('❌ Failed to get ETH amount:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Returning expired cached ETH amount due to error');
        return cached.data;
      }
      
      throw error;
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<{ amount: string; cooldown: number; active: boolean }> {
    const cacheKey = `token_info_${tokenAddress}`;
    const cached = callCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      const tokenInfo = await retryWithBackoff(() => this.faucetContract.supportedTokens(tokenAddress));
      const result = {
        amount: tokenInfo.amount.toString(),
        cooldown: Number(tokenInfo.cooldown),
        active: tokenInfo.active,
      };
      
      // Cache the result
      callCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error: unknown) {
      console.error('❌ Failed to get token info:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Returning expired cached token info due to error');
        return cached.data;
      }
      
      throw error;
    }
  }

  async canClaimEth(address: string): Promise<{ canClaim: boolean; remainingTime?: number }> {
    try {
      const lastClaimTime = await this.faucetContract.lastEthClaimTime(address);
      const currentTime = Math.floor(Date.now() / 1000);
      const cooldownPeriod = 24 * 60 * 60; // 24 hours in seconds
      
      const timeSinceLastClaim = currentTime - Number(lastClaimTime);
      
      if (timeSinceLastClaim >= cooldownPeriod) {
        return { canClaim: true };
      } else {
        const remainingTime = cooldownPeriod - timeSinceLastClaim;
        return { canClaim: false, remainingTime };
      }
    } catch (error: unknown) {
      console.error('❌ Failed to check ETH claim eligibility:', error);
      throw error;
    }
  }

  async canClaimToken(address: string, tokenAddress: string): Promise<{ canClaim: boolean; remainingTime?: number }> {
    try {
      const lastClaimTime = await this.faucetContract.lastClaimTime(address, tokenAddress);
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      const currentTime = Math.floor(Date.now() / 1000);
      
      const timeSinceLastClaim = currentTime - Number(lastClaimTime);
      
      if (timeSinceLastClaim >= tokenInfo.cooldown) {
        return { canClaim: true };
      } else {
        const remainingTime = tokenInfo.cooldown - timeSinceLastClaim;
        return { canClaim: false, remainingTime };
      }
    } catch (error: unknown) {
      console.error('❌ Failed to check token claim eligibility:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();