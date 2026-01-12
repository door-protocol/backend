#!/bin/bash

#######################################################
# DOOR Protocol Demo Scenario Script
# 
# 이 스크립트는 Mantle 해커톤 데모 영상을 위한
# 테스트 시나리오를 자동으로 실행합니다.
#
# 사용법: ./scripts/demo-scenario.sh
#######################################################

API_URL="${API_URL:-http://localhost:3001}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     🚪 DOOR Protocol Demo Scenario                   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  API Server: $API_URL"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "$API_URL$endpoint" | jq .
    else
        curl -s -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | jq .
    fi
}

pause() {
    echo -e "${YELLOW}Press Enter to continue to the next step...${NC}"
    read
}

#######################################################
# STEP 0: Health Check
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 0: Health Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Checking API server health..."
call_api GET "/api/health"
echo ""
pause

#######################################################
# STEP 1: Check Contract Addresses
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Check Contract Addresses${NC}"
echo -e "${BLUE}데모 기능: 배포된 스마트 컨트랙트 주소 확인${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching deployed contract addresses..."
call_api GET "/api/contracts"
echo ""
pause

#######################################################
# STEP 2: Check Initial Vault Stats
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Check Initial Vault Stats${NC}"
echo -e "${BLUE}데모 기능: Vault 초기 상태 확인 (TVL, APY 등)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching vault statistics..."
call_api GET "/api/vault/stats"
echo ""
echo "Fetching TVL breakdown..."
call_api GET "/api/vault/tvl"
echo ""
pause

#######################################################
# STEP 3: Check Epoch Status
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Check Epoch Status${NC}"
echo -e "${BLUE}데모 기능: 현재 Epoch 상태 및 남은 시간 확인${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching current epoch info..."
call_api GET "/api/epoch/current"
echo ""
pause

#######################################################
# STEP 4: Mint Test USDC
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Mint Test USDC${NC}"
echo -e "${BLUE}데모 기능: 테스트용 USDC 토큰 발행${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Minting 10,000 USDC to test wallet..."
# Replace with actual test address
call_api POST "/api/admin/mint" '{"address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "amount": "10000"}'
echo ""
pause

#######################################################
# STEP 5: Deposit to Senior Vault
#######################################################
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 5: Deposit to Senior Vault (안정형)${NC}"
echo -e "${GREEN}데모 기능: Senior Tranche 예치 (고정 수익률)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Depositing 5,000 USDC to Senior Vault..."
call_api POST "/api/admin/deposit/senior" '{"amount": "5000"}'
echo ""
pause

#######################################################
# STEP 6: Deposit to Junior Vault
#######################################################
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}STEP 6: Deposit to Junior Vault (공격형)${NC}"
echo -e "${YELLOW}데모 기능: Junior Tranche 예치 (레버리지 수익)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Depositing 2,000 USDC to Junior Vault..."
call_api POST "/api/admin/deposit/junior" '{"amount": "2000"}'
echo ""
pause

#######################################################
# STEP 7: Check Updated Vault Stats
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 7: Check Updated Vault Stats${NC}"
echo -e "${BLUE}데모 기능: 예치 후 변경된 Vault 상태 확인${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching updated vault statistics..."
call_api GET "/api/vault/stats"
echo ""
echo "Fetching updated TVL..."
call_api GET "/api/vault/tvl"
echo ""
pause

#######################################################
# STEP 8: Check User Position
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 8: Check User Position${NC}"
echo -e "${BLUE}데모 기능: 사용자 포트폴리오 조회${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching user position..."
call_api GET "/api/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""
pause

#######################################################
# STEP 9: Deploy to Strategy
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 9: Deploy to Strategy${NC}"
echo -e "${BLUE}데모 기능: 전략에 자금 배치 (수익 창출)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Deploying 5,000 USDC to yield strategy..."
call_api POST "/api/admin/deploy" '{"amount": "5000"}'
echo ""
pause

#######################################################
# STEP 10: Harvest Yield
#######################################################
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}STEP 10: Harvest Yield${NC}"
echo -e "${GREEN}데모 기능: 수익 수확 및 Waterfall 분배${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Harvesting yield from strategy..."
call_api POST "/api/admin/harvest" '{}'
echo ""
pause

#######################################################
# STEP 11: Check Updated User Position
#######################################################
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 11: Check Updated User Position${NC}"
echo -e "${BLUE}데모 기능: 수익 분배 후 포트폴리오 확인${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Fetching updated user position..."
call_api GET "/api/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""
pause

#######################################################
# STEP 12: Withdraw from Vault
#######################################################
echo -e "${RED}═══════════════════════════════════════════════════${NC}"
echo -e "${RED}STEP 12: Withdraw from Vault${NC}"
echo -e "${RED}데모 기능: Vault에서 출금 (원금 + 수익)${NC}"
echo -e "${RED}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Withdrawing 1,000 shares from Senior Vault..."
call_api POST "/api/admin/withdraw/senior" '{"shares": "1000"}'
echo ""
pause

#######################################################
# FINAL: Summary
#######################################################
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}DEMO COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Final vault stats:"
call_api GET "/api/vault/stats"
echo ""
echo "Final user position:"
call_api GET "/api/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 DOOR Protocol Demo Completed Successfully!       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"

