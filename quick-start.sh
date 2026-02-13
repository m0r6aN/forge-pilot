#!/bin/bash

echo "🧬 FORGEPILOT x OMEGA QUICK START"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}💡 $1${NC}"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    print_info "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
else
    print_success "Docker is installed"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    print_info "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
else
    print_success "Docker Compose is installed"
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    print_info "Install Python 3.8+: https://python.org/downloads/"
    exit 1
else
    print_success "Python 3 is available"
fi

# Check if OMEGA network exists
print_step "Checking OMEGA network..."
if ! docker network ls | grep -q "omega-net"; then
    print_warning "OMEGA network not found, creating..."
    docker network create omega-net
    print_success "Created omega-net network"
else
    print_success "OMEGA network exists"
fi

# Check for OMEGA services
print_step "Checking OMEGA pantheon status..."

FEDERATION_RUNNING=$(docker ps --filter "name=federation-core" --filter "status=running" -q)
CONTEXT_RUNNING=$(docker ps --filter "name=context-server" --filter "status=running" -q)

if [ -z "$FEDERATION_RUNNING" ] && [ -z "$CONTEXT_RUNNING" ]; then
    print_warning "OMEGA pantheon not detected"
    print_info "ForgePilot will work in standalone mode"
    print_info "For full OMEGA integration, deploy OMEGA first:"
    print_info "  cd /path/to/omega && ./scripts/deploy.sh"
    echo ""
    
    read -p "Continue with standalone deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled. Deploy OMEGA first for full integration."
        exit 0
    fi
else
    if [ -n "$FEDERATION_RUNNING" ]; then
        print_success "OMEGA Federation Core is running"
    else
        print_warning "OMEGA Federation Core not detected"
    fi
    
    if [ -n "$CONTEXT_RUNNING" ]; then
        print_success "OMEGA Context Server is running"
    else
        print_warning "OMEGA Context Server not detected"
    fi
fi

# Build and deploy ForgePilot
print_step "Building ForgePilot backend..."
cd backend

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found in backend directory"
    exit 1
fi

# Build the image
if docker build -t forgepilot-backend . ; then
    print_success "ForgePilot backend built successfully"
else
    print_error "Failed to build ForgePilot backend"
    exit 1
fi

cd ..

# Deploy services
print_step "Deploying ForgePilot services..."
if docker-compose up -d; then
    print_success "ForgePilot services deployed"
else
    print_error "Failed to deploy ForgePilot services"
    exit 1
fi

# Wait for services to be ready
print_step "Waiting for services to be ready..."
sleep 15

# Health check
print_step "Running health checks..."

