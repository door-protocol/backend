/**
 * Admin API Routes
 * 
 * Endpoints for admin/keeper operations (demo purposes).
 * In production, these would require authentication.
 */

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { BlockchainService } from '../services/blockchain';

export const adminRouter = Router();

/**
 * POST /api/admin/harvest
 * Trigger yield harvest from strategy
 */
adminRouter.post('/harvest', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.harvest();
    
    res.json({ 
      success: true,
      message: 'Harvest completed',
      txHash 
    });
  } catch (error) {
    console.error('Error during harvest:', error);
    res.status(500).json({ 
      error: 'Failed to harvest',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/processEpoch
 * Process current epoch and start new one
 */
adminRouter.post('/processEpoch', async (req: Request, res: Response) => {
  try {
    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.processEpoch();
    
    res.json({ 
      success: true,
      message: 'Epoch processed',
      txHash 
    });
  } catch (error) {
    console.error('Error processing epoch:', error);
    res.status(500).json({ 
      error: 'Failed to process epoch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/deploy
 * Deploy funds to strategy
 */
adminRouter.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.deployToStrategy(amount);
    
    res.json({ 
      success: true,
      message: `Deployed ${amount} USDC to strategy`,
      txHash 
    });
  } catch (error) {
    console.error('Error deploying to strategy:', error);
    res.status(500).json({ 
      error: 'Failed to deploy to strategy',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/mint
 * Mint test tokens (for demo)
 */
adminRouter.post('/mint', async (req: Request, res: Response) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.mintTestTokens(address, amount);
    
    res.json({ 
      success: true,
      message: `Minted ${amount} USDC to ${address}`,
      txHash 
    });
  } catch (error) {
    console.error('Error minting tokens:', error);
    res.status(500).json({ 
      error: 'Failed to mint tokens',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/deposit/senior
 * Deposit to Senior vault (for demo)
 */
adminRouter.post('/deposit/senior', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.depositToSenior(amount);
    
    res.json({ 
      success: true,
      message: `Deposited ${amount} USDC to Senior vault`,
      txHash 
    });
  } catch (error) {
    console.error('Error depositing to Senior:', error);
    res.status(500).json({ 
      error: 'Failed to deposit to Senior',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/deposit/junior
 * Deposit to Junior vault (for demo)
 */
adminRouter.post('/deposit/junior', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.depositToJunior(amount);
    
    res.json({ 
      success: true,
      message: `Deposited ${amount} USDC to Junior vault`,
      txHash 
    });
  } catch (error) {
    console.error('Error depositing to Junior:', error);
    res.status(500).json({ 
      error: 'Failed to deposit to Junior',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/withdraw/senior
 * Withdraw from Senior vault (for demo)
 */
adminRouter.post('/withdraw/senior', async (req: Request, res: Response) => {
  try {
    const { shares } = req.body;
    
    if (!shares || isNaN(Number(shares))) {
      return res.status(400).json({ error: 'Invalid shares amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.withdrawFromSenior(shares);
    
    res.json({ 
      success: true,
      message: `Withdrew ${shares} shares from Senior vault`,
      txHash 
    });
  } catch (error) {
    console.error('Error withdrawing from Senior:', error);
    res.status(500).json({ 
      error: 'Failed to withdraw from Senior',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/withdraw/junior
 * Withdraw from Junior vault (for demo)
 */
adminRouter.post('/withdraw/junior', async (req: Request, res: Response) => {
  try {
    const { shares } = req.body;
    
    if (!shares || isNaN(Number(shares))) {
      return res.status(400).json({ error: 'Invalid shares amount' });
    }

    const blockchain: BlockchainService = req.app.locals.blockchain;
    const txHash = await blockchain.withdrawFromJunior(shares);
    
    res.json({ 
      success: true,
      message: `Withdrew ${shares} shares from Junior vault`,
      txHash 
    });
  } catch (error) {
    console.error('Error withdrawing from Junior:', error);
    res.status(500).json({ 
      error: 'Failed to withdraw from Junior',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

