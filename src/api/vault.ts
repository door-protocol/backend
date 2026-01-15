/**
 * Vault API Routes
 * 
 * Endpoints for vault statistics, TVL information, and rate history.
 * Rate history now uses database for real data with mock fallback.
 */

import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain';
import { db } from '../services/database';

export const vaultRouter = Router();

/**
 * GET /api/vault/stats
 * Get overall vault statistics
 */
vaultRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const stats = await blockchain.getVaultStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching vault stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch vault stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vault/tvl
 * Get Total Value Locked
 */
vaultRouter.get('/tvl', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const tvl = await blockchain.getTVL();
    res.json(tvl);
  } catch (error) {
    console.error('Error fetching TVL:', error);
    res.status(500).json({ 
      error: 'Failed to fetch TVL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vault/apy
 * Get current APY rates
 */
vaultRouter.get('/apy', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const seniorAPY = await blockchain.getSeniorAPY();
    
    // Estimate Junior APY based on Senior rate and typical leverage
    // In production, calculate from actual performance
    const estimatedJuniorAPY = seniorAPY * 3.5; // ~3.5x leverage typical
    
    res.json({
      seniorAPY: seniorAPY,
      juniorAPY: estimatedJuniorAPY,
      juniorAPYRange: [seniorAPY * 2.5, seniorAPY * 5] // Range based on leverage
    });
  } catch (error) {
    console.error('Error fetching APY:', error);
    res.status(500).json({ 
      error: 'Failed to fetch APY',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vault/rates/history
 * Get historical rate data from database
 * Falls back to mock data if database is unavailable
 */
vaultRouter.get('/rates/history', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    
    // Validate period
    if (!['7d', '30d', '90d', '1y'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use: 7d, 30d, 90d, or 1y' });
    }

    // Try to get data from database
    try {
      const dorHistory = await db.getDORHistory(period as '7d' | '30d' | '90d' | '1y');
      
      if (dorHistory.length > 0) {
        // Transform database records to API format
        const data = dorHistory.map(update => {
          // Calculate estimated APYs based on DOR
          const dor = update.dor / 100; // Convert from bps to %
          const seniorAPY = update.seniorTarget / 100;
          
          // Estimate Junior APY using typical leverage
          // Junior gets remaining yield after Senior takes their share
          // Assuming 75/25 split and vault performing at 7%
          const estimatedVaultAPY = dor + 1.5; // Vault typically outperforms DOR by ~1.5%
          const juniorAPY = (estimatedVaultAPY * 4 - seniorAPY * 3); // Leverage effect
          
          return {
            date: update.createdAt.toISOString().split('T')[0],
            timestamp: update.createdAt.toISOString(),
            dor: dor,
            seniorAPY: parseFloat(seniorAPY.toFixed(2)),
            juniorAPY: parseFloat(Math.max(juniorAPY, 0).toFixed(2)),
            vaultAPY: parseFloat(estimatedVaultAPY.toFixed(2)),
            sources: update.rateSnapshots.map(s => ({
              name: s.sourceName,
              rate: s.rate / 100,
              isLive: s.isLive
            }))
          };
        });

        return res.json({ 
          period, 
          data,
          source: 'database',
          count: data.length
        });
      }
    } catch (dbError) {
      console.warn('Database query failed, using mock data:', dbError);
    }

    // Fallback to mock data
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const data = generateMockRateHistory(days);
    
    res.json({ 
      period, 
      data,
      source: 'mock',
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching rate history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rate history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vault/rates/latest
 * Get the latest DOR update
 */
vaultRouter.get('/rates/latest', async (req: Request, res: Response) => {
  try {
    const latest = await db.getLatestDOR();
    
    if (latest) {
      res.json({
        dor: latest.dor / 100,
        seniorTarget: latest.seniorTarget / 100,
        timestamp: latest.createdAt.toISOString(),
        txHash: latest.txHash,
        sources: latest.rateSnapshots.map(s => ({
          name: s.sourceName,
          rate: s.rate / 100,
          source: s.source,
          isLive: s.isLive
        })),
        liveCount: latest.liveSourceCount,
        fallbackCount: latest.fallbackSourceCount
      });
    } else {
      // Return mock data if no DB records
      res.json({
        dor: 4.6,
        seniorTarget: 5.6,
        timestamp: new Date().toISOString(),
        txHash: null,
        sources: [
          { name: 'TESR', rate: 3.5, source: 'Mock', isLive: false },
          { name: 'mETH', rate: 4.5, source: 'Mock', isLive: false },
          { name: 'SOFR', rate: 4.6, source: 'Mock', isLive: false },
          { name: 'Aave_USDT', rate: 5.5, source: 'Mock', isLive: false },
          { name: 'Ondo_USDY', rate: 5.0, source: 'Mock', isLive: false }
        ],
        liveCount: 0,
        fallbackCount: 5,
        source: 'mock'
      });
    }
  } catch (error) {
    console.error('Error fetching latest rates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest rates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vault/rates/source/:sourceId
 * Get rate history for a specific source
 */
vaultRouter.get('/rates/source/:sourceId', async (req: Request, res: Response) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const days = parseInt((req.query.days as string) || '30');
    
    if (isNaN(sourceId) || sourceId < 0 || sourceId > 4) {
      return res.status(400).json({ 
        error: 'Invalid sourceId. Use: 0=TESR, 1=mETH, 2=SOFR, 3=AAVE_USDT, 4=ONDO_USDY' 
      });
    }

    const sourceNames = ['TESR', 'mETH', 'SOFR', 'Aave_USDT', 'Ondo_USDY'];
    
    try {
      const history = await db.getRateHistory(sourceId, days);
      
      if (history.length > 0) {
        return res.json({
          sourceId,
          sourceName: sourceNames[sourceId],
          period: `${days}d`,
          data: history.map(r => ({
            date: r.createdAt.toISOString().split('T')[0],
            timestamp: r.createdAt.toISOString(),
            rate: r.rate / 100,
            source: r.source,
            isLive: r.isLive
          })),
          count: history.length
        });
      }
    } catch (dbError) {
      console.warn('Database query failed:', dbError);
    }

    // Mock fallback
    res.json({
      sourceId,
      sourceName: sourceNames[sourceId],
      period: `${days}d`,
      data: [],
      count: 0,
      source: 'mock'
    });
  } catch (error) {
    console.error('Error fetching source rate history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch source rate history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate mock rate history data
 */
function generateMockRateHistory(days: number) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic mock data with slight variations
    const baseDOR = 4.6;
    const variation = (Math.sin(i / 7) * 0.2) + (Math.random() - 0.5) * 0.1;
    const dor = baseDOR + variation;
    
    const seniorAPY = dor + 1; // DOR + 1% premium
    const vaultAPY = dor + 1.5;
    const juniorAPY = vaultAPY * 4 - seniorAPY * 3; // Leverage effect
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.toISOString(),
      dor: parseFloat(dor.toFixed(2)),
      seniorAPY: parseFloat(seniorAPY.toFixed(2)),
      juniorAPY: parseFloat(Math.max(juniorAPY, 0).toFixed(2)),
      vaultAPY: parseFloat(vaultAPY.toFixed(2))
    });
  }
  
  return data;
}

