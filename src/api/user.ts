/**
 * User API Routes
 * 
 * Endpoints for user position and portfolio information.
 */

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { BlockchainService } from '../services/blockchain';

export const userRouter = Router();

/**
 * GET /api/user/:address
 * Get user's complete position information
 */
userRouter.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Validate address
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const position = await blockchain.getUserPosition(address);
    
    res.json(position);
  } catch (error) {
    console.error('Error fetching user position:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user position',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user/:address/balance/:token
 * Get user's token balance
 */
userRouter.get('/:address/balance/:token', async (req: Request, res: Response) => {
  try {
    const { address, token } = req.params;
    
    if (!ethers.isAddress(address) || !ethers.isAddress(token)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const balance = await blockchain.getTokenBalance(token, address);
    
    res.json({ 
      address,
      token,
      balance 
    });
  } catch (error) {
    console.error('Error fetching token balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

