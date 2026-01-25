#!/bin/bash
# Quick test runner for ForgePilot API
# This is the fucking way!

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "=============================================="
echo "  ForgePilot API Test Suite Runner"
echo "=============================================="
echo -e "${NC}"

# Check if federation_core is running
echo -e "${YELLOW}Checking federation_core health...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ federation_core is running${NC}"
else
    echo -e "${RED}✗ federation_core is not accessible${NC}"
    echo "Please start federation_core first:"
    echo "  docker-compose up -d federation_core"
    exit 1
fi

# Set environment variables
export FEDERATION_URL="${FEDERATION_URL:-http://localhost:3000}"
echo "Using FEDERATION_URL: $FEDERATION_URL"

# Parse command line arguments
TEST_TYPE="${1:-all}"

case $TEST_TYPE in
    all)
        echo -e "\n${YELLOW}Running all tests...${NC}"
        pytest -v
        ;;
    integration)
        echo -e "\n${YELLOW}Running integration tests...${NC}"
        pytest -m integration -v
        ;;
    genesis)
        echo -e "\n${YELLOW}Running Genesis Protocol tests...${NC}"
        pytest -m genesis -v
        ;;
    e2e)
        echo -e "\n${YELLOW}Running end-to-end tests...${NC}"
        pytest -m e2e -v
        ;;
    contracts)
        echo -e "\n${YELLOW}Running contract tests...${NC}"
        pytest -m contracts -v
        ;;
    success-metrics)
        echo -e "\n${YELLOW}Running Success Metric validation tests...${NC}"
        echo -e "${YELLOW}Testing Success Metric #2: Multi-Titan Collaboration${NC}"
        pytest -k test_multi_titan_collaboration -v
        echo -e "\n${YELLOW}Testing Success Metric #4: Genesis Protocol${NC}"
        pytest -k test_success_metric_4 -v
        ;;
    quick)
        echo -e "\n${YELLOW}Running quick smoke tests...${NC}"
        pytest tests/integration/test_federation_integration.py::TestLiveFederationIntegration::test_health_check_real -v
        ;;
    coverage)
        echo -e "\n${YELLOW}Running tests with coverage...${NC}"
        pytest --cov=app --cov-report=html --cov-report=term
        echo -e "\n${GREEN}Coverage report generated: htmlcov/index.html${NC}"
        ;;
    parallel)
        echo -e "\n${YELLOW}Running tests in parallel...${NC}"
        pytest -n auto -v
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Usage: ./run_tests.sh [all|integration|genesis|e2e|contracts|success-metrics|quick|coverage|parallel]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✓ Tests completed!${NC}"
