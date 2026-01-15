# 🚪 DOOR Protocol Backend

Backend API server for DOOR Protocol, built for the Mantle Hackathon demo.

## 📦 Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Foundry** | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── index.ts          # Express server entry
│   ├── api/              # REST API routers (vault, user, epoch, admin)
│   ├── services/         # Blockchain & database services
│   └── oracle/           # Rate Oracle service (collectors, pusher)
├── scripts/              # Demo & deployment scripts
├── render.yaml           # Render deployment config
└── package.json
```

---

## 🖥️ Quick Start (Local with Anvil)

### 1. Start Anvil

```bash
cd /path/to/door-protocol/contract
anvil --chain-id 31337
```

### 2. Deploy Contracts

```bash
cd /path/to/door-protocol/contract
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/DeployMantle.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 3. Configure & Run Backend

```bash
cd /path/to/door-protocol/backend

# Create .env with deployed contract addresses
cat > .env << 'EOF'
PORT=3001
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SENIOR_VAULT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
JUNIOR_VAULT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
CORE_VAULT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
EPOCH_MANAGER_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
SAFETY_MODULE_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
EOF

yarn install && yarn dev
```

### 4. Verify

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/vault/stats
```

---

## 🌐 Mantle Testnet Deployment

1. Get MNT from [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
2. Deploy contracts:
   ```bash
   export PRIVATE_KEY=<your_private_key>
   forge script script/DeployMantle.sol --rpc-url https://rpc.sepolia.mantle.xyz --broadcast --verify
   ```
3. Update `.env` with `RPC_URL=https://rpc.sepolia.mantle.xyz` and deployed addresses
4. Run: `yarn dev`

---

## 📡 API Endpoints

### Health & Info
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status |
| `/api/contracts` | GET | Contract addresses |

### Vault
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vault/stats` | GET | TVL, APY, ratios |
| `/api/vault/tvl` | GET | Total Value Locked |
| `/api/vault/apy` | GET | Current APY |
| `/api/vault/rates/history` | GET | Rate history (`?period=7d\|30d\|90d\|1y`) |
| `/api/vault/rates/latest` | GET | Latest DOR update |

### User
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/:address` | GET | User position |
| `/api/user/:address/balance/:token` | GET | Token balance |

### Epoch
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/epoch/current` | GET | Current epoch info |
| `/api/epoch/status` | GET | Epoch phase & time remaining |

### Admin (Demo)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/mint` | POST | Mint test USDC |
| `/api/admin/deposit/senior` | POST | Senior deposit |
| `/api/admin/deposit/junior` | POST | Junior deposit |
| `/api/admin/withdraw/senior` | POST | Senior withdrawal |
| `/api/admin/withdraw/junior` | POST | Junior withdrawal |
| `/api/admin/harvest` | POST | Harvest yield |
| `/api/admin/deploy` | POST | Deploy to strategy |
| `/api/admin/processEpoch` | POST | Process epoch |

---

## 📜 Scripts

```bash
yarn dev          # Development server
yarn build        # Build for production
yarn start        # Production server
yarn oracle       # Run oracle (collect + push)
yarn oracle:dry   # Oracle dry run
```

---

## ⏰ Oracle Service

Collects DOR (Decentralized Offered Rate) from multiple sources and pushes on-chain.

| Source | Weight |
|--------|--------|
| TESR (Treehouse ETH Staking) | 20% |
| mETH (Mantle LST) | 30% |
| SOFR (NY Fed) | 25% |
| Aave USDT | 15% |
| Ondo USDY | 10% |

```bash
yarn oracle           # Run once
yarn oracle:dry       # Dry run
yarn oracle -- --cron # Cron mode (every 6h)
```

---

## 🔧 Environment Variables

```bash
PORT=3001
RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=0x...

# Contract Addresses
CORE_VAULT_ADDRESS=0x...
SENIOR_VAULT_ADDRESS=0x...
JUNIOR_VAULT_ADDRESS=0x...
EPOCH_MANAGER_ADDRESS=0x...
SAFETY_MODULE_ADDRESS=0x...
USDC_ADDRESS=0x...

# Oracle (Optional)
ORACLE_ADDRESS=0x...
CRON_SCHEDULE=0 */6 * * *
```

---

## 🔗 Links

- [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz/)
- [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
- [Foundry Book](https://book.getfoundry.sh/)
