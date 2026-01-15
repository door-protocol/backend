/**
 * DOOR Rate Oracle - Rate Collectors
 * 
 * Collects rates from multiple sources:
 * - TESR (Treehouse Ethereum Staking Rate)
 * - mETH Staking (Mantle LST)
 * - SOFR (Secured Overnight Financing Rate)
 * - Aave USDT Supply Rate
 * - Ondo USDY Yield
 * 
 * Enhanced with:
 * - Retry logic with exponential backoff
 * - Multiple API fallbacks
 * - Detailed logging and validation
 */

import axios from 'axios';
import { JsonRpcProvider } from 'ethers';

// Rate source IDs (must match contract)
export enum RateSourceId {
  TESR = 0,
  METH = 1,
  SOFR = 2,
  AAVE_USDT = 3,
  ONDO_USDY = 4
}

export interface RateData {
  sourceId: RateSourceId;
  name: string;
  rate: number;  // in basis points (e.g., 450 = 4.50%)
  timestamp: number;
  source: string;
  isLive: boolean;  // true if from live API, false if fallback
}

export interface CollectorConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: CollectorConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 15000
};

// ============ Retry Utility ============
async function withRetry<T>(
  fn: () => Promise<T>,
  config: CollectorConfig = DEFAULT_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`  Retry ${attempt}/${config.maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ============ TESR Collector (Treehouse Protocol) ============
export async function collectTESR(config: CollectorConfig = DEFAULT_CONFIG): Promise<RateData> {
  const sources = [
    // Primary: Treehouse official API
    {
      url: 'https://api.treehouse.finance/v1/rates/tesr',
      parser: (data: unknown) => {
        const d = data as Record<string, unknown>;
        return (d.rate || d.tesr || d.stakingRate) as number | undefined;
      }
    },
    // Fallback: DefiLlama staking rates
    {
      url: 'https://yields.llama.fi/pools',
      parser: (data: unknown) => {
        const d = data as { data?: Array<{ chain?: string; project?: string; apy?: number }> };
        const ethStaking = d.data?.filter((p) => 
          p.chain === 'Ethereum' && 
          p.project?.toLowerCase().includes('lido')
        );
        if (ethStaking && ethStaking.length > 0) {
          return ethStaking[0].apy;
        }
        return undefined;
      }
    }
  ];

  for (const source of sources) {
    try {
      const result = await withRetry(async () => {
        const response = await axios.get(source.url, {
          timeout: config.timeoutMs,
          headers: { 'Accept': 'application/json', 'User-Agent': 'DOOR-Oracle/1.0' }
        });
        
        const ratePercent = source.parser(response.data);
        if (ratePercent == null || isNaN(ratePercent)) {
          throw new Error('Invalid rate data');
        }
        
        return {
          sourceId: RateSourceId.TESR,
          name: 'TESR',
          rate: Math.round(ratePercent * 100),
          timestamp: Date.now(),
          source: new URL(source.url).hostname,
          isLive: true
        };
      }, config);
      
      return result;
    } catch (error) {
      console.warn(`  TESR source ${source.url} failed:`, (error as Error).message);
    }
  }

  // Final fallback with conservative rate
  console.warn('  TESR: All sources failed, using fallback');
  return {
    sourceId: RateSourceId.TESR,
    name: 'TESR',
    rate: 350, // 3.50% - conservative fallback based on typical ETH staking
    timestamp: Date.now(),
    source: 'Fallback',
    isLive: false
  };
}

// ============ mETH Staking Rate Collector (Mantle) ============
export async function collectMETH(
  provider: JsonRpcProvider,
  config: CollectorConfig = DEFAULT_CONFIG
): Promise<RateData> {
  const sources = [
    // Primary: Mantle staking API
    async () => {
      const response = await axios.get('https://staking-api.mantle.xyz/api/v1/stats', {
        timeout: config.timeoutMs,
        headers: { 'Accept': 'application/json' }
      });
      const data = response.data as { meth?: { apy?: number }; apy?: number };
      const apy = data?.meth?.apy || data?.apy;
      if (apy) return apy;
      throw new Error('No APY in response');
    },
    // Fallback: DefiLlama
    async () => {
      const response = await axios.get('https://yields.llama.fi/pools', {
        timeout: config.timeoutMs
      });
      const data = response.data as { data?: Array<{ symbol?: string; chain?: string; apy?: number }> };
      const methPool = data?.data?.find((p) => 
        p.symbol?.toLowerCase().includes('meth') && 
        p.chain?.toLowerCase() === 'mantle'
      );
      if (methPool?.apy) return methPool.apy;
      throw new Error('mETH not found in DefiLlama');
    }
  ];

  for (const source of sources) {
    try {
      const rate = await withRetry(source, config);
      return {
        sourceId: RateSourceId.METH,
        name: 'mETH',
        rate: Math.round(rate * 100),
        timestamp: Date.now(),
        source: 'Mantle API',
        isLive: true
      };
    } catch (error) {
      console.warn(`  mETH source failed:`, (error as Error).message);
    }
  }

  // Fallback: mETH typically offers 4-5% (ETH staking + Mantle rewards)
  console.warn('  mETH: All sources failed, using fallback');
  return {
    sourceId: RateSourceId.METH,
    name: 'mETH',
    rate: 450, // 4.50% fallback
    timestamp: Date.now(),
    source: 'Fallback',
    isLive: false
  };
}

// ============ SOFR Collector (Federal Reserve) ============
export async function collectSOFR(config: CollectorConfig = DEFAULT_CONFIG): Promise<RateData> {
  const sources = [
    // Primary: NY Fed official API
    {
      url: 'https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json',
      parser: (data: unknown) => {
        const d = data as { refRates?: Array<{ percentRate?: string | number }> };
        const rate = d?.refRates?.[0]?.percentRate;
        if (rate != null) return parseFloat(String(rate));
        throw new Error('Invalid SOFR response');
      }
    },
    // Fallback: FRED API (St. Louis Fed)
    {
      url: 'https://api.stlouisfed.org/fred/series/observations?series_id=SOFR&sort_order=desc&limit=1&file_type=json',
      parser: (data: unknown) => {
        const d = data as { observations?: Array<{ value?: string }> };
        const obs = d?.observations?.[0]?.value;
        if (obs != null && obs !== '.') return parseFloat(obs);
        throw new Error('Invalid FRED response');
      }
    }
  ];

  for (const source of sources) {
    try {
      const result = await withRetry(async () => {
        const response = await axios.get(source.url, {
          timeout: config.timeoutMs,
          headers: { 'Accept': 'application/json' }
        });
        
        const rate = source.parser(response.data);
        return {
          sourceId: RateSourceId.SOFR,
          name: 'SOFR',
          rate: Math.round(rate * 100),
          timestamp: Date.now(),
          source: new URL(source.url).hostname,
          isLive: true
        };
      }, config);
      
      return result;
    } catch (error) {
      console.warn(`  SOFR source ${source.url} failed:`, (error as Error).message);
    }
  }

  // Fallback based on current Fed policy (~4.5-5% range)
  console.warn('  SOFR: All sources failed, using fallback');
  return {
    sourceId: RateSourceId.SOFR,
    name: 'SOFR',
    rate: 460, // 4.60% fallback
    timestamp: Date.now(),
    source: 'Fallback',
    isLive: false
  };
}

// ============ Aave USDT Supply Rate Collector ============
export async function collectAaveUSDT(
  provider: JsonRpcProvider,
  config: CollectorConfig = DEFAULT_CONFIG
): Promise<RateData> {
  const sources = [
    // Primary: Aave API
    async () => {
      const response = await axios.get('https://aave-api-v2.aave.com/data/markets-data', {
        timeout: config.timeoutMs
      });
      
      type Reserve = { 
        symbol?: string; 
        underlyingAsset?: string; 
        liquidityRate?: string | number;
        supplyAPY?: string | number;
      };
      
      const data = response.data as { reserves?: Reserve[] } | Reserve[];
      const reserves = Array.isArray(data) ? data : data?.reserves || [];
      
      const usdtMarket = reserves.find(
        (r) => r.symbol?.toUpperCase() === 'USDT' || r.underlyingAsset?.toLowerCase().includes('usdt')
      );
      
      if (usdtMarket) {
        // liquidityRate is in ray (1e27), convert to percentage
        const rate = usdtMarket.liquidityRate 
          ? parseFloat(String(usdtMarket.liquidityRate)) / 1e25 
          : usdtMarket.supplyAPY 
            ? parseFloat(String(usdtMarket.supplyAPY)) * 100
            : null;
        if (rate != null) return rate;
      }
      throw new Error('USDT not found in Aave response');
    },
    // Fallback: DefiLlama
    async () => {
      const response = await axios.get('https://yields.llama.fi/pools', {
        timeout: config.timeoutMs
      });
      const data = response.data as { data?: Array<{ project?: string; symbol?: string; apy?: number }> };
      const aaveUsdt = data?.data?.find((p) => 
        p.project === 'aave-v3' && 
        p.symbol?.toLowerCase() === 'usdt'
      );
      if (aaveUsdt?.apy) return aaveUsdt.apy;
      throw new Error('Aave USDT not found in DefiLlama');
    }
  ];

  for (const source of sources) {
    try {
      const rate = await withRetry(source, config);
      return {
        sourceId: RateSourceId.AAVE_USDT,
        name: 'Aave_USDT',
        rate: Math.round(rate * 100),
        timestamp: Date.now(),
        source: 'Aave API',
        isLive: true
      };
    } catch (error) {
      console.warn(`  Aave USDT source failed:`, (error as Error).message);
    }
  }

  // Fallback: USDT supply rates typically 4-8%
  console.warn('  Aave USDT: All sources failed, using fallback');
  return {
    sourceId: RateSourceId.AAVE_USDT,
    name: 'Aave_USDT',
    rate: 550, // 5.50% fallback (mid-range)
    timestamp: Date.now(),
    source: 'Fallback',
    isLive: false
  };
}

// ============ Ondo USDY Yield Collector ============
export async function collectOndoUSDY(config: CollectorConfig = DEFAULT_CONFIG): Promise<RateData> {
  const sources = [
    // Primary: Ondo Finance API
    async () => {
      const response = await axios.get('https://api.ondo.finance/v1/tokens/usdy', {
        timeout: config.timeoutMs,
        headers: { 'Accept': 'application/json' }
      });
      const data = response.data as { apy?: number; yield?: number; currentYield?: number };
      const rate = data?.apy || data?.yield || data?.currentYield;
      if (rate != null) return rate;
      throw new Error('No yield in Ondo response');
    },
    // Fallback: Try their public stats endpoint
    async () => {
      const response = await axios.get('https://ondo.finance/api/usdy/stats', {
        timeout: config.timeoutMs
      });
      const data = response.data as { apy?: number };
      const rate = data?.apy;
      if (rate != null) return rate;
      throw new Error('No yield in Ondo stats');
    },
    // Fallback: RWA.xyz or similar aggregator
    async () => {
      const response = await axios.get('https://api.rwa.xyz/v1/yields', {
        timeout: config.timeoutMs
      });
      const data = response.data as Array<{ symbol?: string; apy?: number }> | undefined;
      const usdy = data?.find?.((t) => t.symbol?.toLowerCase() === 'usdy');
      if (usdy?.apy) return usdy.apy;
      throw new Error('USDY not found in RWA aggregator');
    }
  ];

  for (const source of sources) {
    try {
      const rate = await withRetry(source, config);
      return {
        sourceId: RateSourceId.ONDO_USDY,
        name: 'Ondo_USDY',
        rate: Math.round(rate * 100),
        timestamp: Date.now(),
        source: 'Ondo API',
        isLive: true
      };
    } catch (error) {
      console.warn(`  Ondo USDY source failed:`, (error as Error).message);
    }
  }

  // Fallback: USDY typically tracks 3-month T-bills (~4.5-5.2%)
  console.warn('  Ondo USDY: All sources failed, using fallback');
  return {
    sourceId: RateSourceId.ONDO_USDY,
    name: 'Ondo_USDY',
    rate: 500, // 5.00% fallback
    timestamp: Date.now(),
    source: 'Fallback',
    isLive: false
  };
}

// ============ Collect All Rates ============
export async function collectAllRates(
  provider: JsonRpcProvider,
  config: CollectorConfig = DEFAULT_CONFIG
): Promise<RateData[]> {
  console.log('🔄 Collecting rates from all sources...\n');

  const results = await Promise.allSettled([
    collectTESR(config),
    collectMETH(provider, config),
    collectSOFR(config),
    collectAaveUSDT(provider, config),
    collectOndoUSDY(config)
  ]);

  const rates: RateData[] = [];
  let liveCount = 0;
  let fallbackCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      rates.push(result.value);
      const status = result.value.isLive ? '✅' : '⚠️';
      console.log(`${status} ${result.value.name}: ${result.value.rate / 100}% (${result.value.source})`);
      if (result.value.isLive) liveCount++;
      else fallbackCount++;
    } else {
      console.error(`❌ Failed to collect rate:`, result.reason);
    }
  }

  console.log(`\n📊 Collection Summary: ${liveCount} live, ${fallbackCount} fallback, ${5 - rates.length} failed`);
  
  return rates;
}

// ============ Calculate DOR ============
export function calculateDOR(rates: RateData[]): number {
  const weights: Record<RateSourceId, number> = {
    [RateSourceId.TESR]: 2000,      // 20%
    [RateSourceId.METH]: 3000,      // 30%
    [RateSourceId.SOFR]: 2500,      // 25%
    [RateSourceId.AAVE_USDT]: 1500, // 15%
    [RateSourceId.ONDO_USDY]: 1000  // 10%
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const rate of rates) {
    const weight = weights[rate.sourceId];
    weightedSum += rate.rate * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    console.warn('⚠️ No rates available, returning default DOR');
    return 460; // 4.60% default
  }

  return Math.round(weightedSum / totalWeight);
}

// ============ Validate Rates ============
export function validateRates(rates: RateData[]): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check minimum sources
  if (rates.length < 3) {
    errors.push(`Only ${rates.length}/5 sources available (minimum 3 required)`);
  }

  // Check for stale data
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const rate of rates) {
    if (Date.now() - rate.timestamp > maxAge) {
      warnings.push(`${rate.name} data is stale (> 24h old)`);
    }
  }

  // Check for extreme values
  for (const rate of rates) {
    if (rate.rate < 0) {
      errors.push(`${rate.name} has negative rate: ${rate.rate / 100}%`);
    }
    if (rate.rate > 5000) { // > 50%
      warnings.push(`${rate.name} has unusually high rate: ${rate.rate / 100}%`);
    }
  }

  // Check fallback percentage
  const fallbackCount = rates.filter(r => !r.isLive).length;
  if (fallbackCount > 2) {
    warnings.push(`${fallbackCount}/5 sources using fallback values`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}
