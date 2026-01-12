/**
 * DOOR Rate Oracle - Backend Service
 * 
 * Main entry point for the rate oracle backend.
 * Collects rates from multiple sources and pushes to the DOORRateOracle contract.
 * 
 * Usage:
 *   npm run oracle           - Run once (collect and push)
 *   npm run oracle:dry       - Dry run (no actual transaction)
 */

import * as dotenv from 'dotenv';
import { JsonRpcProvider } from 'ethers';
import * as cron from 'node-cron';

import { collectAllRates, calculateDOR } from './collectors';
import { RatePusher, generateReport } from './pusher';

dotenv.config();

// ============ Configuration ============
const config = {
  // RPC URLs
  rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz',
  
  // Private key for signing transactions
  privateKey: process.env.PRIVATE_KEY || '',
  
  // DOORRateOracle contract address
  oracleAddress: process.env.ORACLE_ADDRESS || '',
  
  // Update interval (cron expression: every 6 hours)
  cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *',
  
  // Use signature-based updates
  useSignature: process.env.USE_SIGNATURE === 'true'
};

// ============ Main Functions ============

/**
 * Run a single update cycle
 */
async function runUpdate(dryRun: boolean = false): Promise<void> {
  console.log('\n🚀 DOOR Rate Oracle Update Starting...\n');
  console.log(`Network: ${config.rpcUrl}`);
  console.log(`Oracle: ${config.oracleAddress}`);
  console.log(`Mode: ${dryRun ? 'Dry Run' : 'Live'}\n`);

  try {
    // Create provider
    const provider = new JsonRpcProvider(config.rpcUrl);

    // Collect rates from all sources
    const rates = await collectAllRates(provider);

    if (rates.length === 0) {
      console.error('❌ No rates collected. Aborting.');
      return;
    }

    // Calculate DOR
    const dor = calculateDOR(rates);
    console.log(`\n📊 Calculated DOR: ${dor / 100}%`);

    // Generate report
    console.log('\n' + generateReport(rates, dor));

    if (dryRun) {
      // Dry run mode - just show what would happen
      if (config.oracleAddress && config.privateKey) {
        const pusher = new RatePusher(config);
        await pusher.dryRun(rates);
      } else {
        console.log('\n⚠️  Oracle address or private key not set. Cannot simulate.');
      }
    } else {
      // Live mode - actually push to contract
      if (!config.oracleAddress) {
        console.error('❌ ORACLE_ADDRESS not set');
        return;
      }
      if (!config.privateKey) {
        console.error('❌ PRIVATE_KEY not set');
        return;
      }

      const pusher = new RatePusher(config);
      
      // Check authorization
      const isAuth = await pusher.isAuthorized();
      if (!isAuth) {
        console.error('❌ Wallet is not authorized to update rates');
        return;
      }

      // Push update
      const result = await pusher.fullUpdate(rates);

      console.log('\n✅ Update Complete!');
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   DOR: ${result.oldDOR / 100}% → ${result.newDOR / 100}%`);
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  }
}

/**
 * Run as cron job
 */
function runCron(): void {
  console.log(`\n⏰ Starting cron scheduler: ${config.cronSchedule}`);
  console.log('   (Every 6 hours by default)\n');

  // Run immediately on start
  runUpdate(false).catch(console.error);

  // Schedule periodic updates
  cron.schedule(config.cronSchedule, () => {
    console.log(`\n⏰ Scheduled update triggered at ${new Date().toISOString()}`);
    runUpdate(false).catch(console.error);
  });

  console.log('Press Ctrl+C to stop.\n');
}

// ============ CLI Entry Point ============
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
DOOR Rate Oracle Backend

Usage:
  npm run oracle               Run once (collect and push)
  npm run oracle -- --dry      Dry run (no transaction)
  npm run oracle -- --cron     Run as cron job (every 6 hours)

Environment Variables:
  RPC_URL           RPC endpoint (default: Mantle Sepolia)
  PRIVATE_KEY       Private key for signing
  ORACLE_ADDRESS    DOORRateOracle contract address
  CRON_SCHEDULE     Cron schedule (default: every 6 hours)
  USE_SIGNATURE     Use signature-based updates (true/false)
`);
} else if (args.includes('--cron')) {
  runCron();
} else if (args.includes('--dry')) {
  runUpdate(true).catch(console.error);
} else {
  runUpdate(false).catch(console.error);
}

