# 🎬 DOOR Protocol 데모 시나리오

Mantle 해커톤 데모 영상을 위한 상세 시나리오 가이드입니다.

---

## 📋 데모 기능 요약

| 순서 | 기능 | 설명 | 테스트 대상 |
|------|------|------|-------------|
| 1 | 지갑 연결 | MetaMask 연결 | Frontend |
| 2 | 네트워크 확인 | Mantle Sepolia 연결 | Frontend |
| 3 | USDC 획득 | 테스트 토큰 민팅 | Contract |
| 4 | Vault 통계 확인 | TVL, APY 조회 | Backend + Contract |
| 5 | Tranche 선택 | Senior/Junior 선택 UI | Frontend |
| 6 | Senior 예치 | 안정형 예치 | Contract (ERC4626) |
| 7 | Junior 예치 | 공격형 예치 | Contract (ERC4626) |
| 8 | 포트폴리오 조회 | 사용자 포지션 확인 | Backend + Frontend |
| 9 | 수익 수확 | Waterfall 분배 | Contract (CoreVault) |
| 10 | 수익 확인 | Senior/Junior 수익 비교 | Frontend |
| 11 | 출금 | 원금 + 수익 인출 | Contract (ERC4626) |
| 12 | Epoch 타이머 | 현재 Epoch 상태 | Frontend |

---

## 🎥 데모 영상 시나리오

### Scene 1: 소개 (30초)
**화면**: 랜딩 페이지

> "DOOR Protocol은 고정 수익과 레버리지 수익을 분리하는 
> DeFi 프로토콜입니다. Mantle 네트워크에서 안전하고 
> 효율적인 수익 창출이 가능합니다."

**보여줄 것**:
- 로고 및 브랜딩
- TVL, APY 요약 카드
- "Get Started" 버튼

---

### Scene 2: 지갑 연결 (20초)
**화면**: 헤더의 Connect Wallet 버튼

**액션**:
1. "Connect Wallet" 버튼 클릭
2. MetaMask 팝업에서 연결 승인
3. Mantle Sepolia 네트워크 전환 (필요시)

**보여줄 것**:
- RainbowKit 지갑 선택 모달
- 연결된 주소 표시
- 네트워크 뱃지 (Mantle)

---

### Scene 3: 대시보드 확인 (30초)
**화면**: Dashboard 페이지

**보여줄 것**:
- **TVL 카드**: 전체 예치 금액
- **Senior APY**: 5.5% (고정)
- **Junior APY**: 15-25% (변동)
- **Tranche 비율 게이지**: Senior/Junior 비율
- **Epoch 타이머**: 남은 시간

**설명**:
> "대시보드에서 현재 Vault 상태를 한눈에 확인할 수 있습니다.
> Senior는 안정적인 5.5% 고정 수익을, Junior는 
> 레버리지 효과로 더 높은 수익을 추구합니다."

---

### Scene 4: Tranche 선택 및 예치 (1분)
**화면**: Deposit 페이지

**액션 1 - Senior 예치**:
1. Senior Tranche 카드 선택
2. 금액 입력: 5,000 USDC
3. "Deposit Now" 클릭
4. MetaMask에서 2개 트랜잭션 승인
   - Approve USDC
   - Deposit

**설명**:
> "Senior Tranche는 안정형입니다. 고정 5.5% APY를 목표로 하며,
> Junior가 손실을 먼저 부담하므로 원금 보호 효과가 있습니다."

**액션 2 - Junior 예치**:
1. Junior Tranche 카드 선택
2. 금액 입력: 2,000 USDC
3. "Deposit Now" 클릭
4. MetaMask 승인

**설명**:
> "Junior Tranche는 공격형입니다. Senior에게 수익을 먼저 지급한 후
> 남은 모든 수익을 가져가므로 레버리지 효과를 얻습니다.
> 현재 Junior 비율이 28%이므로 약 3.5배 레버리지입니다."

---

### Scene 5: 포트폴리오 확인 (30초)
**화면**: Portfolio 페이지

