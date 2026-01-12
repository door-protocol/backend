/**
 * Blockchain Service
 * 
 * Handles all blockchain interactions for the DOOR Protocol backend.
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import * as dotenv from 'dotenv';
import { CORE_VAULT_ABI, SENIOR_VAULT_ABI, JUNIOR_VAULT_ABI, EPOCH_MANAGER_ABI, ERC20_ABI } from './abis';

dotenv.config();

export class BlockchainService {
  private provider: JsonRpcProvider;
  private wallet: Wallet | null = null;
  
  // Contract instances
  private coreVault: Contract | null = null;
  private seniorVault: Contract | null = null;
  private juniorVault: Contract | null = null;
  private epochManager: Contract | null = null;
  private usdc: Contract | null = null;

  constructor() {
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
    this.provider = new JsonRpcProvider(rpcUrl);
    
    if (process.env.PRIVATE_KEY) {
      this.wallet = new Wallet(process.env.PRIVATE_KEY, this.provider);
    }

    this.initContracts();
  }

  private initContracts() {
    const coreVaultAddr = process.env.CORE_VAULT_ADDRESS;
    const seniorVaultAddr = process.env.SENIOR_VAULT_ADDRESS;
    const juniorVaultAddr = process.env.JUNIOR_VAULT_ADDRESS;
    const epochManagerAddr = process.env.EPOCH_MANAGER_ADDRESS;
    const usdcAddr = process.env.USDC_ADDRESS;

    const signer = this.wallet || this.provider;

    if (coreVaultAddr && coreVaultAddr !== '') {
      this.coreVault = new Contract(coreVaultAddr, CORE_VAULT_ABI, signer);
    }
    if (seniorVaultAddr && seniorVaultAddr !== '') {
      this.seniorVault = new Contract(seniorVaultAddr, SENIOR_VAULT_ABI, signer);
    }
    if (juniorVaultAddr && juniorVaultAddr !== '') {
      this.juniorVault = new Contract(juniorVaultAddr, JUNIOR_VAULT_ABI, signer);
    }
    if (epochManagerAddr && epochManagerAddr !== '') {
      this.epochManager = new Contract(epochManagerAddr, EPOCH_MANAGER_ABI, signer);
    }
    if (usdcAddr && usdcAddr !== '') {
      this.usdc = new Contract(usdcAddr, ERC20_ABI, signer);
    }
  }

  getNetworkName(): string {
    const rpcUrl = process.env.RPC_URL || '';
    if (rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost')) {
      return 'Anvil (Local)';
    } else if (rpcUrl.includes('sepolia.mantle')) {
      return 'Mantle Sepolia Testnet';
    } else if (rpcUrl.includes('mantle')) {
      return 'Mantle Mainnet';
    }
    return 'Unknown Network';
  }

  // ============ Vault Stats ============

  async getVaultStats() {
    if (!this.coreVault) {
      throw new Error('CoreVault not configured');
    }

    const stats = await this.coreVault.getStats();
    
    return {
      seniorPrincipal: ethers.formatUnits(stats._seniorPrincipal, 6),
      juniorPrincipal: ethers.formatUnits(stats._juniorPrincipal, 6),
      totalAssets: ethers.formatUnits(stats.totalAssets, 6),
      seniorFixedRate: Number(stats.currentSeniorRate) / 100, // bps to %
      juniorRatio: Number(stats.juniorRatio) / 100, // bps to %
      isHealthy: stats.isHealthy
    };
  }

  async getTVL() {
    if (!this.seniorVault || !this.juniorVault) {
      throw new Error('Vaults not configured');
    }

    const seniorTVL = await this.seniorVault.totalAssets();
    const juniorTVL = await this.juniorVault.totalAssets();
    const total = seniorTVL + juniorTVL;

    return {
      seniorTVL: ethers.formatUnits(seniorTVL, 6),
      juniorTVL: ethers.formatUnits(juniorTVL, 6),
      totalTVL: ethers.formatUnits(total, 6)
    };
  }

  async getSeniorAPY(): Promise<number> {
    if (!this.seniorVault) {
      throw new Error('SeniorVault not configured');
    }
    const apy = await this.seniorVault.currentAPY();
    return Number(apy) / 100; // bps to %
  }

  // ============ User Position ============

  async getUserPosition(userAddress: string) {
    if (!this.seniorVault || !this.juniorVault) {
      throw new Error('Vaults not configured');
    }

    // Get share balances
    const seniorShares = await this.seniorVault.balanceOf(userAddress);
    const juniorShares = await this.juniorVault.balanceOf(userAddress);

    // Convert shares to assets
    const seniorAssets = seniorShares > 0n 
      ? await this.seniorVault.previewRedeem(seniorShares)
      : 0n;
    const juniorAssets = juniorShares > 0n 
      ? await this.juniorVault.previewRedeem(juniorShares)
      : 0n;

    // Get principal amounts (assuming 1:1 for demo)
    const seniorPrincipal = seniorShares;
    const juniorPrincipal = juniorShares;

    // Calculate yield
    const seniorYield = seniorAssets - seniorPrincipal;
    const juniorYield = juniorAssets - juniorPrincipal;

    return {
      address: userAddress,
      senior: {
        shares: ethers.formatUnits(seniorShares, 6),
        assets: ethers.formatUnits(seniorAssets, 6),
        principal: ethers.formatUnits(seniorPrincipal, 6),
        yield: ethers.formatUnits(seniorYield > 0n ? seniorYield : 0n, 6)
      },
      junior: {
        shares: ethers.formatUnits(juniorShares, 6),
        assets: ethers.formatUnits(juniorAssets, 6),
        principal: ethers.formatUnits(juniorPrincipal, 6),
        yield: ethers.formatUnits(juniorYield > 0n ? juniorYield : 0n, 6)
      },
      totalAssets: ethers.formatUnits(seniorAssets + juniorAssets, 6)
    };
  }

  // ============ Epoch ============

  async getCurrentEpoch() {
    if (!this.epochManager) {
      throw new Error('EpochManager not configured');
    }

    const epochId = await this.epochManager.currentEpochId();
    const epoch = await this.epochManager.getEpoch(epochId);
    const timeUntilNext = await this.epochManager.timeUntilNextEpoch();

    return {
      epochId: Number(epochId),
      startTime: Number(epoch.startTime),
      endTime: Number(epoch.endTime),
      totalDeposits: ethers.formatUnits(epoch.totalDeposits, 6),
      totalWithdrawRequests: ethers.formatUnits(epoch.totalWithdrawRequests, 6),
      settled: epoch.settled,
      timeUntilNextEpoch: Number(timeUntilNext),
      timeUntilNextEpochFormatted: this.formatDuration(Number(timeUntilNext))
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds <= 0) return 'Epoch ended';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  // ============ Admin Functions ============

  async harvest(): Promise<string> {
    if (!this.coreVault || !this.wallet) {
      throw new Error('CoreVault or wallet not configured');
    }

    const tx = await this.coreVault.harvest();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async processEpoch(): Promise<string> {
    if (!this.epochManager || !this.wallet) {
      throw new Error('EpochManager or wallet not configured');
    }

    const tx = await this.epochManager.processEpoch();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async deployToStrategy(amount: string): Promise<string> {
    if (!this.coreVault || !this.wallet) {
      throw new Error('CoreVault or wallet not configured');
    }

    const amountWei = ethers.parseUnits(amount, 6);
    const tx = await this.coreVault.deployToStrategy(amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ============ Token Operations ============

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const balance = await token.balanceOf(userAddress);
    const decimals = await token.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  async mintTestTokens(userAddress: string, amount: string): Promise<string> {
    if (!this.usdc || !this.wallet) {
      throw new Error('USDC or wallet not configured');
    }

    // This only works with MockUSDC that has a mint function
    const amountWei = ethers.parseUnits(amount, 6);
    const tx = await this.usdc.mint(userAddress, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ============ Approve Tokens ============

  async approveToken(spender: string, amount: string): Promise<string> {
    if (!this.usdc || !this.wallet) {
      throw new Error('USDC or wallet not configured');
    }

    const amountWei = ethers.parseUnits(amount, 6);
    const tx = await this.usdc.approve(spender, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ============ Deposit / Withdraw ============

  async depositToSenior(amount: string): Promise<string> {
    if (!this.seniorVault || !this.usdc || !this.wallet) {
      throw new Error('Vaults not configured');
    }

    const amountWei = ethers.parseUnits(amount, 6);
    
    // Approve USDC first
    const approveTx = await this.usdc.approve(await this.seniorVault.getAddress(), amountWei);
    await approveTx.wait();

    // Deposit
    const tx = await this.seniorVault.deposit(amountWei, await this.wallet.getAddress());
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async depositToJunior(amount: string): Promise<string> {
    if (!this.juniorVault || !this.usdc || !this.wallet) {
      throw new Error('Vaults not configured');
    }

    const amountWei = ethers.parseUnits(amount, 6);
    
    // Approve USDC first
    const approveTx = await this.usdc.approve(await this.juniorVault.getAddress(), amountWei);
    await approveTx.wait();

    // Deposit
    const tx = await this.juniorVault.deposit(amountWei, await this.wallet.getAddress());
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async withdrawFromSenior(shares: string): Promise<string> {
    if (!this.seniorVault || !this.wallet) {
      throw new Error('SeniorVault not configured');
    }

    const sharesWei = ethers.parseUnits(shares, 6);
    const walletAddress = await this.wallet.getAddress();
    const tx = await this.seniorVault.redeem(sharesWei, walletAddress, walletAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async withdrawFromJunior(shares: string): Promise<string> {
    if (!this.juniorVault || !this.wallet) {
      throw new Error('JuniorVault not configured');
    }

    const sharesWei = ethers.parseUnits(shares, 6);
    const walletAddress = await this.wallet.getAddress();
    const tx = await this.juniorVault.redeem(sharesWei, walletAddress, walletAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}

