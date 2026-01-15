# 🚪 DOOR Protocol Backend

Mantle 해커톤 데모를 위한 DOOR Protocol 백엔드 API 서버입니다.

## 📋 목차

1. [사전 요구사항](#-사전-요구사항)
2. [프로젝트 구조](#-프로젝트-구조)
3. [로컬 실행 가이드 (Anvil)](#-로컬-실행-가이드-anvil)
4. [Mantle Testnet 배포 가이드](#-mantle-testnet-배포-가이드)
5. [API 문서](#-api-endpoints)
6. [테스트 시나리오](#-테스트-시나리오-데모-영상용)

---

## 📦 사전 요구사항

### 필수 설치 항목

| 도구 | 버전 | 설치 방법 |
|------|------|----------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Node.js와 함께 설치됨 |
| **Foundry** | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **Git** | 2.0+ | [git-scm.com](https://git-scm.com/) |

### Foundry 설치 확인

```bash
# Foundry 설치 확인
forge --version
cast --version
anvil --version
```

---

## 🏗️ 프로젝트 구조

```
door-protocol/
├── backend/          # 백엔드 API 서버 (이 폴더)
├── frontend/         # Next.js 프론트엔드
├── contract/         # Solidity 스마트 컨트랙트
└── md/              # 문서

backend/
├── src/
│   ├── index.ts              # Express 서버 엔트리
│   ├── api/                   # REST API 라우터
│   │   ├── vault.ts          # Vault 통계 API + 금리 히스토리
│   │   ├── user.ts           # 사용자 포지션 API
│   │   ├── epoch.ts          # Epoch 정보 API
│   │   └── admin.ts          # 관리자 API (데모용)
│   ├── services/
│   │   ├── blockchain.ts     # 블록체인 상호작용
│   │   ├── database.ts       # Prisma DB 서비스
│   │   └── abis.ts           # 컨트랙트 ABI
│   └── oracle/               # Rate Oracle 서비스
│       ├── index.ts          # Oracle 메인 (cron 스케줄러)
│       ├── collectors.ts     # 외부 API 금리 수집기
│       └── pusher.ts         # 온체인 푸시 (서킷 브레이커 포함)
├── prisma/
│   └── schema.prisma         # 데이터베이스 스키마
├── scripts/
│   ├── demo-scenario.sh      # 데모 시나리오 스크립트
│   └── deploy-and-setup.sh   # 배포 및 설정 스크립트
├── package.json
└── tsconfig.json
```

---

## 🖥️ 로컬 실행 가이드 (Anvil)

### 배포 순서

```
1. Anvil 실행 (로컬 블록체인)
2. 스마트 컨트랙트 배포
3. Backend 환경변수 설정
4. Backend 서버 실행
5. (선택) Frontend 실행
```

### Step 1: Anvil 실행 (로컬 블록체인)

새 터미널을 열고 다음을 실행합니다:

```bash
# contract 폴더로 이동
cd /path/to/door-protocol/contract

# Anvil 실행 (Chain ID: 31337)
anvil --chain-id 31337
```

**예상 출력:**
```
                             _   _
                            (_) | |
      __ _   _ __   __   __  _  | |
     / _` | | '_ \  \ \ / / | | | |
    | (_| | | | | |  \ V /  | | | |
     \__,_| |_| |_|   \_/   |_| |_|

Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...

Listening on 127.0.0.1:8545
```

> ⚠️ **중요**: Anvil 터미널은 계속 열어두세요!

### Step 2: 스마트 컨트랙트 배포

**새 터미널**을 열고 다음을 실행합니다:

```bash
# contract 폴더로 이동
cd /path/to/door-protocol/contract

# Private Key 환경변수 설정 (Anvil 기본 키)
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 컨트랙트 배포
forge script script/DeployMantle.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

**예상 출력:**
```
=== TerraBond Mantle Sepolia Deployment ===
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

=== Tokens Deployed ===
MockUSDC: 0x5FbDB2315678afecb367f032d93F642f64180aa3
MockMETH: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

=== Vaults Deployed ===
SeniorVault (tb-FIX): 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
JuniorVault (tb-BOOST): 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

=== Core Deployed ===
CoreVault: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

=== Management Deployed ===
EpochManager: 0x0165878A594ca255338adfa4d48449f69242Eb8F
SafetyModule: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853

DEPLOYMENT COMPLETE
```

> 📝 **출력된 컨트랙트 주소를 복사해두세요!**

### Step 3: Backend 환경변수 설정

backend 폴더에 `.env` 파일을 생성합니다:

```bash
cd /path/to/door-protocol/backend

# .env 파일 생성
cat > .env << 'EOF'
# DOOR Protocol Backend Configuration
PORT=3001

# Blockchain Configuration (Anvil Local)
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (Step 2에서 배포된 주소로 교체)
USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SENIOR_VAULT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
JUNIOR_VAULT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
CORE_VAULT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
EPOCH_MANAGER_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
SAFETY_MODULE_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
EOF
```

> ⚠️ **중요**: 주소가 다르면 Step 2에서 출력된 주소로 교체하세요!

### Step 4: Backend 서버 실행

```bash
# backend 폴더로 이동
cd /path/to/door-protocol/backend

# 의존성 설치 (최초 1회)
npm install

# 서버 실행
npm run dev
```

**예상 출력:**
```
  ╔═══════════════════════════════════════════════╗
  ║     🚪 DOOR Protocol Backend API Server       ║
  ╠═══════════════════════════════════════════════╣
  ║  Port: 3001                                   ║
  ║  Network: http://127.0.0.1:8545              ║
  ╚═══════════════════════════════════════════════╝
```

### Step 5: 동작 확인

새 터미널에서 API를 테스트합니다:

```bash
# 헬스 체크
curl http://localhost:3001/api/health
# 출력: {"status":"ok","timestamp":"...","network":"http://127.0.0.1:8545"}

# 컨트랙트 주소 확인
curl http://localhost:3001/api/contracts

# Vault 통계 확인
curl http://localhost:3001/api/vault/stats
```

### Step 6: 예치 테스트 (cast 사용)

```bash
# Senior Vault에 5,000 USDC 예치

# 1. USDC Approve
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  'approve(address,uint256)' \
  0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 \
  5000000000 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545

# 2. Deposit
cast send 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 \
  'deposit(uint256,address)' \
  5000000000 \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545

# 3. TVL 확인
curl http://localhost:3001/api/vault/tvl
# 출력: {"seniorTVL":"5000.0","juniorTVL":"0.0","totalTVL":"5000.0"}
```

---

## 🌐 Mantle Testnet 배포 가이드

### 배포 순서

```
1. Mantle Sepolia 테스트넷 MNT 획득
2. 스마트 컨트랙트 배포
3. Backend 환경변수 설정
4. Backend 서버 실행
5. Frontend 환경변수 설정
```

### Step 1: Mantle Sepolia 테스트넷 MNT 획득

1. [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/) 접속
2. 지갑 주소 입력 후 MNT 요청
3. 약 1 MNT 정도 필요 (가스비용)

### Step 2: 스마트 컨트랙트 배포

```bash
# contract 폴더로 이동
cd /path/to/door-protocol/contract

# 실제 Private Key 설정 (⚠️ 절대 공개하지 마세요!)
export PRIVATE_KEY=<your_real_private_key>

# Mantle Sepolia에 배포
forge script script/DeployMantle.sol \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --broadcast \
  --verify
```

**예상 출력:**
```
=== TerraBond Mantle Sepolia Deployment ===
Deployer: 0x<your_address>
Chain ID: 5003 (Mantle Sepolia)

=== Tokens Deployed ===
MockUSDC: 0x...
...

DEPLOYMENT COMPLETE - MANTLE SEPOLIA

Explorer: https://explorer.sepolia.mantle.xyz
```

> 📝 배포된 주소를 모두 기록해두세요!

### Step 3: Backend 환경변수 설정

```bash
cd /path/to/door-protocol/backend

cat > .env << 'EOF'
# DOOR Protocol Backend Configuration
PORT=3001

# Blockchain Configuration (Mantle Sepolia Testnet)
RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=<your_real_private_key>

# Contract Addresses (Step 2에서 배포된 실제 주소)
USDC_ADDRESS=<deployed_usdc_address>
SENIOR_VAULT_ADDRESS=<deployed_senior_vault_address>
JUNIOR_VAULT_ADDRESS=<deployed_junior_vault_address>
CORE_VAULT_ADDRESS=<deployed_core_vault_address>
EPOCH_MANAGER_ADDRESS=<deployed_epoch_manager_address>
SAFETY_MODULE_ADDRESS=<deployed_safety_module_address>
EOF
```

### Step 4: Backend 서버 실행

```bash
cd /path/to/door-protocol/backend
npm run dev
```

### Step 5: Frontend 주소 업데이트

`frontend/src/lib/contracts/addresses.ts` 파일을 수정합니다:

```typescript
// Core Contract Addresses (Mantle Sepolia)
export const CORE_VAULT_ADDRESS = '<deployed_core_vault_address>' as const;
export const SENIOR_TRANCHE_ADDRESS = '<deployed_senior_vault_address>' as const;
export const JUNIOR_TRANCHE_ADDRESS = '<deployed_junior_vault_address>' as const;
export const EPOCH_MANAGER_ADDRESS = '<deployed_epoch_manager_address>' as const;
export const SAFETY_MODULE_ADDRESS = '<deployed_safety_module_address>' as const;

// Token Addresses
export const USDC_ADDRESS = '<deployed_usdc_address>' as const;
```

### Step 6: Frontend 실행

```bash
cd /path/to/door-protocol/frontend
npm install
npm run dev
```

---

## 📡 API Endpoints

### Health Check
| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/health` | GET | 서버 상태 확인 |
| `/api/contracts` | GET | 배포된 컨트랙트 주소 |

### Vault
| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/vault/stats` | GET | Vault 통계 (TVL, APY, 비율) |
| `/api/vault/tvl` | GET | Total Value Locked |
| `/api/vault/apy` | GET | 현재 APY 정보 |
| `/api/vault/rates/history` | GET | 금리 히스토리 (`?period=7d\|30d\|90d\|1y`) |
| `/api/vault/rates/latest` | GET | 최신 DOR 업데이트 (소스별 상세) |
| `/api/vault/rates/source/:id` | GET | 특정 소스 금리 히스토리 (`?days=30`) |

### User
| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/user/:address` | GET | 사용자 포지션 조회 |
| `/api/user/:address/balance/:token` | GET | 토큰 잔액 조회 |

### Epoch
| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/epoch/current` | GET | 현재 Epoch 정보 |
| `/api/epoch/status` | GET | Epoch 상태 (간략) |

### Admin (데모용)
| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/admin/mint` | POST | 테스트 USDC 발행 |
| `/api/admin/deposit/senior` | POST | Senior 예치 |
| `/api/admin/deposit/junior` | POST | Junior 예치 |
| `/api/admin/withdraw/senior` | POST | Senior 출금 |
| `/api/admin/withdraw/junior` | POST | Junior 출금 |
| `/api/admin/harvest` | POST | 수익 수확 |
| `/api/admin/deploy` | POST | 전략에 자금 배치 |
| `/api/admin/processEpoch` | POST | Epoch 처리 |

---

## 🧪 테스트 시나리오 (데모 영상용)

### 시나리오 1: 기본 예치/출금 흐름

| 순서 | 액션 | API/명령어 |
|------|------|-----------|
| 1 | 지갑 연결 | Frontend MetaMask |
| 2 | USDC 민팅 | `POST /api/admin/mint` |
| 3 | Vault 통계 확인 | `GET /api/vault/stats` |
| 4 | Senior 예치 | `cast send` 또는 Frontend |
| 5 | Junior 예치 | `cast send` 또는 Frontend |
| 6 | TVL 확인 | `GET /api/vault/tvl` |
| 7 | 포지션 확인 | `GET /api/user/:address` |
| 8 | 출금 | `cast send` 또는 Frontend |

### 시나리오 2: Waterfall 분배 데모

1. Senior 5,000 USDC, Junior 2,000 USDC 예치
2. 전략에 자금 배치 (`POST /api/admin/deploy`)
3. Harvest 실행 (`POST /api/admin/harvest`)
4. Senior: 고정 5% 수익 확인
5. Junior: 잔여 수익 (레버리지 효과) 확인

### 테스트 API 호출 예시

```bash
# 1. 테스트 토큰 발행
curl -X POST http://localhost:3001/api/admin/mint \
  -H "Content-Type: application/json" \
  -d '{"address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "amount": "10000"}'

# 2. Vault 통계 조회
curl http://localhost:3001/api/vault/stats

# 3. 사용자 포지션 조회
curl http://localhost:3001/api/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# 4. 수익 수확
curl -X POST http://localhost:3001/api/admin/harvest
```

---

## 🔧 문제 해결

### Anvil 연결 오류
```
Error: Connection refused
```
→ Anvil이 실행 중인지 확인하세요: `lsof -i:8545`

### Nonce 오류
```
Error: nonce has already been used
```
→ Anvil을 재시작하고 컨트랙트를 다시 배포하세요.

### 컨트랙트 주소 불일치
→ `.env` 파일의 주소가 배포된 주소와 일치하는지 확인하세요.

### 가스비 부족 (Testnet)
→ [Mantle Faucet](https://faucet.sepolia.mantle.xyz/)에서 MNT를 추가로 받으세요.

---

## 🔧 환경 변수

`.env` 파일에 설정 가능한 환경 변수:

```bash
# Network
RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=0x...

# Contract Addresses
CORE_VAULT_ADDRESS=0x...
SENIOR_VAULT_ADDRESS=0x...
JUNIOR_VAULT_ADDRESS=0x...
EPOCH_MANAGER_ADDRESS=0x...
SAFETY_MODULE_ADDRESS=0x...
USDC_ADDRESS=0x...
ORACLE_ADDRESS=0x...

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@localhost:5432/door_protocol
USE_DATABASE=true

# Oracle
CRON_SCHEDULE=0 */6 * * *  # 매 6시간마다
USE_SIGNATURE=false

# Server
PORT=3001
NODE_ENV=development
```

---

## 🗄️ 데이터베이스 설정 (선택)

금리 히스토리를 영구 저장하려면 PostgreSQL을 설정하세요:

```bash
# 1. Prisma 클라이언트 생성
npm run db:generate

# 2. 데이터베이스 스키마 적용
npm run db:push

# 3. (선택) Prisma Studio로 데이터 확인
npm run db:studio
```

---

## ⏰ Oracle 서비스

DOR(Decentralized Offered Rate)를 수집하고 온체인에 푸시하는 서비스:

```bash
# 한 번 실행 (수집 + 푸시)
npm run oracle

# 드라이런 (트랜잭션 없이 테스트)
npm run oracle:dry

# 크론 모드 (6시간마다 자동 실행)
npm run oracle -- --cron
```

### 수집 소스
- **TESR**: Treehouse Ethereum Staking Rate (20%)
- **mETH**: Mantle LST APY (30%)
- **SOFR**: NY Fed Secured Overnight Financing Rate (25%)
- **Aave USDT**: Aave V3 USDT 공급 금리 (15%)
- **Ondo USDY**: Ondo Finance USDY 수익률 (10%)

---

## 📝 참고사항

- 이 백엔드는 **데모 목적**으로 설계되었습니다
- 프로덕션 사용 시 **인증/권한 시스템** 추가 필요
- Admin API는 데모 시연용이며 실제로는 스마트 컨트랙트로 직접 호출
- USDC 단위는 6 decimals (1 USDC = 1,000,000)
- 데이터베이스 없이도 동작 (mock 데이터 폴백)

---

## 🔗 관련 링크

- [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz/)
- [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
- [Foundry Book](https://book.getfoundry.sh/)

---

Built with ❤️ for Mantle Hackathon