**보여줄 것**:
- **Senior Position 카드**
  - 예치금: 5,000 USDC
  - 현재 APY: 5.5%
  - 누적 수익: $22.50 (예시)
  
- **Junior Position 카드**
  - 예치금: 2,000 USDC
  - 현재 APY: 17.8%
  - 누적 수익: $35.60 (예시)

- **총 가치**: $7,058.10

**설명**:
> "포트폴리오 페이지에서 내 예치 현황을 확인할 수 있습니다.
> Senior는 안정적인 수익을, Junior는 더 높은 수익을 보여줍니다."

---

### Scene 6: Waterfall 수익 분배 (45초)
**화면**: 백엔드 터미널 + 대시보드 (분할)

**액션**:
1. 백엔드에서 Harvest API 호출
2. 대시보드 새로고침
3. 변경된 수익 확인

**터미널 명령어**:
```bash
curl -X POST http://localhost:3001/api/admin/harvest
```

**보여줄 것**:
- 터미널: 트랜잭션 해시
- 대시보드: 업데이트된 수익

**설명**:
> "Harvest가 실행되면 Waterfall 구조로 수익이 분배됩니다.
> 1단계: Senior에게 고정 수익 지급
> 2단계: 남은 수익은 모두 Junior에게
> 이를 통해 Junior는 레버리지 효과를 얻습니다."

---

### Scene 7: 출금 (30초)
**화면**: Portfolio 페이지

**액션**:
1. Senior Position의 "Withdraw" 버튼 클릭
2. 출금 금액 입력
3. MetaMask 승인
4. 잔액 확인

**설명**:
> "출금 시 원금과 누적 수익을 함께 받게 됩니다.
> ERC-4626 표준을 사용하여 투명하고 안전한 출금이 가능합니다."

---

### Scene 8: 마무리 (20초)
**화면**: 랜딩 페이지 또는 대시보드

**요약**:
> "DOOR Protocol은 Mantle 네트워크의 장점을 활용하여
> - 낮은 수수료
> - 빠른 트랜잭션
> - 안전한 수익 구조
> 를 제공합니다. 
> 
> Senior로 안정적인 수익을, Junior로 높은 수익을 추구하세요.
> 감사합니다!"

---

## 🛠️ 기술 데모 포인트

### 1. Smart Contract Features
- **ERC-4626**: 표준화된 Vault 인터페이스
- **Waterfall Distribution**: 위계적 수익 분배
- **Dynamic Rate Adjustment**: 자동 금리 조정

### 2. Backend Features
- **Real-time Data**: 블록체인 데이터 실시간 조회
- **RESTful API**: 표준 REST API 제공
- **Rate Oracle**: 외부 금리 데이터 수집

### 3. Frontend Features
- **wagmi + viem**: 모던 Web3 스택
- **Responsive UI**: 반응형 디자인
- **RainbowKit**: 쉬운 지갑 연결

---

## 📊 데모용 수치 예시

### Vault 상태
| 항목 | 값 |
|------|-----|
| Total TVL | $100,000 |
| Senior TVL | $75,000 (75%) |
| Junior TVL | $25,000 (25%) |
| Senior APY | 5.5% |
| Junior APY | 17.5% |
| Current Epoch | #12 |

### 사용자 포지션
| 항목 | Senior | Junior |
|------|--------|--------|
| 원금 | $5,000 | $2,000 |
| 누적 수익 | $22.50 | $35.60 |
| APY | 5.5% | 17.8% |

---

## ⚠️ 데모 시 주의사항

1. **네트워크 확인**: Mantle Sepolia Testnet 연결 확인
2. **가스비**: 충분한 MNT 보유 확인
3. **테스트 토큰**: USDC 민팅 먼저 실행
4. **타이밍**: 트랜잭션 대기 시간 고려
5. **오류 처리**: 트랜잭션 실패 시 재시도

---

## 🎯 핵심 메시지

1. **안정성**: Senior Tranche로 예측 가능한 수익
2. **수익성**: Junior Tranche로 높은 수익 기회
3. **투명성**: 온체인 Waterfall 분배
4. **접근성**: 간편한 UI/UX

---

Built with ❤️ for Mantle Hackathon

