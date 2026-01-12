/**
 * Epoch API Routes
 * 
 * Endpoints for epoch information and status.
 */

import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain';

export const epochRouter = Router();

/**
 * GET /api/epoch/current
 * Get current epoch information
 */
epochRouter.get('/current', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const epoch = await blockchain.getCurrentEpoch();
    res.json(epoch);
  } catch (error) {
    console.error('Error fetching current epoch:', error);
    res.status(500).json({ 
      error: 'Failed to fetch current epoch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/epoch/status
 * Get simplified epoch status for UI display
 */
epochRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const epoch = await blockchain.getCurrentEpoch();
    
    // Determine current phase
    let phase: 'OPEN' | 'LOCKED' | 'SETTLED' = 'OPEN';
    if (epoch.settled) {
      phase = 'SETTLED';
    } else if (epoch.timeUntilNextEpoch <= 0) {
      phase = 'LOCKED';
    }
    
    res.json({
      epochId: epoch.epochId,
      phase,
      timeRemaining: epoch.timeUntilNextEpochFormatted,
      timeRemainingSeconds: epoch.timeUntilNextEpoch,
      canDeposit: phase === 'OPEN',
      canWithdraw: phase === 'SETTLED'
    });
  } catch (error) {
    console.error('Error fetching epoch status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch epoch status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

