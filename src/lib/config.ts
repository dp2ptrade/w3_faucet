import { z } from 'zod';

// Environment validation schema for Next.js API routes
const envSchema = z.object({
  // Blockchain Configuration
  SEPOLIA_RPC_URL: z.string().min(1, 'Sepolia RPC URL is required'),
  PRIVATE_KEY: z.string().min(1, 'Private key is required'),
  FAUCET_CONTRACT_ADDRESS: z.string().min(1, 'Faucet contract address is required'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // Rate Limiting Configuration
  RATE_LIMIT_MAX: z.string().default('10').transform(Number),
  RATE_LIMIT_WINDOW: z.string().default('60000').transform(Number), // 1 minute
  DAILY_CLAIM_LIMIT: z.string().default('1').transform(Number),
  
  // Faucet Configuration
  ETH_AMOUNT: z.string().default('0.1'),
  TOKEN_AMOUNTS: z.string().default('{"USDT":100,"USDC":100,"DAI":100,"WETH":0.1,"LINK":10,"UNI":5}'),
  ADMIN_ADDRESS: z.string().min(1, 'Admin address is required'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  blockchain: {
    sepoliaRpcUrl: env.SEPOLIA_RPC_URL,
    privateKey: env.PRIVATE_KEY,
    faucetContractAddress: env.FAUCET_CONTRACT_ADDRESS,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    window: env.RATE_LIMIT_WINDOW,
    dailyClaimLimit: env.DAILY_CLAIM_LIMIT,
  },
  faucet: {
    ethAmount: env.ETH_AMOUNT,
    tokenAmounts: JSON.parse(env.TOKEN_AMOUNTS),
    adminAddress: env.ADMIN_ADDRESS,
  },
  nodeEnv: env.NODE_ENV,
} as const;

export type Config = typeof config;