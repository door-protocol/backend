/**
 * DOOR Rate Oracle - Backend Service
 * 
 * Main entry point for the rate oracle backend.
 * Collects rates from multiple sources and pushes to the DOORRateOracle contract.
 * 
 * Enhanced with:
 * - Database storage for rate history
 * - Circuit breaker integration
 * - Detailed logging
 * 
 * Usage:
 *   npm run oracle               - Run once (collect and push)
 *   npm run oracle -- --dry      - Dry run (no transaction)
 *   npm run oracle -- --cron     - Run as cron job (every 6 hours)
 */

import * as dotenv from 'dotenv';
import { JsonRpcProvider } from 'ethers';
import * as cron from 'node-cron';

import { collectAllRates, calculateDOR, validateRates, RateData } from './collectors';
import { RatePusher, generateReport, PushResult } from './pusher';
import { db } from '../services/database';

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
  useSignature: process.env.USE_SIGNATURE === 'true',
  
  // Database enabled
  useDatabase: process.env.USE_DATABASE !== 'false'
};

// ============ Database Integration ============

/**
 * Save rate update to database
 */
async function saveToDatabase(
  rates: RateData[],
  dor: number,
  result?: PushResult,
  error?: Error
): Promise<void> {
  if (!config.useDatabase) {
    console.log('📦 Database storage disabled');
    return;
  }

  try {
    const seniorTarget = dor + 100; // DOR + 1%
    
    await db.saveDORUpdate({
      dor,
      seniorTarget,
      txHash: result?.txHash || null,
      blockNumber: result?.blockNumber || null,
      gasUsed: result?.gasUsed || null,
      success: !error && !!result,
      errorMessage: error?.message || null,
      rates: rates.map(r => ({
        sourceId: r.sourceId,
        sourceName: r.name,
        rate: r.rate,
        source: r.source,
        isLive: r.isLive
      }))
    });

    console.log('📦 Rate update saved to database');

    // Log the event
    await db.log(
      error ? 'ERROR' : 'INFO',
      'oracle',
      error ? `Oracle update failed: ${error.message}` : `Oracle updated successfully, DOR: ${dor / 100}%`,
      {
        dor,
        rates: rates.map(r => ({ name: r.name, rate: r.rate, isLive: r.isLive })),
        txHash: result?.txHash
      }
    );
  } catch (dbError) {
    console.error('📦 Failed to save to database:', dbError);
    // Don't throw - DB failure shouldn't stop the oracle
  }
}

// ============ Main Functions ============

/**
 * Run a single update cycle
 */
async function runUpdate(dryRun: boolean = false): Promise<void> {
  console.log('\n🚀 DOOR Rate Oracle Update Starting...\n');
  console.log(`Network: ${config.rpcUrl}`);
  console.log(`Oracle: ${config.oracleAddress}`);
  console.log(`Mode: ${dryRun ? 'Dry Run' : 'Live'}`);
  console.log(`Database: ${config.useDatabase ? 'Enabled' : 'Disabled'}\n`);

  let rates: RateData[] = [];
  let dor = 0;
  let pushResult: PushResult | undefined;
  let updateError: Error | undefined;

  try {
    // Create provider
    const provider = new JsonRpcProvider(config.rpcUrl);

    // Collect rates from all sources
    rates = await collectAllRates(provider);

    if (rates.length === 0) {
      throw new Error('No rates collected');
    }

    // Validate rates
    const validation = validateRates(rates);
    if (!validation.isValid) {
      console.error('❌ Rate validation failed:');
      validation.errors.forEach(e => console.error(`   - ${e}`));
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:');
      validation.warnings.forEach(w => console.warn(`   - ${w}`));
    }

    // Calculate DOR
    dor = calculateDOR(rates);
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
        throw new Error('ORACLE_ADDRESS not set');
      }
      if (!config.privateKey) {
        throw new Error('PRIVATE_KEY not set');
      }

      const pusher = new RatePusher(config);
      
      // Check circuit breaker status
      console.log(`🔌 Circuit breaker: ${pusher.getCircuitBreakerState()}`);
      
      // Check authorization
      const isAuth = await pusher.isAuthorized();
      if (!isAuth) {
        throw new Error('Wallet is not authorized to update rates');
      }

      // Push update
      pushResult = await pusher.fullUpdate(rates);

      console.log('\n✅ Update Complete!');
      console.log(`   TX Hash: ${pushResult.txHash}`);
      console.log(`   Block: ${pushResult.blockNumber}`);
      console.log(`   Gas Used: ${pushResult.gasUsed}`);
      console.log(`   DOR: ${pushResult.oldDOR / 100}% → ${pushResult.newDOR / 100}%`);
    }

  } catch (error) {
    updateError = error as Error;
    console.error('❌ Update failed:', updateError.message);
    
    // Log error to database
    if (config.useDatabase && rates.length > 0) {
      await db.log('ERROR', 'oracle', `Update failed: ${updateError.message}`, {
        error: updateError.message,
        stack: updateError.stack
      });
    }
    
    throw error;
  } finally {
    // Save to database (both success and failure)
    if (!dryRun && rates.length > 0) {
      await saveToDatabase(rates, dor, pushResult, updateError);
    }
  }
}

/**
 * Run as cron job
 */
async function runCron(): Promise<void> {
  console.log(`\n⏰ Starting cron scheduler: ${config.cronSchedule}`);
  console.log('   (Every 6 hours by default)\n');

  // Connect to database if enabled
  if (config.useDatabase) {
    try {
      await db.connect();
    } catch (error) {
      console.error('📦 Database connection failed:', error);
      console.log('   Continuing without database...');
    }
  }

  // Run immediately on start
  try {
    await runUpdate(false);
  } catch (error) {
    console.error('Initial update failed:', error);
  }

  // Schedule periodic updates
  cron.schedule(config.cronSchedule, async () => {
    console.log(`\n⏰ Scheduled update triggered at ${new Date().toISOString()}`);
    try {
      await runUpdate(false);
    } catch (error) {
      console.error('Scheduled update failed:', error);
    }
  });

  console.log('Press Ctrl+C to stop.\n');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (config.useDatabase) {
      await db.disconnect();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    if (config.useDatabase) {
      await db.disconnect();
    }
    process.exit(0);
  });
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
  USE_DATABASE      Enable database storage (default: true)
  DATABASE_URL      PostgreSQL connection string
`);
} else if (args.includes('--cron')) {
  runCron().catch(console.error);
} else if (args.includes('--dry')) {
  runUpdate(true).catch(console.error);
} else {
  runUpdate(false).catch(console.error);
}

export { runUpdate, runCron };
