/**
 * DOOR Rate Oracle - Rate Collectors
 * 
 * Collects rates from multiple sources:
 * - TESR (Treehouse Ethereum Staking Rate)
 * - mETH Staking (Mantle LST)
 * - SOFR (Secured Overnight Financing Rate)
 * - Aave USDT Supply Rate
 * - Ondo USDY Yield
 */

import axios from 'axios';
import { ethers, JsonRpcProvider } from 'ethers';

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
}

// ============ TESR Collector (Treehouse Protocol) ============
export async function collectTESR(): Promise<RateData> {
  try {
    // Treehouse API endpoint (hypothetical - check actual docs)
    const response = await axios.get('https://api.treehouse.finance/v1/rates/tesr', {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    const ratePercent = response.data.rate || 3.5;
    return {
      sourceId: RateSourceId.TESR,
      name: 'TESR',
      rate: Math.round(ratePercent * 100),
      timestamp: Date.now(),
      source: 'Treehouse API'
    };
  } catch (error) {
    console.warn('TESR fetch failed, using fallback:', error);
    return {
      sourceId: RateSourceId.TESR,
      name: 'TESR',
      rate: 350, // 3.50% fallback
      timestamp: Date.now(),
      source: 'Fallback'
    };
  }
}

// ============ mETH Staking Rate Collector (Mantle) ============
export async function collectMETH(provider: JsonRpcProvider): Promise<RateData> {
  try {
    // mETH staking - use estimated APY for demo
    const estimatedAPY = 4.5; // 4.5%
    
    return {
      sourceId: RateSourceId.METH,
      name: 'mETH',
      rate: Math.round(estimatedAPY * 100),
      timestamp: Date.now(),
      source: 'mETH Estimated'
    };
  } catch (error) {
    console.warn('mETH fetch failed, using fallback:', error);
    return {
      sourceId: RateSourceId.METH,
      name: 'mETH',
      rate: 450, // 4.50% fallback
      timestamp: Date.now(),
      source: 'Fallback'
    };
  }
}

// ============ SOFR Collector (Federal Reserve) ============
export async function collectSOFR(provider: JsonRpcProvider): Promise<RateData> {
  try {
    // Federal Reserve API
    const response = await axios.get(
      'https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json',
      { timeout: 10000 }
    );

    const sofrData = response.data?.refRates?.[0];
    const sofrRate = sofrData?.percentRate || 4.6;

    return {
      sourceId: RateSourceId.SOFR,
      name: 'SOFR',
      rate: Math.round(sofrRate * 100),
      timestamp: Date.now(),
      source: 'NY Fed API'
    };
  } catch (error) {
    console.warn('SOFR fetch failed, using fallback:', error);
    return {
      sourceId: RateSourceId.SOFR,
      name: 'SOFR',
      rate: 460, // 4.60% fallback
      timestamp: Date.now(),
      source: 'Fallback'
    };
  }
}

// ============ Aave USDT Supply Rate Collector ============
export async function collectAaveUSDT(provider: JsonRpcProvider): Promise<RateData> {
  try {
    // Aave API
    const response = await axios.get(
      'https://aave-api-v2.aave.com/data/markets-data',
      { timeout: 10000 }
    );

    const usdtMarket = response.data?.reserves?.find(
      (r: any) => r.symbol === 'USDT'
    );
    const supplyRate = usdtMarket?.liquidityRate || 6.0;
    const supplyRatePercent = parseFloat(supplyRate) * 100 || 6.0;

    return {
      sourceId: RateSourceId.AAVE_USDT,
      name: 'Aave_USDT',
      rate: Math.round(supplyRatePercent),
      timestamp: Date.now(),
      source: 'Aave API'
    };
  } catch (error) {
    console.warn('Aave USDT fetch failed, using fallback:', error);
    return {
      sourceId: RateSourceId.AAVE_USDT,
      name: 'Aave_USDT',
      rate: 600, // 6.00% fallback
      timestamp: Date.now(),
      source: 'Fallback'
    };
  }
}

// ============ Ondo USDY Yield Collector ============
export async function collectOndoUSDY(): Promise<RateData> {
  try {
    // Ondo Finance API (hypothetical)
    const response = await axios.get(
      'https://api.ondo.finance/v1/products/usdy',
      { timeout: 10000 }
    );

    const usdyYield = response.data?.currentYield || 5.0;

    return {
      sourceId: RateSourceId.ONDO_USDY,
      name: 'Ondo_USDY',
      rate: Math.round(usdyYield * 100),
      timestamp: Date.now(),
      source: 'Ondo API'
    };
  } catch (error) {
    console.warn('Ondo USDY fetch failed, using fallback:', error);
    return {
      sourceId: RateSourceId.ONDO_USDY,
      name: 'Ondo_USDY',
      rate: 500, // 5.00% fallback
      timestamp: Date.now(),
      source: 'Fallback'
    };
  }
}

// ============ Collect All Rates ============
export async function collectAllRates(provider: JsonRpcProvider): Promise<RateData[]> {
  console.log('🔄 Collecting rates from all sources...\n');

  const results = await Promise.allSettled([
    collectTESR(),
    collectMETH(provider),
    collectSOFR(provider),
    collectAaveUSDT(provider),
    collectOndoUSDY()
  ]);

  const rates: RateData[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      rates.push(result.value);
      console.log(`✅ ${result.value.name}: ${result.value.rate / 100}% (${result.value.source})`);
    } else {
      console.error(`❌ Failed to collect rate:`, result.reason);
    }
  }

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

  return Math.round(weightedSum / totalWeight);
}