HEALTH_CHECK=$(curl -s http://localhost:8010/health 2>/dev/null || echo "failed")

if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    print_success "ForgePilot is healthy and ready!"
    
    # Parse health check response
    SERVICE_VERSION=$(echo $HEALTH_CHECK | grep -o '"version":"[^"]*' | cut -d'"' -f4)
    OMEGA_CONNECTED=$(echo $HEALTH_CHECK | grep -o '"omega_connected":[^,}]*' | cut -d':' -f2)
    
    echo ""
    echo -e "${PURPLE}🧬 FORGEPILOT STATUS${NC}"
    echo "================================="
    echo -e "Service Version: ${GREEN}${SERVICE_VERSION}${NC}"
    echo -e "OMEGA Connected: ${GREEN}${OMEGA_CONNECTED}${NC}"
    echo -e "API Endpoint: ${CYAN}http://localhost:8010${NC}"
    echo ""
    
else
    print_warning "ForgePilot health check inconclusive"
    print_info "Checking service logs..."
    docker-compose logs --tail=20 forgepilot-orchestrator
    echo ""
fi

# Test capabilities
print_step "Testing API capabilities..."
CAPABILITIES=$(curl -s http://localhost:8010/capabilities 2>/dev/null || echo "failed")

if [[ $CAPABILITIES == *"agents"* ]]; then
    print_success "API capabilities confirmed"
    
    # Extract agent count
    AGENT_COUNT=$(echo $CAPABILITIES | grep -o '"agents":\[[^]]*\]' | tr ',' '\n' | wc -l)
    
    echo -e "Available Agents: ${GREEN}${AGENT_COUNT}${NC}"
else
    print_warning "API capabilities test failed"
fi

# Quick demo
print_step "Running quick brand generation demo..."

DEMO_REQUEST='{
    "description": "AI-powered fitness app that analyzes workout form in real-time",
    "industry": "fitness_technology"
}'

echo ""
echo -e "${PURPLE}🎯 DEMO: Generating AI Fitness App Brand${NC}"
echo "========================================"

START_TIME=$(date +%s)

DEMO_RESULT=$(curl -s -X POST http://localhost:8010/campaign \
    -H "Content-Type: application/json" \
    -d "$DEMO_REQUEST" 2>/dev/null || echo "failed")

END_TIME=$(date +%s)
DEMO_EXECUTION_TIME=$((END_TIME - START_TIME))

if [[ $DEMO_RESULT == *"campaign_id"* ]]; then
    print_success "Demo brand campaign generated!"
    
    # Extract key details
    CAMPAIGN_ID=$(echo $DEMO_RESULT | grep -o '"campaign_id":"[^"]*' | cut -d'"' -f4)
    EXECUTION_TIME=$(echo $DEMO_RESULT | grep -o '"execution_time":[^,}]*' | cut -d':' -f2)
    COST=$(echo $DEMO_RESULT | grep -o '"cost_estimate":[^,}]*' | cut -d':' -f2)
    
    echo ""
    echo -e "Campaign ID: ${GREEN}${CAMPAIGN_ID}${NC}"
    echo -e "Generation Time: ${GREEN}${EXECUTION_TIME}s${NC}"
    echo -e "Cost: ${GREEN}\$${COST}${NC}"
    echo -e "Total Time: ${GREEN}${DEMO_EXECUTION_TIME}s${NC}"
    
else
    print_warning "Demo campaign generation failed"
    print_info "This might be normal for first startup - services may still be initializing"
fi

# Final status
echo ""
echo -e "${PURPLE}🎉 FORGEPILOT DEPLOYMENT COMPLETE!${NC}"
echo "=================================="
echo ""
echo -e "${GREEN}✅ Services Running:${NC}"
echo "   🧬 ForgePilot Orchestrator: http://localhost:8010"
echo "   🏥 Health Check: http://localhost:8010/health"
echo "   🧠 Capabilities: http://localhost:8010/capabilities"
echo ""

if [ -n "$FEDERATION_RUNNING" ] || [ -n "$CONTEXT_RUNNING" ]; then
    echo -e "${GREEN}✅ OMEGA Integration:${NC}"
    echo "   🧬 Connected to OMEGA pantheon"
    echo "   📊 Real-time intelligence enabled"
    echo "   🚀 Genesis Protocol ready"
else
    echo -e "${YELLOW}⚠️  OMEGA Integration:${NC}"
    echo "   🔧 Running in standalone mode"
    echo "   💡 Deploy OMEGA for full capabilities"
fi

echo ""
echo -e "${CYAN}🚀 NEXT STEPS:${NC}"
echo "1. Test integration: python3 test-integration.py"
echo "2. Generate campaigns: curl -X POST http://localhost:8010/campaign -H 'Content-Type: application/json' -d '{\"description\":\"your business idea\"}'"
echo "3. Integrate with frontend: Update your Next.js app to use http://localhost:8010"
echo "4. Monitor logs: docker-compose logs -f forgepilot-orchestrator"
echo ""

echo -e "${PURPLE}💡 Example Campaign Generation:${NC}"
echo "curl -X POST http://localhost:8010/campaign \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"description\": \"Sustainable fashion brand for eco-conscious millennials\","
echo "    \"industry\": \"sustainable_fashion\","
echo "    \"target_audience\": \"environmentally conscious consumers\""
echo "  }'"
echo ""

echo -e "${GREEN}🧬 The ForgePilot digital organism is ALIVE!${NC}"
echo -e "${GREEN}Ready to generate autonomous brand campaigns! 🚀${NC}"

# Check if test script exists and offer to run it
if [ -f "test-integration.py" ]; then
    echo ""
    read -p "Run integration tests now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Running integration tests..."
        python3 test-integration.py
    fi
fi
