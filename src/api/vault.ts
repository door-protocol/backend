/**
 * Vault API Routes
 * 
 * Endpoints for vault statistics and TVL information.
 */

import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain';

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
 * Get historical rate data (mock for demo)
 */
vaultRouter.get('/rates/history', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 7;
    
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate realistic mock data
      const baseSeniorAPY = 5.0;
      const baseJuniorAPY = 17.5;
      
      data.push({
        date: date.toISOString().split('T')[0],
        seniorAPY: baseSeniorAPY + (Math.random() - 0.5) * 0.3,
        juniorAPY: baseJuniorAPY + (Math.random() - 0.5) * 3,
        vaultAPY: 7.0 + (Math.random() - 0.5) * 1
      });
    }
    
    res.json({ period, data });
  } catch (error) {
    console.error('Error fetching rate history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rate history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

