/**
 * DOOR Protocol Backend - Database Service (Mock)
 * 
 * MVP version: No actual database, returns empty/null for all queries.
 * The API routes have fallback logic to use mock data when DB returns empty.
 */

// Mock types to match the original interface
export interface RateSnapshot {
  id: number;
  createdAt: Date;
  sourceId: number;
  sourceName: string;
  rate: number;
  source: string;
  isLive: boolean;
  dorUpdateId: number;
}

export interface DORUpdate {
  id: number;
  createdAt: Date;
  dor: number;
  seniorTarget: number;
  txHash: string | null;
  blockNumber: number | null;
  gasUsed: bigint | null;
  success: boolean;
  errorMessage: string | null;
  liveSourceCount: number;
  fallbackSourceCount: number;
  rateSnapshots: RateSnapshot[];
}

export interface UserTransaction {
  id: number;
  createdAt: Date;
  userAddress: string;
  type: string;
  amount: bigint;
  shares: bigint | null;
  txHash: string;
  blockNumber: number;
  epochId: number | null;
}

export interface UserPositionSnapshot {
  id: number;
  createdAt: Date;
  userAddress: string;
  seniorShares: bigint;
  seniorAssets: bigint;
  seniorYield: bigint;
  juniorShares: bigint;
  juniorAssets: bigint;
  juniorYield: bigint;
  totalAssets: bigint;
}

export interface EpochRecord {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  epochId: number;
  state: string;
  startTime: Date;
  endTime: Date | null;
  settledAt: Date | null;
  totalDeposits: bigint;
  seniorDeposits: bigint;
  juniorDeposits: bigint;
  totalWithdrawRequests: bigint;
  seniorWithdrawRequests: bigint;
  juniorWithdrawRequests: bigint;
  totalYield: bigint;
  seniorYield: bigint;
  juniorYield: bigint;
  seniorAPY: number | null;
  juniorAPY: number | null;
  vaultAPY: number | null;
  settlementTxHash: string | null;
}

export interface VaultStatsSnapshot {
  id: number;
  createdAt: Date;
  totalAssets: bigint;
  seniorPrincipal: bigint;
  juniorPrincipal: bigint;
  juniorRatio: number;
  seniorAPY: number;
  estimatedJuniorAPY: number;
  vaultAPY: number;
  isHealthy: boolean;
  dor: number;
}

export interface SystemLog {
  id: number;
  createdAt: Date;
  level: string;
  category: string;
  message: string;
  details: unknown;
}

/**
 * Mock Database Service - All methods return empty/null
 * API routes will fallback to mock data
 */
export class DatabaseService {
  
  // ============ Rate History ============

  async saveDORUpdate(_data: {
    dor: number;
    seniorTarget: number;
    txHash?: string | null;
    blockNumber?: number | null;
    gasUsed?: bigint | null;
    success: boolean;
    errorMessage?: string | null;
    rates: Array<{
      sourceId: number;
      sourceName: string;
      rate: number;
      source: string;
      isLive: boolean;
    }>;
  }): Promise<DORUpdate | null> {
    console.log('[MockDB] saveDORUpdate called - no-op in MVP mode');
    return null;
  }

  async getDORHistory(_period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<DORUpdate[]> {
    // Return empty - vault.ts will use mock data
    return [];
  }

  async getLatestDOR(): Promise<DORUpdate | null> {
    // Return null - vault.ts will use mock data
    return null;
  }

  async getRateHistory(_sourceId: number, _days: number = 30): Promise<RateSnapshot[]> {
    return [];
  }

  // ============ User Activity ============

  async recordUserTransaction(_data: {
    userAddress: string;
    type: 'DEPOSIT_SENIOR' | 'DEPOSIT_JUNIOR' | 'WITHDRAW_SENIOR' | 'WITHDRAW_JUNIOR' | 'CLAIM_YIELD' | 'REQUEST_WITHDRAW';
    amount: bigint;
    shares?: bigint | null;
    txHash: string;
    blockNumber: number;
    epochId?: number | null;
  }): Promise<UserTransaction | null> {
    console.log('[MockDB] recordUserTransaction called - no-op in MVP mode');
    return null;
  }

  async getUserTransactions(_userAddress: string, _limit: number = 50): Promise<UserTransaction[]> {
    return [];
  }

  async saveUserPositionSnapshot(_data: {
    userAddress: string;
    seniorShares: bigint;
    seniorAssets: bigint;
    seniorYield: bigint;
    juniorShares: bigint;
    juniorAssets: bigint;
    juniorYield: bigint;
    totalAssets: bigint;
  }): Promise<UserPositionSnapshot | null> {
    console.log('[MockDB] saveUserPositionSnapshot called - no-op in MVP mode');
    return null;
  }

  // ============ Epoch History ============

  async upsertEpochRecord(_epochId: number, _data: Partial<{
    state: 'OPEN' | 'LOCKED' | 'SETTLED';
    startTime: Date;
    endTime: Date;
    settledAt: Date;
    totalDeposits: bigint;
    seniorDeposits: bigint;
    juniorDeposits: bigint;
    totalWithdrawRequests: bigint;
    seniorWithdrawRequests: bigint;
    juniorWithdrawRequests: bigint;
    totalYield: bigint;
    seniorYield: bigint;
    juniorYield: bigint;
    seniorAPY: number;
    juniorAPY: number;
    vaultAPY: number;
    settlementTxHash: string;
  }>): Promise<EpochRecord | null> {
    console.log('[MockDB] upsertEpochRecord called - no-op in MVP mode');
    return null;
  }

  async getEpochHistory(_limit: number = 20): Promise<EpochRecord[]> {
    return [];
  }

  // ============ Vault Stats ============

  async saveVaultStatsSnapshot(_data: {
    totalAssets: bigint;
    seniorPrincipal: bigint;
    juniorPrincipal: bigint;
    juniorRatio: number;
    seniorAPY: number;
    estimatedJuniorAPY: number;
    vaultAPY: number;
    isHealthy: boolean;
    dor: number;
  }): Promise<VaultStatsSnapshot | null> {
    console.log('[MockDB] saveVaultStatsSnapshot called - no-op in MVP mode');
    return null;
  }

  async getVaultStatsHistory(_period: '7d' | '30d' | '90d' = '30d'): Promise<VaultStatsSnapshot[]> {
    return [];
  }

  // ============ System Logs ============

  async log(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    category: string,
    message: string,
    _details?: Record<string, unknown>
  ): Promise<SystemLog | null> {
    // Just console.log in MVP mode
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'INFO' ? 'ℹ️' : '🔍';
    console.log(`${prefix} [${category}] ${message}`);
    return null;
  }

  async getLogs(_options: {
    level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    category?: string;
    limit?: number;
  } = {}): Promise<SystemLog[]> {
    return [];
  }

  // ============ Connection ============

  async connect(): Promise<void> {
    console.log('📦 MockDB: No database in MVP mode');
  }

  async disconnect(): Promise<void> {
    console.log('📦 MockDB: Disconnected');
  }
}

// Export singleton instance
export const db = new DatabaseService();
