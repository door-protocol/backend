/**
 * DOOR Rate Oracle - Rate Pusher
 * 
 * Pushes collected rates to the DOORRateOracle contract
 * 
 * Enhanced with:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for failure handling
 * - Transaction monitoring
 * - Detailed error reporting
 */

import { Wallet, JsonRpcProvider, Contract, TransactionReceipt } from 'ethers';
import { RateData, RateSourceId, calculateDOR } from './collectors';

// Contract ABI (subset for pushing rates)
const DOOR_ORACLE_ABI = [
  'function updateRate(uint256 sourceId, uint256 newRate) external',
  'function batchUpdateRates(uint256[] sourceIds, uint256[] newRates) external',
  'function batchUpdateWithSignature(uint256[] sourceIds, uint256[] newRates, uint256 timestamp, bytes signature) external',
  'function updateNonce() view returns (uint256)',
  'function getDOR() view returns (uint256)',
  'function getAllRateSources() view returns (tuple(string name, uint256 weight, uint256 rate, uint256 lastUpdate, bool isActive)[])',
  'function authorizedUpdaters(address) view returns (bool)'
];

// ============ Circuit Breaker ============
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  resetTimeoutMs: number;      // Time before trying again
  halfOpenMaxAttempts: number; // Attempts allowed in half-open state
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        console.log('🔌 Circuit breaker: HALF_OPEN (testing recovery)');
      } else {
        throw new Error('Circuit breaker is OPEN - refusing request');
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts > this.config.halfOpenMaxAttempts) {
        this.state = CircuitState.OPEN;
        this.lastFailureTime = Date.now();
        throw new Error('Circuit breaker: too many half-open attempts, reopening');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log('🔌 Circuit breaker: CLOSED (recovered)');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`🔌 Circuit breaker: OPEN (${this.failureCount} failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}

// ============ Retry Configuration ============
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );
        
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        
        console.log(`  ⏳ Retry ${attempt}/${config.maxRetries} in ${delay}ms...`);
        console.log(`     Error: ${lastError.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ============ Push Configuration ============
export interface PushConfig {
  rpcUrl: string;
  privateKey: string;
  oracleAddress: string;
  useSignature?: boolean;
  gasLimitMultiplier?: number;
  maxGasPrice?: bigint;
}

export interface PushResult {
  txHash: string;
  oldDOR: number;
  newDOR: number;
  localDOR: number;
  gasUsed: bigint;
  blockNumber: number;
}

// ============ Rate Pusher ============
export class RatePusher {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private config: PushConfig;
  private circuitBreaker: CircuitBreaker;

  constructor(config: PushConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.contract = new Contract(config.oracleAddress, DOOR_ORACLE_ABI, this.wallet);
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
      halfOpenMaxAttempts: 2
    });
  }

  async isAuthorized(): Promise<boolean> {
    try {
      return await this.contract.authorizedUpdaters(this.wallet.address);
    } catch (error) {
      console.error('Failed to check authorization:', error);
      return false;
    }
  }

  async getCurrentDOR(): Promise<number> {
    return Number(await this.contract.getDOR());
  }

  async getAllSources(): Promise<Array<{
    name: string;
    weight: bigint;
    rate: bigint;
    lastUpdate: bigint;
    isActive: boolean;
  }>> {
    return await this.contract.getAllRateSources();
  }

  async estimateGas(rates: RateData[]): Promise<bigint> {
    const sourceIds = rates.map(r => r.sourceId);
    const newRates = rates.map(r => r.rate);
    
    try {
      const estimate = await this.contract.batchUpdateRates.estimateGas(sourceIds, newRates);
      const multiplier = this.config.gasLimitMultiplier || 1.2;
      return BigInt(Math.ceil(Number(estimate) * multiplier));
    } catch (error) {
      console.warn('Gas estimation failed, using default:', error);
      return 500000n; // Default gas limit
    }
  }

  async pushBatchRates(rates: RateData[]): Promise<TransactionReceipt> {
    console.log(`📤 Pushing ${rates.length} rates in batch...`);

    const sourceIds = rates.map(r => r.sourceId);
    const newRates = rates.map(r => r.rate);

    // Use circuit breaker and retry logic
    return await this.circuitBreaker.execute(async () => {
      return await withRetry(async () => {
        // Estimate gas
        const gasLimit = await this.estimateGas(rates);
        console.log(`  Gas limit: ${gasLimit}`);

        // Check gas price
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice || 0n;
        
        if (this.config.maxGasPrice && gasPrice > this.config.maxGasPrice) {
          throw new Error(`Gas price too high: ${gasPrice} > ${this.config.maxGasPrice}`);
        }
        console.log(`  Gas price: ${gasPrice}`);

        // Send transaction
        const tx = await this.contract.batchUpdateRates(sourceIds, newRates, {
          gasLimit
        });
        console.log(`  TX submitted: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait(1); // Wait for 1 confirmation
        
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Transaction failed: ${tx.hash}`);
        }
        
        console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);
        return receipt;
      }, DEFAULT_RETRY_CONFIG, (attempt, error) => {
        console.log(`  Retry attempt ${attempt} due to: ${error.message}`);
      });
    });
  }

  async fullUpdate(rates: RateData[]): Promise<PushResult> {
    // Get current state
    const oldDOR = await this.getCurrentDOR();
    console.log(`📊 Current DOR: ${oldDOR / 100}%`);

    // Calculate expected DOR
    const localDOR = calculateDOR(rates);
    console.log(`📊 Expected DOR: ${localDOR / 100}%`);

    // Check for significant change
    const dorChange = Math.abs(localDOR - oldDOR);
    if (dorChange > 200) { // > 2% change
      console.warn(`⚠️ Large DOR change detected: ${dorChange / 100}%`);
    }

    // Push rates
    const receipt = await this.pushBatchRates(rates);

    // Verify new state
    const newDOR = await this.getCurrentDOR();
    console.log(`📊 New DOR: ${newDOR / 100}%`);

    // Verify the update was applied correctly
    if (Math.abs(newDOR - localDOR) > 5) { // Allow small rounding difference
      console.warn(`⚠️ DOR mismatch: expected ${localDOR / 100}%, got ${newDOR / 100}%`);
    }

    return {
      txHash: receipt.hash,
      oldDOR,
      newDOR,
      localDOR,
      gasUsed: receipt.gasUsed,
      blockNumber: receipt.blockNumber
    };
  }

  async dryRun(rates: RateData[]): Promise<void> {
    console.log('\n🔍 Dry Run Mode - No actual transaction will be sent\n');

    try {
      const isAuth = await this.isAuthorized();
      console.log(`Authorization: ${isAuth ? '✅ Authorized' : '❌ Not Authorized'}`);

      const currentDOR = await this.getCurrentDOR();
      const sources = await this.getAllSources();

      console.log(`\nCurrent State:`);
      console.log(`  DOR: ${currentDOR / 100}%`);
      console.log(`  Sources:`);
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i];
        console.log(`    [${i}] ${s.name}: ${Number(s.rate) / 100}% (weight: ${Number(s.weight) / 100}%)`);
      }

      const newDOR = calculateDOR(rates);
      console.log(`\nProposed Changes:`);
      for (const rate of rates) {
        const current = sources[rate.sourceId];
        const currentRate = Number(current?.rate || 0);
        const change = rate.rate - currentRate;
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        console.log(`  ${rate.name}: ${currentRate / 100}% ${arrow} ${rate.rate / 100}%`);
      }

      console.log(`\nDOR Change: ${currentDOR / 100}% → ${newDOR / 100}%`);
      console.log(`  Delta: ${(newDOR - currentDOR) / 100}%`);

      // Estimate gas
      const gasEstimate = await this.estimateGas(rates);
      console.log(`\nGas Estimate: ${gasEstimate}`);

    } catch (error) {
      console.error('Dry run failed:', error);
    }
  }

  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    console.log('🔌 Circuit breaker reset');
  }
}

// ============ Utility Functions ============
export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function generateReport(rates: RateData[], dor: number): string {
  const lines = [
    '═══════════════════════════════════════════',
    '       DOOR Rate Oracle Update Report      ',
    '═══════════════════════════════════════════',
    '',
    `Timestamp: ${new Date().toISOString()}`,
    '',
    'Rate Sources:',
    '─────────────────────────────────────────',
  ];

  const liveCount = rates.filter(r => r.isLive).length;
  const fallbackCount = rates.filter(r => !r.isLive).length;

  for (const rate of rates) {
    const status = rate.isLive ? '●' : '○';
    lines.push(`  ${status} ${rate.name.padEnd(12)} ${formatRate(rate.rate).padStart(7)}  (${rate.source})`);
  }

  lines.push('─────────────────────────────────────────');
  lines.push(`  DOR (Weighted)  ${formatRate(dor).padStart(7)}`);
  lines.push(`  Senior Target   ${formatRate(dor + 100).padStart(7)}  (DOR + 1%)`);
  lines.push('─────────────────────────────────────────');
  lines.push(`  Sources: ${liveCount} live, ${fallbackCount} fallback`);
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

export { CircuitState };
