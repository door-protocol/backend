/**
 * DOOR Protocol Backend API Server
 * 
 * Main entry point for the demo backend.
 * Provides REST APIs for vault stats, user positions, and epoch data.
 */

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import { vaultRouter } from './api/vault';
import { userRouter } from './api/user';
import { epochRouter } from './api/epoch';
import { adminRouter } from './api/admin';
import { BlockchainService } from './services/blockchain';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize blockchain service
const blockchainService = new BlockchainService();

// Make blockchain service available to routes
app.locals.blockchain = blockchainService;

// API Routes
app.use('/api/vault', vaultRouter);
app.use('/api/user', userRouter);
app.use('/api/epoch', epochRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: process.env.RPC_URL || 'not configured'
  });
});

// Contract addresses endpoint
app.get('/api/contracts', (req, res) => {
  res.json({
    usdc: process.env.USDC_ADDRESS || '',
    seniorVault: process.env.SENIOR_VAULT_ADDRESS || '',
    juniorVault: process.env.JUNIOR_VAULT_ADDRESS || '',
    coreVault: process.env.CORE_VAULT_ADDRESS || '',
    epochManager: process.env.EPOCH_MANAGER_ADDRESS || '',
    safetyModule: process.env.SAFETY_MODULE_ADDRESS || '',
    network: blockchainService.getNetworkName()
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     🚪 DOOR Protocol Backend API Server       ║
  ╠═══════════════════════════════════════════════╣
  ║  Port: ${String(PORT).padEnd(39)}║
  ║  Network: ${(process.env.RPC_URL || 'Not configured').substring(0, 35).padEnd(35)}║
  ╚═══════════════════════════════════════════════╝
  
  Endpoints:
    GET  /api/health          - Health check
    GET  /api/contracts       - Contract addresses
    GET  /api/vault/stats     - Vault statistics
    GET  /api/vault/tvl       - Total Value Locked
    GET  /api/user/:address   - User position
    GET  /api/epoch/current   - Current epoch info
    POST /api/admin/deploy    - Deploy to strategy
    POST /api/admin/harvest   - Trigger harvest
  `);
});

