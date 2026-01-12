/**
 * Contract ABIs for DOOR Protocol (TerraBond)
 * 
 * Minimal ABIs for backend operations
 */

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  // MockUSDC specific
  'function mint(address to, uint256 amount)'
];

export const CORE_VAULT_ABI = [
  // View functions
  'function ASSET() view returns (address)',
  'function SENIOR_VAULT() view returns (address)',
  'function JUNIOR_VAULT() view returns (address)',
  'function seniorPrincipal() view returns (uint256)',
  'function juniorPrincipal() view returns (uint256)',
  'function seniorFixedRate() view returns (uint256)',
  'function baseRate() view returns (uint256)',
  'function minRate() view returns (uint256)',
  'function minJuniorRatio() view returns (uint256)',
  'function lastHarvestTime() view returns (uint256)',
  'function emergencyMode() view returns (bool)',
  'function initialized() view returns (bool)',
  'function getStats() view returns (uint256 _seniorPrincipal, uint256 _juniorPrincipal, uint256 totalAssets, uint256 currentSeniorRate, uint256 juniorRatio, bool isHealthy)',
  'function seniorVault() view returns (address)',
  'function juniorVault() view returns (address)',
  'function expectedSeniorYield(uint256 timeElapsed) view returns (uint256)',
  'function juniorLeverage() view returns (uint256)',
  
  // State changing functions
  'function initialize(address strategy_)',
  'function harvest()',
  'function deployToStrategy(uint256 amount)',
  'function withdrawFromStrategy(uint256 amount)',
  'function setBaseRate(uint256 newBaseRate)',
  'function setMinRate(uint256 newMinRate)',
  'function disableEmergencyMode()',
  'function emergencyWithdraw()',

  // Events
  'event PrincipalRegistered(bool isSenior, uint256 amount)',
  'event PrincipalDeregistered(bool isSenior, uint256 amount)',
  'event YieldHarvested(uint256 totalYield, uint256 seniorYield, uint256 juniorYield, uint256 juniorSlash)',
  'event FixedRateAdjusted(uint256 oldRate, uint256 newRate)',
  'event EmergencyModeActivated(string reason)'
];

export const SENIOR_VAULT_ABI = [
  // ERC4626 standard
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewMint(uint256 shares) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function maxMint(address) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function maxRedeem(address owner) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function mint(uint256 shares, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Senior specific
  'function coreVault() view returns (address)',
  'function totalPrincipal() view returns (uint256)',
  'function fixedRate() view returns (uint256)',
  'function accumulatedYield() view returns (uint256)',
  'function initialized() view returns (bool)',
  'function currentAPY() view returns (uint256)',
  'function expectedAnnualYield(uint256 principal) view returns (uint256)',
  'function initialize(address coreVault_)',
  'function addYield(uint256 amount)',
  'function setFixedRate(uint256 newRate)',

  // Events
  'event CoreVaultSet(address indexed coreVault)',
  'event YieldAdded(uint256 amount)',
  'event FixedRateUpdated(uint256 oldRate, uint256 newRate)'
];

export const JUNIOR_VAULT_ABI = [
  // ERC4626 standard (same as Senior)
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewMint(uint256 shares) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function maxDeposit(address) view returns (uint256)',
  'function maxMint(address) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function maxRedeem(address owner) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function mint(uint256 shares, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Junior specific
  'function coreVault() view returns (address)',
  'function totalPrincipal() view returns (uint256)',
  'function slashDeficit() view returns (uint256)',
  'function accumulatedYield() view returns (uint256)',
  'function initialized() view returns (bool)',
  'function effectiveTotalAssets() view returns (uint256)',
  'function estimatedAPY() view returns (uint256)',
  'function leverageFactor(uint256 seniorPrincipal) view returns (uint256)',
  'function isHealthy() view returns (bool)',
  'function initialize(address coreVault_)',
  'function addYield(uint256 amount)',
  'function slashPrincipal(uint256 amount) returns (uint256)',

  // Events
  'event CoreVaultSet(address indexed coreVault)',
  'event YieldAdded(uint256 amount)',
  'event PrincipalSlashed(uint256 amount, uint256 newDeficit)',
  'event DeficitRecovered(uint256 amount)'
];

export const EPOCH_MANAGER_ABI = [
  // View functions
  'function ASSET() view returns (address)',
  'function CORE_VAULT() view returns (address)',
  'function SENIOR_VAULT() view returns (address)',
  'function JUNIOR_VAULT() view returns (address)',
  'function epochDuration() view returns (uint256)',
  'function earlyWithdrawPenalty() view returns (uint256)',
  'function currentEpochId() view returns (uint256)',
  'function accumulatedPenalties() view returns (uint256)',
  'function initialized() view returns (bool)',
  'function getEpoch(uint256 epochId) view returns (tuple(uint256 startTime, uint256 endTime, uint256 totalDeposits, uint256 totalWithdrawRequests, bool settled))',
  'function timeUntilNextEpoch() view returns (uint256)',
  'function getUserWithdrawRequests(address user) view returns (tuple(address user, bool isSenior, uint256 shares, uint256 epochId, bool processed)[])',
  'function pendingWithdrawalsCount() view returns (uint256)',
  'function calculatePenalty(bool isSenior, uint256 shares) view returns (uint256)',
  
  // State changing functions
  'function initialize()',
  'function requestWithdraw(bool isSenior, uint256 shares)',
  'function earlyWithdraw(bool isSenior, uint256 shares) returns (uint256)',
  'function processEpoch()',
  'function setEpochDuration(uint256 newDuration)',
  'function setEarlyWithdrawPenalty(uint256 newPenalty)',

  // Events
  'event EpochStarted(uint256 indexed epochId, uint256 startTime, uint256 endTime)',
  'event EpochSettled(uint256 indexed epochId, uint256 yield)',
  'event WithdrawRequested(address indexed user, uint256 indexed epochId, bool isSenior, uint256 shares)',
  'event EarlyWithdraw(address indexed user, bool isSenior, uint256 assets, uint256 penalty)',
  'event PenaltyDistributed(uint256 amount)'
];

export const MOCK_YIELD_STRATEGY_ABI = [
  'function asset() view returns (address)',
  'function yieldAsset() view returns (address)',
  'function totalDeposited() view returns (uint256)',
  'function totalYieldGenerated() view returns (uint256)',
  'function yieldRate() view returns (uint256)',
  'function lastHarvestTime() view returns (uint256)',
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function harvest() returns (uint256)',
  'function pendingYield() view returns (uint256)',
  'function setYieldRate(uint256 newRate)',
  'function setOwner(address newOwner)',
  'event Deposited(uint256 amount)',
  'event Withdrawn(uint256 amount)',
  'event YieldHarvested(uint256 amount)'
];

