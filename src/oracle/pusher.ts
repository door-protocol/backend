/**
 * DOOR Rate Oracle - Rate Pusher
 * 
 * Pushes collected rates to the DOORRateOracle contract
 */

import { ethers, Wallet, JsonRpcProvider, Contract } from 'ethers';
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

export interface PushConfig {
  rpcUrl: string;
  privateKey: string;
  oracleAddress: string;
  useSignature?: boolean;
}

export class RatePusher {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private config: PushConfig;

  constructor(config: PushConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.contract = new Contract(config.oracleAddress, DOOR_ORACLE_ABI, this.wallet);
  }

  async isAuthorized(): Promise<boolean> {
    return await this.contract.authorizedUpdaters(this.wallet.address);
  }

  async getCurrentDOR(): Promise<number> {
    return Number(await this.contract.getDOR());
  }

  async getAllSources(): Promise<any[]> {
    return await this.contract.getAllRateSources();
  }

  async pushBatchRates(rates: RateData[]): Promise<string> {
    console.log(`📤 Pushing ${rates.length} rates in batch...`);

    const sourceIds = rates.map(r => r.sourceId);
    const newRates = rates.map(r => r.rate);

    const tx = await this.contract.batchUpdateRates(sourceIds, newRates);
    await tx.wait();

    console.log(`✅ Batch update complete. TX: ${tx.hash}`);
    return tx.hash;
  }

  async fullUpdate(rates: RateData[]): Promise<{
    txHash: string;
    oldDOR: number;
    newDOR: number;
    localDOR: number;
  }> {
    const oldDOR = await this.getCurrentDOR();
    console.log(`📊 Current DOR: ${oldDOR / 100}%`);

    const localDOR = calculateDOR(rates);
    console.log(`📊 Expected DOR: ${localDOR / 100}%`);

    const txHash = await this.pushBatchRates(rates);

    const newDOR = await this.getCurrentDOR();
    console.log(`📊 New DOR: ${newDOR / 100}%`);

    return { txHash, oldDOR, newDOR, localDOR };
  }

  async dryRun(rates: RateData[]): Promise<void> {
    console.log('\n🔍 Dry Run Mode - No actual transaction will be sent\n');

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
      const change = rate.rate - Number(current.rate);
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      console.log(`  ${rate.name}: ${Number(current.rate) / 100}% ${arrow} ${rate.rate / 100}%`);
    }

    console.log(`\nDOR Change: ${currentDOR / 100}% → ${newDOR / 100}%`);
    console.log(`  Delta: ${(newDOR - currentDOR) / 100}%`);
  }
}

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

  for (const rate of rates) {
    lines.push(`  ${rate.name.padEnd(12)} ${formatRate(rate.rate).padStart(7)}  (${rate.source})`);
  }

  lines.push('─────────────────────────────────────────');
  lines.push(`  DOR (Weighted)  ${formatRate(dor).padStart(7)}`);
  lines.push(`  Senior Target   ${formatRate(dor + 100).padStart(7)}  (DOR + 1%)`);
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

